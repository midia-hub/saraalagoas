-- Fix PD approval status and add audit fields

-- 1. Adicionar campos de auditoria para rastreamento
ALTER TABLE public.cell_realizations
  ADD COLUMN IF NOT EXISTS pd_filled_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS pd_filled_at TIMESTAMP WITH TIME ZONE;

-- 2. Corrigir o default de pd_approval_status para 'pending'
ALTER TABLE public.cell_realizations
  ALTER COLUMN pd_approval_status SET DEFAULT 'pending';

-- 3. Atualizar registros existentes:
-- Se pd_value = 0 E não foi editada (attendance_edit_used = false), status deve ser 'pending'
-- Se pd_value > 0 OU foi editada, mantém como estava
UPDATE public.cell_realizations
SET 
  pd_approval_status = CASE 
    WHEN pd_value = 0 AND (attendance_edit_used IS NULL OR attendance_edit_used = false) THEN 'pending'
    ELSE pd_approval_status
  END,
  -- Se já tem pd_approved_at, significa que foi confirmado, então preenche pd_filled_at se não existe
  pd_filled_at = CASE 
    WHEN pd_approved_at IS NOT NULL AND pd_filled_at IS NULL THEN pd_approved_at
    ELSE pd_filled_at
  END,
  -- Se já tem pd_approved_by, usa como pd_filled_by se não existe
  pd_filled_by = CASE 
    WHEN pd_approved_by IS NOT NULL AND pd_filled_by IS NULL THEN pd_approved_by
    ELSE pd_filled_by
  END
WHERE pd_approval_status = 'approved';

-- 4. Comentário explicativo
COMMENT ON COLUMN public.cell_realizations.pd_filled_by IS 'Usuário que preencheu o valor do PD pela primeira vez';
COMMENT ON COLUMN public.cell_realizations.pd_filled_at IS 'Data/hora em que o PD foi preenchido pela primeira vez';
COMMENT ON COLUMN public.cell_realizations.pd_approved_by IS 'Usuário que aprovou/confirmou o PD (Secretário PD)';
COMMENT ON COLUMN public.cell_realizations.pd_approved_at IS 'Data/hora em que o PD foi aprovado/confirmado';
COMMENT ON COLUMN public.cell_realizations.pd_approval_status IS 'Status de aprovação: pending (aguardando), approved (confirmado), rejected (rejeitado)';
