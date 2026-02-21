import { redirect } from 'next/navigation'

/**
 * Anamneses sao vinculadas ao evento.
 * Redireciona para a lista de eventos do Revisao de Vidas.
 */
export default function AnamnesesRedirectPage() {
  redirect('/admin/revisao-vidas')
}

