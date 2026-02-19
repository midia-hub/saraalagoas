import type { AccessSnapshot } from '@/lib/rbac-types'
import { supabaseServer } from '@/lib/supabase-server'

export type LeadershipTreeNode = {
  id: string
  full_name: string
  leader_person_id: string | null
  level: number
  spouse_id?: string | null
  spouse_name?: string | null
}

export async function getLeadershipTree(rootId: string): Promise<LeadershipTreeNode[]> {
  // 1. Busca a árvore da pessoa raiz
  const { data, error } = await supabaseServer.rpc('get_leadership_tree', { root_id: rootId })
  if (error) {
    throw new Error(error.message || 'Erro ao carregar estrutura de liderança.')
  }
  const tree = (data || []) as LeadershipTreeNode[]

  // 2. Busca dados da pessoa raiz para ver se tem cônjuge
  const { data: rootPerson } = await supabaseServer
    .from('people')
    .select('id, full_name, spouse_person_id, spouse:people!spouse_person_id(id, full_name)')
    .eq('id', rootId)
    .maybeSingle()

  const spouseId = rootPerson?.spouse_person_id
  const spouseName = (rootPerson?.spouse as any)?.full_name

  // 3. Se a raiz tem cônjuge, marca na raiz
  if (tree.length > 0 && tree[0].id === rootId) {
    tree[0].spouse_id = spouseId
    tree[0].spouse_name = spouseName
  }

  // 4. Se tem cônjuge, busca a árvore dele também
  let combinedTree = [...tree]
  if (spouseId) {
    const { data: spouseTree, error: spouseError } = await supabaseServer.rpc('get_leadership_tree', {
      root_id: spouseId,
    })
    if (!spouseError && spouseTree?.length) {
      const spouseTreeNodes = spouseTree as LeadershipTreeNode[]
      // Marca a raiz da árvore do cônjuge com os dados do parceiro
      if (spouseTreeNodes[0].id === spouseId) {
        spouseTreeNodes[0].spouse_id = rootId
        spouseTreeNodes[0].spouse_name = rootPerson?.full_name
      }
      combinedTree = [...combinedTree, ...spouseTreeNodes]
    }
  }

  // 5. Remove duplicatas (pessoas que estão em ambas as árvores)
  const byId = new Map<string, LeadershipTreeNode>()
  combinedTree.forEach((n) => {
    if (!byId.has(n.id)) {
      byId.set(n.id, n)
    } else {
      // Se já existe, garante que se um dos registros tem spouse_id, o preservamos
      const existing = byId.get(n.id)!
      if (!existing.spouse_id && n.spouse_id) {
        existing.spouse_id = n.spouse_id
        existing.spouse_name = n.spouse_name
      }
    }
  })

  // 6. Para todos os outros nós da árvore (liderados), busca se são casados
  const allNodes = Array.from(byId.values())
  const idsWithoutSpouseInfo = allNodes.filter(n => !n.spouse_id).map(n => n.id)

  if (idsWithoutSpouseInfo.length > 0) {
    const { data: spousesData } = await supabaseServer
      .from('people')
      .select('id, full_name, spouse_person_id')
      .in('spouse_person_id', idsWithoutSpouseInfo)

    if (spousesData) {
      spousesData.forEach((s) => {
        const mainNode = byId.get(s.spouse_person_id!)
        if (mainNode) {
          mainNode.spouse_id = s.id
          mainNode.spouse_name = s.full_name
        }
      })
    }
  }

  return Array.from(byId.values())
}

export async function canAccessPerson(
  currentUser: Pick<AccessSnapshot, 'isAdmin' | 'personId'>,
  targetPersonId: string
): Promise<boolean> {
  if (!targetPersonId) return false
  if (currentUser.isAdmin) return true
  if (!currentUser.personId) return false
  if (currentUser.personId === targetPersonId) return true

  try {
    const tree = await getLeadershipTree(currentUser.personId)
    return tree.some((node) => node.id === targetPersonId)
  } catch (error) {
    console.error('Erro ao validar acesso de pessoa:', error)
    return false
  }
}
