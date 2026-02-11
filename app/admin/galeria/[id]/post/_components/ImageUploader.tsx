'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion } from 'framer-motion'

type ImageUploaderProps = {
  onDrop: (acceptedFiles: File[]) => void
  maxFiles?: number
  disabled?: boolean
}

export function ImageUploader({ onDrop, maxFiles = 20, disabled = false }: ImageUploaderProps) {
  const handleDrop = useCallback(
    (acceptedFiles: File[]) => {
      onDrop(acceptedFiles)
    },
    [onDrop]
  )

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop: handleDrop,
    multiple: true,
    maxFiles,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    },
    disabled,
  })

  const getBorderColor = () => {
    if (isDragReject) return 'border-red-500 bg-red-50'
    if (isDragAccept) return 'border-green-500 bg-green-50'
    if (isDragActive) return 'border-blue-500 bg-blue-50'
    return 'border-slate-300 hover:border-slate-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${getBorderColor()} ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-4xl"
          >
            {isDragReject ? '❌' : isDragAccept ? '✅' : '📸'}
          </motion.div>

          {isDragActive ? (
            <p className="text-lg font-medium text-slate-700">
              {isDragReject ? 'Apenas imagens são aceitas' : 'Solte as imagens aqui'}
            </p>
          ) : (
            <>
              <p className="text-lg font-medium text-slate-900">
                Arraste suas imagens aqui ou clique para selecionar
              </p>
              <p className="text-sm text-slate-600">
                Suporta JPG, PNG, GIF e WEBP • Máximo de {maxFiles} imagens
              </p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
