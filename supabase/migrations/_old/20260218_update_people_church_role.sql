-- Adiciona 'Bispo' à lista de funções eclesiásticas permitidas
-- Remove a constraint antiga e adiciona a nova atualizada

DO $$
BEGIN
  -- Tentar remover a constraint se ela existir pelo nome padrão ou nome explícito
  -- O nome original não foi nomeado explicitamente na criação da tabela, então o Postgres gerou um nome
  -- Mas na migration original estava inline: church_role text CHECK (...)
  -- Geralmente o nome é people_church_role_check
  
  -- Vamos descobrir e dropar a constraint de check da coluna church_role
  ALTER TABLE public.people DROP CONSTRAINT IF EXISTS people_church_role_check;
  
  -- Adiciona a nova constraint com 'Bispo' incluído
  ALTER TABLE public.people ADD CONSTRAINT people_church_role_check 
    CHECK (church_role IN ('Nenhum','Obreiro','Voluntário','Diácono','Cooperador','Missionário','Pastor','Bispo'));
END $$;
