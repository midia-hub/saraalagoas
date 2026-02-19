-- ============================================================
-- Pessoas (cadastro central) + vínculo Consolidação
-- ============================================================
-- - Tabela public.people (cadastro mestre)
-- - profiles.person_id (FK para people)
-- - conversoes.person_id (FK para people)
-- - Resource RBAC "pessoas" e "consolidacao"
-- - RLS para people
-- ============================================================

-- 1. TABELA PUBLIC.PEOPLE
CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Dados principais
  full_name text NOT NULL,
  church_profile text NOT NULL CHECK (church_profile IN ('Membro','Frequentador','Visitante')),
  church_situation text NOT NULL CHECK (church_situation IN ('Ativo','Inativo')),

  -- Função
  church_role text CHECK (church_role IN ('Nenhum','Obreiro','Voluntário','Diácono','Cooperador','Missionário','Pastor')),

  -- Dados pessoais
  sex text CHECK (sex IN ('Masculino','Feminino')),
  birth_date date,
  marital_status text CHECK (marital_status IN ('Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)')),
  marriage_date date,
  rg text,
  cpf text,
  special_needs text,

  -- Contatos
  cep text,
  city text,
  state text,
  neighborhood text,
  address_line text,
  email text,
  mobile_phone text,
  phone text,

  -- Dados eclesiásticos
  entry_by text CHECK (entry_by IN ('Batismo','Reconciliação','Transferência','Conversão','Outro')),
  entry_date date,
  status_in_church text CHECK (status_in_church IN ('Ativo','Inativo')),
  conversion_date date,
  is_baptized boolean,
  baptism_date date,
  is_leader boolean,
  is_pastor boolean,

  -- Dados adicionais
  education_level text CHECK (education_level IN (
    'Analfabeto','Fundamental Incompleto','Fundamental Completo',
    'Médio Incompleto','Médio Completo','Superior Incompleto','Superior Completo',
    'Pós-graduação','Mestrado','Doutorado','Não informado'
  )),
  profession text,
  nationality text,
  birthplace text,
  interviewed_by text,
  registered_by text,
  blood_type text CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','Não informado'))
);

-- Constraints condicionais: data de casamento só se Casado(a); batismo obrigatório se is_baptized (só adiciona se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_marriage_date_if_casado' AND conrelid = 'public.people'::regclass) THEN
    ALTER TABLE public.people ADD CONSTRAINT chk_marriage_date_if_casado
      CHECK ((marriage_date IS NULL) OR (marital_status = 'Casado(a)'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_baptism_date_if_baptized' AND conrelid = 'public.people'::regclass) THEN
    ALTER TABLE public.people ADD CONSTRAINT chk_baptism_date_if_baptized
      CHECK ((is_baptized IS NOT TRUE) OR (baptism_date IS NOT NULL));
  END IF;
END $$;

COMMENT ON TABLE public.people IS 'Cadastro central de pessoas (membro, visitante, etc.)';

-- CPF único quando preenchido
CREATE UNIQUE INDEX IF NOT EXISTS idx_people_cpf_unique ON public.people(cpf) WHERE cpf IS NOT NULL AND trim(cpf) <> '';

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_people_full_name_lower ON public.people(lower(full_name));
CREATE INDEX IF NOT EXISTS idx_people_mobile_phone ON public.people(mobile_phone) WHERE mobile_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_email ON public.people(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_cpf ON public.people(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_updated_at ON public.people(updated_at);

-- Trigger updated_at (criar só se não existir; idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'people' AND n.nspname = 'public' AND t.tgname = 'update_people_updated_at'
  ) THEN
    CREATE TRIGGER update_people_updated_at
      BEFORE UPDATE ON public.people
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2. VÍNCULO PROFILES -> PEOPLE
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES public.people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_person_id ON public.profiles(person_id);

-- 3. TABELA CONVERSOES (criar se não existir) + VÍNCULO COM PEOPLE
-- Se a tabela não existir, cria com person_id; se já existir (ex.: create_consolidacao_module), adiciona a coluna.
CREATE TABLE IF NOT EXISTS public.conversoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(255) NOT NULL,
  email varchar(255),
  telefone varchar(20) NOT NULL,
  data_nascimento date,
  endereco text,
  cidade varchar(100),
  estado varchar(2),
  cep varchar(10),
  data_conversao date NOT NULL,
  culto varchar(50),
  quem_indicou varchar(255),
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  person_id uuid REFERENCES public.people(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_conversoes_nome ON public.conversoes(nome);
CREATE INDEX IF NOT EXISTS idx_conversoes_data_conversao ON public.conversoes(data_conversao);
CREATE INDEX IF NOT EXISTS idx_conversoes_cidade ON public.conversoes(cidade);
CREATE INDEX IF NOT EXISTS idx_conversoes_created_at ON public.conversoes(created_at);
CREATE INDEX IF NOT EXISTS idx_conversoes_person_id ON public.conversoes(person_id);

-- Trigger updated_at (criar só se não existir; evita conflito com create_consolidacao_module)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE c.relname = 'conversoes' AND n.nspname = 'public' AND t.tgname = 'update_conversoes_updated_at'
  ) THEN
    CREATE TRIGGER update_conversoes_updated_at
      BEFORE UPDATE ON public.conversoes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Se a tabela já existia sem person_id (ex.: criada por create_consolidacao_module), adicionar a coluna
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversoes')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversoes' AND column_name = 'person_id') THEN
    ALTER TABLE public.conversoes ADD COLUMN person_id uuid REFERENCES public.people(id) ON DELETE RESTRICT;
    CREATE INDEX IF NOT EXISTS idx_conversoes_person_id ON public.conversoes(person_id);
  END IF;
END $$;

-- 4. RECURSOS RBAC: pessoas e consolidacao
INSERT INTO public.resources (key, name, description, category, sort_order) VALUES
  ('pessoas', 'Pessoas', 'Cadastro central de pessoas', 'admin', 35),
  ('consolidacao', 'Consolidação', 'Módulo de conversão e consolidação', 'admin', 45)
ON CONFLICT (key) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  sort_order = excluded.sort_order;

-- Permissões para admin em pessoas e consolidacao (via role_permissions; só insere se não existir)
DO $$
DECLARE
  role_admin_id uuid;
  perm_manage_id uuid;
  res_pessoas_id uuid;
  res_consolidacao_id uuid;
BEGIN
  SELECT id INTO role_admin_id FROM public.roles WHERE key = 'admin' LIMIT 1;
  SELECT id INTO perm_manage_id FROM public.permissions WHERE action = 'manage' LIMIT 1;
  SELECT id INTO res_pessoas_id FROM public.resources WHERE key = 'pessoas' LIMIT 1;
  SELECT id INTO res_consolidacao_id FROM public.resources WHERE key = 'consolidacao' LIMIT 1;

  IF role_admin_id IS NOT NULL AND perm_manage_id IS NOT NULL AND res_pessoas_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, resource_id, permission_id)
    SELECT role_admin_id, res_pessoas_id, perm_manage_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_permissions
      WHERE role_id = role_admin_id AND resource_id = res_pessoas_id AND permission_id = perm_manage_id
    );
  END IF;

  IF role_admin_id IS NOT NULL AND perm_manage_id IS NOT NULL AND res_consolidacao_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, resource_id, permission_id)
    SELECT role_admin_id, res_consolidacao_id, perm_manage_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_permissions
      WHERE role_id = role_admin_id AND resource_id = res_consolidacao_id AND permission_id = perm_manage_id
    );
  END IF;
