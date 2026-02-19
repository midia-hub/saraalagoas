'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2, User, X, Check, RotateCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { motion, AnimatePresence } from 'framer-motion'

interface AvatarUploadProps {
    currentUrl?: string | null
    onUpload: (url: string) => Promise<void>
    userId: string
}

export function AvatarUpload({ currentUrl, onUpload, userId }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null)
    const [showCropper, setShowCropper] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const cropperRef = useRef<Cropper | null>(null)

    // Limpa o cropper ao fechar
    useEffect(() => {
        if (!showCropper && cropperRef.current) {
            cropperRef.current.destroy()
            cropperRef.current = null
        }
    }, [showCropper])

    // Inicializa o cropper quando a imagem carrega no modal
    useEffect(() => {
        if (showCropper && tempImage && imageRef.current) {
            cropperRef.current = new Cropper(imageRef.current, {
                aspectRatio: 1,
                viewMode: 1,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                background: false
            })
        }
    }, [showCropper, tempImage])

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 2 * 1024 * 1024) {
            alert('A imagem original deve ter no máximo 2MB.')
            return
        }

        const reader = new FileReader()
        reader.onload = () => {
            setTempImage(reader.result as string)
            setShowCropper(true)
        }
        reader.readAsDataURL(file)
    }

    async function handleConfirmCrop() {
        if (!cropperRef.current || !supabase) return

        try {
            setUploading(true)
            setShowCropper(false)

            const canvas = cropperRef.current.getCroppedCanvas({
                width: 400,
                height: 400,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            })

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
            )

            if (!blob) throw new Error('Falha ao gerar imagem cortada')

            const formData = new FormData()
            formData.append('file', blob, 'avatar.jpg')
            formData.append('userId', userId)

            const { data: { session } } = await supabase.auth.getSession()
            const response = await fetch('/api/admin/storage/upload-avatar', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${session?.access_token || ''}`
                }
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Erro no upload')

            await onUpload(result.publicUrl)
        } catch (error: any) {
            console.error('Erro no upload:', error)
            alert(error.message || 'Erro ao carregar imagem.')
        } finally {
            setUploading(false)
            setTempImage(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center transition-all duration-300 group-hover:shadow-2xl">
                    {currentUrl ? (
                        <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <User size={48} className="text-slate-300" />
                    )}
                    {uploading && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                    )}
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 p-3 bg-red-600 text-white rounded-2xl shadow-lg hover:bg-red-700 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                    title="Alterar foto"
                >
                    <Camera size={20} />
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
            />
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-60">Toque no ícone para alterar</p>

            <AnimatePresence>
                {showCropper && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCropper(false)}
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Ajustar foto</h3>
                                    <p className="text-sm text-slate-500">Arraste e redimensione para centralizar</p>
                                </div>
                                <button
                                    onClick={() => setShowCropper(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="bg-slate-900 aspect-square w-full relative">
                                {tempImage && (
                                    <img
                                        ref={imageRef}
                                        src={tempImage}
                                        alt="Crop preview"
                                        className="block max-w-full"
                                    />
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 flex items-center justify-between gap-4">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => cropperRef.current?.rotate(-90)}
                                        className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                                        title="Girar esquerda"
                                    >
                                        <RotateCw size={20} className="scale-x-[-1]" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => cropperRef.current?.rotate(90)}
                                        className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                                        title="Girar direita"
                                    >
                                        <RotateCw size={20} />
                                    </button>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCropper(false)}
                                        className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleConfirmCrop}
                                        className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <Check size={20} />
                                        Salvar Foto
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
