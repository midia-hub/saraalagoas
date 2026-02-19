-- Cells rules and approvals

-- 1) Persistent people per cell
CREATE TABLE IF NOT EXISTS public.cell_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cell_id UUID REFERENCES public.cells(id) ON DELETE CASCADE,
  person_id UUID REFERENCES public.people(id),
  full_name TEXT,
  phone TEXT,
  type TEXT NOT NULL CHECK (type IN ('visitor','member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cell_people_unique_person
ON public.cell_people(cell_id, person_id)
WHERE person_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS cell_people_cell_id_idx
ON public.cell_people(cell_id);

-- 2) Attendances reference cell_people
ALTER TABLE public.cell_attendances
  ADD COLUMN IF NOT EXISTS cell_person_id UUID REFERENCES public.cell_people(id);

CREATE INDEX IF NOT EXISTS idx_cell_attendances_cell_person_idx
ON public.cell_attendances(cell_person_id);

-- 3) Realizations: PD required + approvals + edit window
ALTER TABLE public.cell_realizations
  ALTER COLUMN pd_value SET DEFAULT 0;

UPDATE public.cell_realizations
  SET pd_value = 0
  WHERE pd_value IS NULL;

ALTER TABLE public.cell_realizations
  ALTER COLUMN pd_value SET NOT NULL;

ALTER TABLE public.cell_realizations
  ADD COLUMN IF NOT EXISTS edit_lock_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('approved','pending','rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS pd_approval_status TEXT DEFAULT 'approved' CHECK (pd_approval_status IN ('approved','pending','rejected')),
  ADD COLUMN IF NOT EXISTS pd_approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS pd_approved_at TIMESTAMP WITH TIME ZONE;

-- 4) RLS policies for cell_people
ALTER TABLE public.cell_people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cell_people_select" ON public.cell_people;
CREATE POLICY "cell_people_select" ON public.cell_people FOR SELECT TO authenticated
  USING (public.current_user_can('celulas', 'view') OR public.current_user_can('celulas', 'manage'));

DROP POLICY IF EXISTS "cell_people_all" ON public.cell_people;
CREATE POLICY "cell_people_all" ON public.cell_people FOR ALL TO authenticated
  USING (public.current_user_can('celulas', 'manage'))
  WITH CHECK (public.current_user_can('celulas', 'manage'));
