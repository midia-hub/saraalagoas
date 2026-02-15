-- Cadastro das igrejas (lista Sara)
-- Insere apenas se o nome ainda não existir (evita duplicata por unique em lower(trim(name)))

INSERT INTO public.churches (name)
VALUES
  ('Sara Sede Alagoas'),
  ('Sara Benedito Bentes'),
  ('Sara Benedito Bentes II'),
  ('Sara Graciliano Ramos'),
  ('Sara Jacintinho'),
  ('Sara Jatiúca'),
  ('Sara Eustáquio Gomes'),
  ('Sara Mata do Rolo'),
  ('Sara Osman Loureiro'),
  ('Sara Salvador Lyra'),
  ('Sara Serraria'),
  ('Sara Marechal Deodoro')
ON CONFLICT ( (lower(trim(name))) ) DO NOTHING;
