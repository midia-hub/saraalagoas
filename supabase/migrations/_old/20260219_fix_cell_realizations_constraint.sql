-- Fix cell_realizations constraints: remove duplicate reference_month constraint
-- that prevents multiple realizations in the same month

-- Drop the old constraint if it exists (for environments that have it)
ALTER TABLE public.cell_realizations 
  DROP CONSTRAINT IF EXISTS "cell_realizations_cell_id_reference_month_key";

-- Ensure we have only the correct constraint: one realization per date per cell
-- The UNIQUE(cell_id, realization_date) allows multiple realizations per month
-- but only one per specific date
-- (This should already exist, but making sure)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cell_realizations_cell_date 
  ON public.cell_realizations(cell_id, realization_date);
