-- Modelo de mensagens exibidas após cadastro de conversão (aceitou / reconciliou)
CREATE TABLE IF NOT EXISTS public.conversion_message_templates (
  type text PRIMARY KEY CHECK (type IN ('accepted', 'reconciled')),
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.conversion_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversion_message_templates_select_consolidacao" ON public.conversion_message_templates;
CREATE POLICY "conversion_message_templates_select_consolidacao"
  ON public.conversion_message_templates FOR SELECT TO authenticated
  USING (public.current_user_can('consolidacao', 'view') OR public.current_user_can('consolidacao', 'manage'));

DROP POLICY IF EXISTS "conversion_message_templates_all_consolidacao" ON public.conversion_message_templates;
CREATE POLICY "conversion_message_templates_all_consolidacao"
  ON public.conversion_message_templates FOR ALL TO authenticated
  USING (public.current_user_can('consolidacao', 'manage'))
  WITH CHECK (public.current_user_can('consolidacao', 'manage'));

-- Valores iniciais (textos padrão)
INSERT INTO public.conversion_message_templates (type, content) VALUES
  (
    'accepted',
    'É com grande alegria que recebemos a notícia de que você tomou a decisão de aceitar Jesus como seu Senhor e Salvador! Isso é maravilhoso e estamos muito felizes por você!

Saiba que, como igreja, estamos aqui para caminhar ao seu lado, apoiando você em cada passo dessa nova jornada de fé. Pode contar conosco em tudo o que precisar – estamos prontos para ajudá-lo a crescer espiritualmente e viver a plenitude que Deus tem para sua vida.

Ficamos muito felizes em lhe chamar de irmão em Cristo Jesus. A Sara Nossa Terra lhe dá as boas-vindas com muito amor e orações.

Que Deus continue a abençoar sua caminhada e que você sinta Sua paz e amor a cada dia!

Em Cristo,
A Igreja Sara Nossa Terra'
  ),
  (
    'reconciled',
    'Que alegria saber que você tomou a decisão de se reconciliar com Deus! O coração do Pai se alegra profundamente ao ver um filho de volta à Sua presença. Isso é um grande passo, e estamos emocionados por você!

Saiba que, como igreja, estamos aqui para caminhar ao seu lado nesse novo recomeço. Conte conosco para fortalecê-lo e ajudá-lo a viver a plenitude que Deus tem para a sua vida. A Sua graça é abundante, e estamos muito felizes em vê-lo restaurado e renovado em Cristo.

Ficamos muito felizes em lhe chamar de irmão em Cristo novamente. A Sara Nossa Terra lhe dá as boas-vindas de braços abertos, e estaremos sempre prontos para apoiá-lo em sua jornada.

Que Deus continue a abençoar sua vida, renovando sua fé, esperança e amor!

Em Cristo,
A Igreja Sara Nossa Terra'
  )
ON CONFLICT (type) DO NOTHING;
