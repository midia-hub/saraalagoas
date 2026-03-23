/** Nome legível de FK aninhada do Supabase (objeto ou array de um elemento). */
export function fkRelationName(rel: unknown, fallback = 'Sem nome'): string {
  if (rel == null) return fallback
  if (Array.isArray(rel)) {
    const first = rel[0] as { name?: string } | undefined
    return first?.name ?? fallback
  }
  return (rel as { name?: string }).name ?? fallback
}

/** Join `people:person_id(...)` em assignees de etapas — Supabase pode retornar objeto ou array. */
export function personFromAssigneeJoin(row: {
  person_id: string
  people?: unknown
}): { personId: string; name: string } {
  const p = row.people
  const one = Array.isArray(p) ? p[0] : p
  return {
    personId: (one as { id?: string } | undefined)?.id ?? row.person_id,
    name: (one as { full_name?: string } | undefined)?.full_name ?? '',
  }
}
