import { redirect } from 'next/navigation'

export default function LivrariaImportacaoPage() {
  redirect('/admin/livraria/produtos?tab=importacao')
}
