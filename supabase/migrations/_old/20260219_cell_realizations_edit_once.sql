-- Allow only one edit after realization date

ALTER TABLE public.cell_realizations
  ADD COLUMN IF NOT EXISTS attendance_edit_used BOOLEAN DEFAULT false;
