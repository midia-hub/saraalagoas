-- Allow attendance records for visitors without person_id

ALTER TABLE public.cell_attendances
  ALTER COLUMN person_id DROP NOT NULL;
