-- access_profile_id deve ser nullable: usuários sem acesso a nenhum módulo
-- não precisam de um perfil de acesso associado.
-- Constraint NOT NULL foi adicionada via dashboard; esta migration a remove.
ALTER TABLE public.profiles ALTER COLUMN access_profile_id DROP NOT NULL;
