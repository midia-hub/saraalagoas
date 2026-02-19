-- Fix cell_realizations constraints: remove old reference_month constraint
-- that prevents multiple realizations in the same month
-- 
-- The table should allow:
-- - Multiple realizations per month (as long as they're on different dates)
-- - Only one realization per specific date per cell
-- 
-- The correct constraint is: UNIQUE(cell_id, realization_date)
-- The problematic constraint is: UNIQUE(cell_id, reference_month)

-- First, check what constraints currently exist and document them
-- Then drop the problematic one if it exists

-- Drop all existing constraint versions that might exist
DO $$ 
DECLARE 
  constraint_exists BOOLEAN;
BEGIN
  -- Check and drop cell_realizations_cell_id_reference_month_key
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'cell_realizations' 
    AND constraint_name = 'cell_realizations_cell_id_reference_month_key'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    ALTER TABLE public.cell_realizations 
      DROP CONSTRAINT "cell_realizations_cell_id_reference_month_key";
    RAISE NOTICE 'Dropped problematic constraint: cell_realizations_cell_id_reference_month_key';
  END IF;
END $$;

-- Ensure the correct unique constraint exists on (cell_id, realization_date)
-- This is already defined in the main migration, but let's be explicit
ALTER TABLE public.cell_realizations 
  DROP CONSTRAINT IF EXISTS "cell_realizations_cell_id_realization_date_key";

-- Create the correct constraint if it doesn't exist
ALTER TABLE public.cell_realizations 
  ADD CONSTRAINT "cell_realizations_cell_id_realization_date_key" 
  UNIQUE(cell_id, realization_date);

