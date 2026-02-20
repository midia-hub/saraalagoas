'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, User, Users, ExternalLink } from 'lucide-react'
import Link from 'next/link'

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ')
}


export type LeadershipTreeNode = {
    id: string
    full_name: string
    leader_person_id: string | null
    level: number
    spouse_id?: string | null
    spouse_name?: string | null
}

type NestedNode = LeadershipTreeNode & {
    children: NestedNode[]
    totalDescendants: number
    directDescendants: number
}

function buildTree(flatNodes: LeadershipTreeNode[]): NestedNode[] {
    const nodeMap = new Map<string, NestedNode>()

    // 1. Initialize all nodes
    flatNodes.forEach(node => {
        nodeMap.set(node.id, {
            ...node,
            children: [],
            totalDescendants: 0,
            directDescendants: 0
        })
    })

    const roots: NestedNode[] = []

    // 2. Build hierarchy
    flatNodes.forEach(node => {
        const current = nodeMap.get(node.id)!
        
        // Se este nó é um cônjuge que já foi "anexado" a outro nó principal, não o mostramos como raiz ou filho separado
        // Apenas se o cônjuge estiver presente na árvore como um nó principal em outro lugar
        const mainNodeOfThisSpouse = flatNodes.find(n => n.spouse_id === node.id && n.id !== node.id)
        if (mainNodeOfThisSpouse) {
            // Se o cônjuge (mainNodeOfThisSpouse) tem o mesmo líder que este nó, ou se este nó não tem líder,
            // então este nó é redundante e deve ser omitido para mostrar apenas o casal.
            if (!node.leader_person_id || node.leader_person_id === mainNodeOfThisSpouse.leader_person_id) {
                return
            }
        }

        if (node.leader_person_id && nodeMap.has(node.leader_person_id)) {
            const parent = nodeMap.get(node.leader_person_id)!
            parent.children.push(current)
            parent.directDescendants++
        } else {
            // If leader is not in the list (e.g. root of the query), it acts as a root here
            roots.push(current)
        }
    })

    // 3. Calculate totals (post-order traversal)
    const calculateTotals = (node: NestedNode): number => {
        let sum = 0
        for (const child of node.children) {
            sum += 1 + calculateTotals(child)
        }
        node.totalDescendants = sum
        return sum
    }

    roots.forEach(root => calculateTotals(root))

    return roots
}

function TreeNode({ node, defaultOpen = true }: { node: NestedNode; defaultOpen?: boolean }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const hasChildren = node.children.length > 0

    return (
        <div className="ml-4">
            <div
                className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border border-transparent transition-all duration-200",
                    "hover:bg-slate-50 hover:border-slate-200",
                    node.level === 1 ? "bg-slate-50 border-slate-200 shadow-sm mb-2" : ""
                )}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    disabled={!hasChildren}
                    className={cn(
                        "p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors",
                        !hasChildren && "opacity-0 cursor-default"
                    )}
                >
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <div className="w-8 h-8 rounded-full bg-[#c62737]/10 flex items-center justify-center text-[#c62737]">
                    {node.level === 1 ? <Users size={16} /> : <User size={16} />}
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <Link 
                            href={`/admin/pessoas/${node.id}`}
                            className="font-semibold text-slate-800 hover:text-[#c62737] transition-colors"
                        >
                            {node.full_name}
                        </Link>
                        {node.spouse_name && (
                            <>
                                <span className="text-slate-400 font-normal">&</span>
                                <Link 
                                    href={`/admin/pessoas/${node.spouse_id}`}
                                    className="font-semibold text-slate-800 hover:text-[#c62737] transition-colors"
                                >
                                    {node.spouse_name}
                                </Link>
                            </>
                        )}
                        {node.level === 1 && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#c62737] bg-[#c62737]/10 px-2 py-0.5 rounded-full">
                                Líder Raiz
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>
                            <strong className="text-slate-700">{node.directDescendants}</strong> liderados diretos
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span>
                            <strong className="text-slate-700">{node.totalDescendants}</strong> na rede completa
                        </span>
                        {node.totalDescendants > 0 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <button
                                    onClick={() => setIsOpen(!isOpen)}
                                    className="text-[#c62737] hover:underline flex items-center gap-1 font-medium"
                                >
                                    {isOpen ? 'Ocultar discípulos' : 'Ver discípulos'}
                                </button>
                            </>
                        )}
                        {node.totalDescendants > 0 && node.level > 1 && (
                            <>
                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                <Link
                                    href={`/admin/lideranca/estrutura?rootPersonId=${node.id}`}
                                    className="text-slate-500 hover:text-[#c62737] hover:underline flex items-center gap-1 font-medium"
                                    title="Focar nesta rede"
                                >
                                    Focar rede <ExternalLink size={12} />
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {hasChildren && isOpen && (
                <div className="ml-4 border-l border-slate-200 pl-4 py-2 space-y-1">
                    {node.children.map(child => (
                        <TreeNode key={child.id} node={child} defaultOpen={false} />
                    ))}
                </div>
            )}
        </div>
    )
}

export function LeadershipTree({ data }: { data: LeadershipTreeNode[] }) {
    const roots = useMemo(() => buildTree(data), [data])

    if (data.length === 0) {
        return (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Nenhuma estrutura de liderança encontrada.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {roots.map(root => (
                <TreeNode key={root.id} node={root} />
            ))}
        </div>
    )
}
