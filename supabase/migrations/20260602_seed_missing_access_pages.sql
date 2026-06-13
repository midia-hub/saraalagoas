-- Insere page_keys ausentes em access_pages.
-- access_profile_permissions.page_key é FK para access_pages.key,
-- então qualquer page_key nova precisa existir aqui antes de ser usada.

INSERT INTO public.access_pages (key, label, description, sort_order)
VALUES
  ('revisao_vidas',        'Revisão de Vidas',   'Eventos, inscrições e anamneses pastorais',      45),
  ('sara_kids',            'Sara Kids',           'Gestão de crianças e check-in',                  55),
  ('escalas',              'Escalas',             'Escalas de voluntários e equipes',               60),
  ('lideranca',            'Liderança',           'Discipulado e liderança',                        65),
  ('cultos',               'Cultos',              'Gestão de cultos e presenças',                   68),
  ('reservas',             'Reservas',            'Reserva de salas e espaços',                     75),
  ('usuarios',             'Usuários',            'Gestão de usuários e acessos',                   90),
  ('livraria_produtos',    'Livraria – Produtos', 'Cadastro de produtos da livraria',               110),
  ('livraria_dashboard',   'Livraria – Dashboard','Visão geral da livraria',                        111),
  ('livraria_pdv',         'Livraria – PDV',      'Ponto de venda da livraria',                     112),
  ('livraria_vendas',      'Livraria – Vendas',   'Histórico de vendas',                            113),
  ('livraria_estoque',     'Livraria – Estoque',  'Controle de estoque',                            114),
  ('livraria_movimentacoes','Livraria – Movim.',  'Movimentações de estoque',                       115),
  ('livraria_importacao',  'Livraria – Importação','Importação de produtos',                        116),
  ('livraria_clientes',    'Livraria – Clientes', 'Cadastro de clientes',                           117),
  ('livraria_fiado',       'Livraria – Fiado',    'Controle de fiado',                              118),
  ('livraria_reservas',    'Livraria – Reservas', 'Reservas de produtos',                           119),
  ('livraria_cupons',      'Livraria – Cupons',   'Cupons de desconto',                             120)
ON CONFLICT (key) DO NOTHING;
