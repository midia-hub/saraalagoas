-- ============================================================
-- Sincronizar perfis: cria linha em public.profiles para cada
-- usuário em auth.users que ainda não tem perfil.
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- ============================================================
-- Depois, defina um admin (substitua o e-mail pelo seu):
--   UPDATE public.profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');
-- ============================================================

INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'viewer'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
