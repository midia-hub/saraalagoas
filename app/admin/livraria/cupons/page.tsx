// Redirecionamento automático para a página unificada (aba Cupons)
import { redirect } from 'next/navigation'

export default function LivrariaCuponsRedirect() {
  redirect('/admin/livraria/loja-caixa?tab=cupons')
}
