-- ============================================================
-- Bolão Arena da Copa — Schema isolado
-- Requer: Dashboard Supabase → Project Settings → API → Exposed schemas → adicionar "bolao_copa"
-- ============================================================

CREATE SCHEMA IF NOT EXISTS bolao_copa;

-- -----------------------------------------------------------
-- Equipes do Arena
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS bolao_copa.teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  color           TEXT NOT NULL DEFAULT '#111111',
  secondary_color TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------
-- Jogos do Brasil
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS bolao_copa.games (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team      TEXT NOT NULL DEFAULT 'Brasil',
  away_team      TEXT NOT NULL,
  game_date      TIMESTAMP WITH TIME ZONE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open',
  brazil_score   INTEGER,
  opponent_score INTEGER,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT games_status_check CHECK (status IN ('open', 'closed', 'finished'))
);

-- -----------------------------------------------------------
-- Palpites dos participantes
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS bolao_copa.guesses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id             UUID NOT NULL REFERENCES bolao_copa.games(id) ON DELETE CASCADE,
  team_id             UUID NOT NULL REFERENCES bolao_copa.teams(id),
  participant_name    TEXT NOT NULL,
  whatsapp            TEXT NOT NULL,
  whatsapp_normalized TEXT NOT NULL,
  brazil_guess        INTEGER NOT NULL,
  opponent_guess      INTEGER NOT NULL,
  points              INTEGER DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT guesses_score_check CHECK (brazil_guess >= 0 AND opponent_guess >= 0)
);

-- 1 palpite por número normalizado por jogo
CREATE UNIQUE INDEX IF NOT EXISTS guesses_unique_game_phone
  ON bolao_copa.guesses (game_id, whatsapp_normalized);

-- -----------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------
ALTER TABLE bolao_copa.teams  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bolao_copa.games  ENABLE ROW LEVEL SECURITY;
ALTER TABLE bolao_copa.guesses ENABLE ROW LEVEL SECURITY;

-- Teams: leitura pública
CREATE POLICY "bolao_teams_public_read"
  ON bolao_copa.teams FOR SELECT
  TO anon, authenticated
  USING (true);

-- Games: leitura pública
CREATE POLICY "bolao_games_public_read"
  ON bolao_copa.games FOR SELECT
  TO anon, authenticated
  USING (true);

-- Guesses: leitura pública (WhatsApp não é exposto pelo ranking endpoint)
CREATE POLICY "bolao_guesses_public_read"
  ON bolao_copa.guesses FOR SELECT
  TO anon, authenticated
  USING (true);

-- Guesses: INSERT público (API valida status do jogo + duplicidade)
CREATE POLICY "bolao_guesses_public_insert"
  ON bolao_copa.guesses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE/DELETE apenas via service_role (painel admin usa backend com service role)

-- -----------------------------------------------------------
-- Seed: equipes iniciais do Arena
-- -----------------------------------------------------------
INSERT INTO bolao_copa.teams (name, slug, color, secondary_color) VALUES
  ('Invictos',         'invictos',          '#111111', '#FFFFFF'),
  ('Os Setenta',       'os-setenta',        '#B91C1C', '#F59E0B'),
  ('Evolution Team 12','evolution-team-12', '#F97316', '#111111'),
  ('Inconformados',    'inconformados',     '#EC4899', '#111111')
ON CONFLICT (slug) DO NOTHING;
