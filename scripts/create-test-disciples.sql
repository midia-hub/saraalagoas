-- Script de teste: Criar discipulados de exemplo para testar o módulo
-- Execute este script no INSOMNIA ou pelo SQL Editor do Supabase

-- 1. Criar uma igreja de teste (se não existir)
INSERT INTO public.churches (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Igreja Teste Sara')
ON CONFLICT (id) DO NOTHING;

-- 2. Criar pessoas de exemplo (líder e 3 discípulos)
INSERT INTO public.people (id, full_name, church_profile, church_situation, mobile_phone, email)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'João Silva (Líder)', 'Membro', 'Ativo', '(82) 99999-0001', 'joao@exemplo.com'),
  ('20000000-0000-0000-0000-000000000001', 'Maria Santos', 'Membro', 'Ativo', '(82) 99999-0002', 'maria@exemplo.com'),
  ('20000000-0000-0000-0000-000000000002', 'Pedro Costa', 'Frequentador', 'Ativo', '(82) 99999-0003', 'pedro@exemplo.com'),
  ('20000000-0000-0000-0000-000000000003', 'Ana Lima', 'Visitante', 'Ativo', '(82) 99999-0004', 'ana@exemplo.com')
ON CONFLICT (id) DO NOTHING;

-- 3. Criar vínculo de discipulados (João lidera Maria, Pedro e Ana)
INSERT INTO public.discipulados (church_id, discipulador_person_id, discipulo_person_id, active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', true),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', true)
ON CONFLICT (discipulador_person_id, discipulo_person_id) DO NOTHING;

-- 4. Criar um culto de exemplo
INSERT INTO public.worship_services (id, name, church_id, day_of_week, time_of_day, active)
VALUES ('30000000-0000-0000-0000-000000000001', 'Culto de Celebração', '00000000-0000-0000-0000-000000000001', 0, '19:00', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Criar 4 sessões de culto (últimos 4 domingos)
INSERT INTO public.worship_sessions (service_id, church_id, session_date)
VALUES 
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-01-26'),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-02-02'),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-02-09'),
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '2026-02-16')
ON CONFLICT (service_id, session_date) DO NOTHING;

-- 6. Criar registros de frequência (diferentes padrões)
-- Maria: 4/4 (100%)
INSERT INTO public.worship_attendance (person_id, service_id, attended_on, attended)
VALUES 
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-01-26', true),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-02-02', true),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-02-09', true),
  ('20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '2026-02-16', true)
ON CONFLICT DO NOTHING;

-- Pedro: 3/4 (75%)
INSERT INTO public.worship_attendance (person_id, service_id, attended_on, attended)
VALUES 
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '2026-01-26', true),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '2026-02-02', true),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '2026-02-09', false),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '2026-02-16', true)
ON CONFLICT DO NOTHING;

-- Ana: 1/4 (25%)
INSERT INTO public.worship_attendance (person_id, service_id, attended_on, attended)
VALUES 
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '2026-01-26', false),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '2026-02-02', false),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '2026-02-09', true),
  ('20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '2026-02-16', false)
ON CONFLICT DO NOTHING;

-- 7. Vincular o líder João a um perfil de usuário (ajuste o UUID do profiles para seu user_id)
-- Você precisa trocar 'SEU_USER_ID' pelo ID real do seu perfil no Supabase auth.users
-- UPDATE public.profiles SET person_id = '10000000-0000-0000-0000-000000000001' WHERE id = 'SEU_USER_ID';

SELECT 'Dados de teste criados com sucesso!' as status;
