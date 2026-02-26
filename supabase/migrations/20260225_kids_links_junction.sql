-- Remove colunas de FK diretas adicionadas anteriormente (substituídas pela junction table)
ALTER TABLE public.people
  DROP COLUMN IF EXISTS kids_father_id,
  DROP COLUMN IF EXISTS kids_mother_id,
  DROP COLUMN IF EXISTS kids_father_name,
  DROP COLUMN IF EXISTS kids_mother_name;

-- Junction table: vínculo adulto → criança com tipo de relação
CREATE TABLE IF NOT EXISTS public.people_kids_links (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adult_id       UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  child_id       UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'Responsável',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (adult_id, child_id)
);

COMMENT ON TABLE  public.people_kids_links                    IS 'Vínculo entre adulto (pai/mãe/responsável) e criança Sara Kids';
COMMENT ON COLUMN public.people_kids_links.adult_id           IS 'Pessoa adulta (pai, mãe, responsável)';
COMMENT ON COLUMN public.people_kids_links.child_id           IS 'Criança vinculada (is_child = true)';
COMMENT ON COLUMN public.people_kids_links.relationship_type  IS 'Tipo de vínculo: Pai, Mãe, Responsável, Outro';

-- RLS: mesmas permissões da tabela people (admin)
ALTER TABLE public.people_kids_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin full access kids links"
  ON public.people_kids_links
  FOR ALL
  USING (true)
  WITH CHECK (true);
