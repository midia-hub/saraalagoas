-- 20260223_add_people_missing_registration_fields.sql
-- Campos adicionais para alinhar cadastro de pessoas com formulário ministerial

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS church_name TEXT,
  ADD COLUMN IF NOT EXISTS is_new_convert BOOLEAN,
  ADD COLUMN IF NOT EXISTS accepted_jesus BOOLEAN,
  ADD COLUMN IF NOT EXISTS accepted_jesus_at TEXT,
  ADD COLUMN IF NOT EXISTS rg_issuing_agency TEXT,
  ADD COLUMN IF NOT EXISTS rg_uf TEXT,
  ADD COLUMN IF NOT EXISTS origin_church TEXT;
