        -- Adiciona campos de localização e endereço à tabela cells
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS cep text NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS street text NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS address_number text NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS neighborhood text NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS city text NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS state text NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS latitude numeric(10,7) NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS longitude numeric(10,7) NULL;
        ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS status text NULL DEFAULT 'ativa';

        -- Índice para melhorar buscas por localização
        CREATE INDEX IF NOT EXISTS cells_city_idx ON public.cells(city);
        CREATE INDEX IF NOT EXISTS cells_coordinates_idx ON public.cells(latitude, longitude);
