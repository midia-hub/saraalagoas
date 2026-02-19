'use client'

import { Check, X, Minus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AttendanceVisitorAdd } from './AttendanceVisitorAdd'

interface AttendanceGridProps {
  members: any[]
  dates: string[]
  attendances: any[] // Realizações carregadas do banco
  onToggle: (personId: string, date: string, currentStatus: string | null, cellPersonId?: string) => void
  onAddVisitor?: (visitor: { full_name: string; phone?: string }) => void
  onAddPerson?: (personId: string) => void
  onRemoveMember?: (personId: string, cellPersonId?: string) => Promise<void>
  coreMembers?: { id: string; full_name: string; role: 'leader' | 'co-leader' }[]
  visitors?: string[] // IDs de visitantes adicionados
}

export function AttendanceGrid({ members, dates, attendances, onToggle, onAddVisitor, onAddPerson, onRemoveMember, coreMembers = [], visitors = [] }: AttendanceGridProps) {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const attendanceMap = new Map<string, string>()
  const peopleWithAttendance = new Map<string, { id: string; full_name: string }>()

  const resolveAttendanceKey = (att: any) => {
    // Preferir sempre person_id pois é o ID global da pessoa
    const pId = att?.person_id || att?.person?.id || att?.cell_person?.person_id || att?.cell_person?.person?.id
    if (pId) return pId

    // Se não tiver person_id, usar o ID do vínculo (cell_person_id)
    const cpId = att?.cell_person_id || att?.cell_person?.id
    if (cpId) return cpId

    // Caso extremo: registro órfão completo
    if (att?.id) return `orphan_${att.id}`

    return `unknown_${Math.random().toString(36).substring(7)}`
  }
  
  // Filtrar duplicatas: manter apenas o melhor registro de cada pessoa
  const bestAttendancePerDate = new Map<string, { [personId: string]: any }>()
  
  attendances.forEach(rel => {
    const dateStr = new Date(rel.realization_date).toISOString().split('T')[0]
    if (!bestAttendancePerDate.has(dateStr)) {
      bestAttendancePerDate.set(dateStr, {})
    }
    
    const dateMap = bestAttendancePerDate.get(dateStr)!
    
    rel.attendances?.forEach((att: any) => {
      const keyId = resolveAttendanceKey(att)
      if (!keyId) {
        return
      }
      
      // Se já existe um registro para esta pessoa nesta data
      if (dateMap[keyId]) {
        const existing = dateMap[keyId]
        // Preferir: person/cell_person com dados > cell_person_id sem dados > registro órfão
        const existingScore = (existing.person || existing.cell_person) ? 2 : (existing.cell_person_id) ? 1 : 0
        const currentScore = (att.person || att.cell_person) ? 2 : (att.cell_person_id) ? 1 : 0
        
        if (currentScore > existingScore) {
          dateMap[keyId] = att
        } else if (currentScore === existingScore) {
          // Mesma qualidade - manter o primeiro encontrado
        }
      } else {
        dateMap[keyId] = att
      }
    })
  })
  
  // Reconstruir o fluxo com apenas os melhores registros
  bestAttendancePerDate.forEach((dateMap, dateStr) => {
    Object.values(dateMap).forEach((att: any) => {
      const keyId = resolveAttendanceKey(att)
      if (!keyId) return
      
      attendanceMap.set(`${keyId}_${dateStr}`, att.status)
      
      // Registrar pessoa para a lista
      if (!peopleWithAttendance.has(keyId)) {
        const pData = att.person || att.cell_person?.person
        if (pData) {
          peopleWithAttendance.set(keyId, {
            id: keyId,
            full_name: pData.full_name,
            type: att.cell_person?.type || (att.person_id ? 'visitor' : 'unknown')
          })
        } else if (att.cell_person) {
          peopleWithAttendance.set(keyId, {
            id: keyId,
            full_name: att.cell_person.full_name || 'Visitante',
            type: att.cell_person.type
          })
        } else if (att.cell_person_id) {
          peopleWithAttendance.set(keyId, {
            id: keyId,
            full_name: `[Dados Deletados - ${att.cell_person_id.substring(0, 8)}]`,
            type: 'deleted'
          })
        } else {
          const displayId = keyId.startsWith('orphan_') ? keyId.substring(7, 15) : keyId.substring(0, 8)
          peopleWithAttendance.set(keyId, {
            id: keyId,
            full_name: `[Registro Antigo - ${displayId}]`,
            type: 'unknown'
          })
        }
      }
    })
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Unir membros formais com registros de attendance
  const allPeople = new Map<string, any>()
  
  // 1. Adicionar membros formais (usando person_id se existir, se não cell_person_id)
  members.forEach(m => {
    const pId = m.person_id || m.person?.id || m.id
    allPeople.set(pId, m)
  })
  
  // 2. Adicionar pessoas de atendances que não estão nos membros
  peopleWithAttendance.forEach((p, pId) => {
    if (!allPeople.has(pId)) {
      allPeople.set(pId, p)
    }
  })

  const allPeopleArray = Array.from(allPeople.values()).sort((a, b) => {
    const nameA = (a.person?.full_name || a.full_name || 'Sem Nome').toLowerCase()
    const nameB = (b.person?.full_name || b.full_name || 'Sem Nome').toLowerCase()
    return nameA.localeCompare(nameB)
  })


  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <th className="px-6 py-4 sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[200px]">Membro</th>
            {dates.map(date => (
              <th key={date} className="px-4 py-4 text-center border-r border-slate-200 min-w-[100px]">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    {new Date(date + 'T12:00:00').toLocaleString('pt-BR', { weekday: 'short' })}
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              </th>
            ))}
            <th className="px-4 py-4 text-center bg-slate-50 border-l-2 border-slate-300 min-w-[100px]">
              <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-400">%</span>
                <span className="text-sm font-bold text-slate-700">Presença</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {allPeopleArray.map((m, index) => {
            const person = m.person || m
            const personId = m.person_id || person.id
            
            // cellPersonId é o ID da relação cell_people. Importante para o toggle.
            const cellPersonId = m.cell_person_id || (m.type ? m.id : undefined)
            
            // attendanceKey deve ser o personId se disponível, pois resolveAttendanceKey prefere person_id
            const attendanceKey = personId || cellPersonId
            
            const reactKey = `row-${attendanceKey}-${index}`
            const coreMember = coreMembers.find(cm => cm.id === personId)
            const isUnknown = m.type === 'unknown'
            const isDeleted = m.type === 'deleted'
            const isCellMember = m.type === 'member'
            const isVisitor = m.type === 'visitor' || visitors.includes(personId) || (!isCellMember && !coreMember && !isUnknown && !isDeleted)
            
            // Toggle key para evitar disparos duplicados ou em pessoa errada
            // Usamos o personId se disponível, senão o cellPersonId
            const toggleKeyId = personId || cellPersonId
            
            // Calcular percentual de presença
            let presentCount = 0
            let totalCount = 0
            dates.forEach(date => {
              const status = attendanceMap.get(`${attendanceKey}_${date}`)
              const dateObj = new Date(`${date}T00:00:00`)
              const isFuture = dateObj > today
              
              if (!isFuture && (status === 'V' || status === 'X')) {
                totalCount++
                if (status === 'V') presentCount++
              }
            })
            const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(0) : '0'
            const percentageColor = 
              parseFloat(percentage) >= 80 ? 'text-emerald-600 bg-emerald-50' :
              parseFloat(percentage) >= 50 ? 'text-amber-600 bg-amber-50' :
              'text-red-600 bg-red-50'
            
            return (
              <tr key={reactKey} className={`hover:bg-slate-50/50 transition-colors ${coreMember ? 'bg-slate-50/50' : ''} ${isUnknown ? 'bg-red-50/30' : ''} ${isDeleted ? 'bg-yellow-50/30' : ''}`}>
                <td className={`px-6 py-4 font-medium sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] flex items-center gap-2 ${coreMember ? 'bg-slate-50 text-emerald-700 font-semibold' : isUnknown ? 'bg-red-50/50 text-red-700 italic' : isDeleted ? 'bg-yellow-50/50 text-yellow-700 italic' : 'bg-white text-slate-700'}`}>
                  <div className="flex-1 flex items-center gap-2">
                    {person.full_name || person.name || m.full_name || 'Desconhecido'}
                    
                    {/* CORE MEMBER BADGES */}
                    {coreMember && (
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 ${
                        coreMember.role === 'leader' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {coreMember.role === 'leader' ? 'Líder' : 'Co-líder'}
                      </span>
                    )}

                    {/* DELETED / ERROR BADGES */}
                    {isDeleted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-yellow-600 text-white" title="Membro foi removido da célula">
                        Removido
                      </span>
                    )}

                    {isUnknown && !isDeleted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-red-600 text-white" title="Frequência sem pessoa associada">
                        Erro nos dados
                      </span>
                    )}

                    {/* CELL MEMBER BADGE (Exclusively for type === 'member') */}
                    {isCellMember && !coreMember && !isUnknown && !isDeleted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-blue-100 text-blue-700 border border-blue-200">
                        Membro
                      </span>
                    )}

                    {/* VISITOR BADGE (Fallback for everyone else) */}
                    {isVisitor && !isCellMember && !coreMember && !isUnknown && !isDeleted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-orange-100 text-orange-700 border border-orange-200">
                        Visitante
                      </span>
                    )}
                  </div>
                  {!isDeleted && !isUnknown && onRemoveMember && !coreMember && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setRemovingMemberId(toggleKeyId)
                        setRemoveConfirmOpen(true)
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remover da célula (histórico de presenças será apagado)"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
                {dates.map(date => {
                  const status = attendanceMap.get(`${attendanceKey}_${date}`)
                  const dateObj = new Date(`${date}T00:00:00`)
                  const isFuture = dateObj > today
                  const isOrphanRecord = isUnknown || isDeleted
                  
                  return (
                    <td key={date} className="px-2 py-2 text-center border-r border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isOrphanRecord) {
                            onToggle(toggleKeyId, date, status || null, cellPersonId)
                          }
                        }}
                        disabled={isFuture || isOrphanRecord}
                        className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center transition-all ${
                          status === 'V'
                            ? isDeleted
                              ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-400/20 cursor-not-allowed'
                              : isUnknown
                              ? 'bg-red-400 text-white shadow-lg shadow-red-400/20 cursor-not-allowed' 
                              : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                            : status === 'X'
                            ? isDeleted
                              ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-400/20 cursor-not-allowed'
                              : isUnknown
                              ? 'bg-red-400 text-white shadow-lg shadow-red-400/20 cursor-not-allowed'
                              : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                            : isFuture || isOrphanRecord
                            ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                            : 'bg-slate-50 text-slate-300 hover:bg-slate-100 hover:text-slate-400'
                        }`}
                      >
                        {status === 'V' ? <Check size={20} /> : status === 'X' ? <X size={20} /> : <Minus size={16} />}
                      </button>
                    </td>
                  )
                })}
                <td className={`px-4 py-4 text-center border-l-2 border-slate-300 ${coreMember ? 'bg-slate-50' : 'bg-white'}`}>
                  <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm ${percentageColor}`}>
                    {percentage}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {presentCount}/{totalCount}
                  </div>
                </td>
              </tr>
            )
          })}
          {allPeopleArray.length === 0 && (
            <tr>
              <td colSpan={dates.length + 2} className="px-6 py-12 text-center text-slate-400 italic">
                Nenhum membro vinculado a esta célula.
              </td>
            </tr>
          )}
          {(onAddVisitor || onAddPerson) && (
            <AttendanceVisitorAdd 
              onAddVisitor={(v) => onAddVisitor?.(v)}
              onAddPerson={(id, status) => onAddPerson?.(id, status)}
            />
          )}
        </tbody>
      </table>

      {/* Modal de confirmação para remover membro */}
      {removeConfirmOpen && removingMemberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Trash2 size={24} className="text-red-600" />
                Remover Membro
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-700">
                Tem certeza que deseja remover <span className="font-semibold">{allPeopleArray.find(p => (p.person || p).id === removingMemberId)?.person?.full_name || allPeopleArray.find(p => (p.person || p).id === removingMemberId)?.full_name}</span> da célula?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">⚠️ Atenção:</p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>O histórico de presenças desta pessoa nesta célula será <span className="font-semibold">apagado</span></li>
                  <li>Esta ação é definitiva e necessária para remover o vínculo</li>
                  <li>A pessoa continuará cadastrada no sistema geral</li>
                </ul>
              </div>
            </div>
            <div className="p-6 flex gap-3 border-t border-slate-200">
              <button
                onClick={() => {
                  if (!isRemoving) {
                    setRemoveConfirmOpen(false)
                    setRemovingMemberId(null)
                  }
                }}
                disabled={isRemoving}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (removingMemberId && onRemoveMember) {
                    setIsRemoving(true)
                    try {
                      await onRemoveMember(removingMemberId)
                      setRemoveConfirmOpen(false)
                      setRemovingMemberId(null)
                    } catch (error) {
                      console.error('Erro ao remover membro:', error)
                    } finally {
                      setIsRemoving(false)
                    }
                  }
                }}
                disabled={isRemoving}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                  isRemoving ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isRemoving ? 'Removendo...' : 'Confirmar Remoção'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
