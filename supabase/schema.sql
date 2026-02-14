-- ============================================================
-- SkunkStudio — Supabase Database Schema
-- ============================================================

-- 1. Custom enum types
CREATE TYPE episode_status AS ENUM (
  'draft',
  'processing',
  'completed',
  'failed'
);

CREATE TYPE asset_type AS ENUM (
  'character',
  'background',
  'prop',
  'audio',
  'script'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'succeeded',
  'failed',
  'refunded'
);

-- 2. Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id                 UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              TEXT UNIQUE NOT NULL,
  full_name          TEXT,
  avatar_url         TEXT,
  credits            INTEGER NOT NULL DEFAULT 0,
  plan               TEXT NOT NULL DEFAULT 'free',
  is_paid            BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Episodes table
CREATE TABLE public.episodes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  script        TEXT,
  video_url     TEXT,
  thumbnail_url TEXT,
  status        episode_status NOT NULL DEFAULT 'draft',
  duration_sec  INTEGER,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Assets table
CREATE TABLE public.assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  asset_type      asset_type NOT NULL,
  cloudinary_id   TEXT NOT NULL,
  url             TEXT NOT NULL,
  size_bytes      BIGINT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Payments table
CREATE TABLE public.payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  amount_cents      INTEGER NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'usd',
  status            payment_status NOT NULL DEFAULT 'pending',
  credits_granted   INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX idx_episodes_user   ON public.episodes(user_id);
CREATE INDEX idx_assets_user     ON public.assets(user_id);
CREATE INDEX idx_payments_user   ON public.payments(user_id);
CREATE INDEX idx_payments_stripe ON public.payments(stripe_session_id);

-- 7. Row-Level Security (RLS)
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can read/update only their own row
CREATE POLICY "Users: own row" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Episodes: owner access
CREATE POLICY "Episodes: owner access" ON public.episodes
  FOR ALL USING (auth.uid() = user_id);

-- Assets: owner access
CREATE POLICY "Assets: owner access" ON public.assets
  FOR ALL USING (auth.uid() = user_id);

-- Payments: owner read-only
CREATE POLICY "Payments: owner read" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);
