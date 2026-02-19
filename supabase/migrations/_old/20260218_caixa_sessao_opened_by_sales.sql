-- ============================================================
-- Caixa: quem abriu a sessão + vincular vendas à sessão
-- ============================================================

-- 1) Sessão: registrar usuário que abriu e nome para exibição
ALTER TABLE public.livraria_caixa_sessao
  ADD COLUMN IF NOT EXISTS opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opened_by_name text;

CREATE INDEX IF NOT EXISTS idx_livraria_caixa_sessao_opened_by ON public.livraria_caixa_sessao(opened_by);

COMMENT ON COLUMN public.livraria_caixa_sessao.opened_by IS 'Usuário que abriu a sessão (auth.users.id). Fechamento automático ao sair.';
COMMENT ON COLUMN public.livraria_caixa_sessao.opened_by_name IS 'Nome do operador que abriu (exibição em Loja e Caixa).';

-- 2) Venda: vincular à sessão de caixa em que foi feita
ALTER TABLE public.bookstore_sales
  ADD COLUMN IF NOT EXISTS caixa_sessao_id uuid REFERENCES public.livraria_caixa_sessao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookstore_sales_caixa_sessao ON public.bookstore_sales(caixa_sessao_id);

COMMENT ON COLUMN public.bookstore_sales.caixa_sessao_id IS 'Sessão de caixa (livraria) em que a venda foi realizada; obrigatório para vendas no PDV.';
