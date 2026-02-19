'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { LeadershipTree, LeadershipTreeNode } from '@/components/admin/LeadershipTree'
import { CreatableCombobox } from '@/components/admin/CreatableCombobox'
import { useRBAC } from '@/lib/hooks/useRBAC'
import { adminFetchJson } from '@/lib/admin-client'
import { Loader2 } from 'lucide-react'

export default function LeadershipPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isAdmin } = useRBAC()

    const [loading, setLoading] = useState(true)
    const [treeData, setTreeData] = useState<LeadershipTreeNode[]>([])
    const rootPersonIdParam = searchParams?.get('rootPersonId')

    const [selectedRootId, setSelectedRootId] = useState(rootPersonIdParam || '')
    const [selectedRootLabel, setSelectedRootLabel] = useState('')

    useEffect(() => {
        if (rootPersonIdParam) {
            setSelectedRootId(rootPersonIdParam)
        }
    }, [rootPersonIdParam])

    useEffect(() => {
        const fetchTree = async () => {
            // If admin and no root selected, don't fetch (unless we want to handle 400 or default)
            // But if NOT admin, we fetch anyway because API forces the user's ID
            // We don't know if user is admin yet inside this effect strictly from 'isAdmin' which might be loading?
            // userRBAC has 'loading' state.

            setLoading(true)
            try {
                const data = await adminFetchJson<{ rootPersonId: string; tree: LeadershipTreeNode[] }>(
                    `/api/admin/people/leadership-tree?rootPersonId=${encodeURIComponent(selectedRootId)}`
                )
                setTreeData(data.tree || [])

                // Update label if we found the root node in the tree
                if (data.tree && data.tree.length > 0) {
                    // The root node is usually the first one or level 1
                    const rootNode = data.tree.find((n: LeadershipTreeNode) => n.id === data.rootPersonId)
                    if (rootNode) setSelectedRootLabel(rootNode.full_name)
                }
            } catch (error) {
                console.error(error)
                setTreeData([])
            } finally {
                setLoading(false)
            }
        }

        // Debounce or just run?
        fetchTree()
    }, [selectedRootId])

    const handleRootChange = (id: string | undefined, text: string, label?: string) => {
        if (id) {
            router.push(`/admin/cadastros/lideranca?rootPersonId=${id}`)
            setSelectedRootLabel(label || text)
        } else {
            router.push(`/admin/cadastros/lideranca`)
            setSelectedRootLabel('')
        }
    }

    return (
        <PageAccessGuard pageKey="pessoas">
            <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Estrutura de Liderança</h1>
                        <p className="text-slate-500">Visualize a árvore de discipulado e acompanhamento.</p>
                    </div>

                    {isAdmin && (
                        <div className="w-full md:w-96">
                            <CreatableCombobox
                                fetchItems={async (q) => {
                                    try {
                                        const params = new URLSearchParams()
                                        if (q && q.trim()) params.set('q', q.trim())
                                        const data = await adminFetchJson<{ items: Array<{ id: string; full_name: string; label: string }> }>(
                                            `/api/admin/consolidacao/lookups/people${params.toString() ? `?${params.toString()}` : ''}`
                                        )
                                        const items = Array.isArray(data.items) ? data.items : []
                                        return { items: items.map((p) => ({ id: p.id, label: p.full_name ?? p.label ?? '' })) }
                                    } catch {
                                        return { items: [] }
                                    }
                                }}
                                placeholder="Buscar líder raiz..."
                                selectedId={selectedRootId}
                                selectedLabel={selectedRootLabel}
                                onChange={handleRootChange}
                            />
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 text-[#c62737] animate-spin" />
                        </div>
                    ) : (
                        isAdmin && !selectedRootId && treeData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <p>Selecione uma pessoa acima para visualizar a estrutura.</p>
                            </div>
                        ) : (
                            <LeadershipTree data={treeData} />
                        )
                    )}
                </div>
            </div>
        </PageAccessGuard>
    )
}