END $$;

-- 5. RLS PUBLIC.PEOPLE
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_select_admin_or_permission" ON public.people;
CREATE POLICY "people_select_admin_or_permission"
  ON public.people FOR SELECT
  TO authenticated
  USING (public.current_user_can('pessoas', 'view') OR public.current_user_can('pessoas', 'manage'));

DROP POLICY IF EXISTS "people_insert_admin_or_permission" ON public.people;
CREATE POLICY "people_insert_admin_or_permission"
  ON public.people FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_can('pessoas', 'create') OR public.current_user_can('pessoas', 'manage'));

DROP POLICY IF EXISTS "people_update_admin_or_permission" ON public.people;
CREATE POLICY "people_update_admin_or_permission"
  ON public.people FOR UPDATE
  TO authenticated
  USING (public.current_user_can('pessoas', 'edit') OR public.current_user_can('pessoas', 'manage'))
  WITH CHECK (public.current_user_can('pessoas', 'edit') OR public.current_user_can('pessoas', 'manage'));

DROP POLICY IF EXISTS "people_delete_admin_or_permission" ON public.people;
CREATE POLICY "people_delete_admin_or_permission"
  ON public.people FOR DELETE
  TO authenticated
  USING (public.current_user_can('pessoas', 'delete') OR public.current_user_can('pessoas', 'manage'));

-- 6. RLS CONVERSOES
ALTER TABLE public.conversoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver todas as conversões" ON public.conversoes;
DROP POLICY IF EXISTS "Usuários com permissão podem ver conversões" ON public.conversoes;
DROP POLICY IF EXISTS "Usuários com permissão podem criar conversões" ON public.conversoes;
DROP POLICY IF EXISTS "Usuários com permissão podem editar conversões" ON public.conversoes;
DROP POLICY IF EXISTS "Usuários com permissão podem deletar conversões" ON public.conversoes;
DROP POLICY IF EXISTS "conversoes_select_can_view" ON public.conversoes;
DROP POLICY IF EXISTS "conversoes_insert_can_create" ON public.conversoes;
DROP POLICY IF EXISTS "conversoes_update_can_edit" ON public.conversoes;
DROP POLICY IF EXISTS "conversoes_delete_can_delete" ON public.conversoes;

CREATE POLICY "conversoes_select_can_view"
  ON public.conversoes FOR SELECT TO authenticated
  USING (
    public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage')
  );

CREATE POLICY "conversoes_insert_can_create"
  ON public.conversoes FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_can('consolidacao', 'create') OR public.current_user_can('consolidacao', 'manage')
  );

CREATE POLICY "conversoes_update_can_edit"
  ON public.conversoes FOR UPDATE TO authenticated
  USING (
    public.current_user_can('consolidacao', 'edit') OR public.current_user_can('consolidacao', 'manage')
  )
  WITH CHECK (
    public.current_user_can('consolidacao', 'edit') OR public.current_user_can('consolidacao', 'manage')
  );

CREATE POLICY "conversoes_delete_can_delete"
  ON public.conversoes FOR DELETE TO authenticated
  USING (
    public.current_user_can('consolidacao', 'delete') OR public.current_user_can('consolidacao', 'manage')
  );
