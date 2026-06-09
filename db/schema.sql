-- LudoTec WC 2026 - Schema
-- Creates tables: partidos, predicciones, salas, sala_miembros
-- Assumes Supabase Auth is used (auth.users). If you prefer a local users table, see the optional section below.

-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PARTIDOS: matches with real result fields
CREATE TABLE IF NOT EXISTS public.partidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  fecha_partido TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADO', -- PROGRAMADO, EN_CURSO, FINALIZADO
  goles_local INT DEFAULT NULL,
  goles_visitante INT DEFAULT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PREDICCIONES: user predictions for matches
CREATE TABLE IF NOT EXISTS public.predicciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL,
  partido_id UUID NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  marcador_local INT NOT NULL,
  marcador_visitante INT NOT NULL,
  puntos_obtenidos INT DEFAULT 0,
  procesado BOOLEAN DEFAULT FALSE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_usuario_auth FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT uq_usuario_partido UNIQUE (usuario_id, partido_id)
);

-- SALAS: private groups with invitation code
CREATE TABLE IF NOT EXISTS public.salas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo_invitacion TEXT NOT NULL UNIQUE,
  creador_id UUID NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_sala_creador FOREIGN KEY (creador_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- SALA_MIEMBROS: many-to-many between salas and usuarios
CREATE TABLE IF NOT EXISTS public.sala_miembros (
  sala_id UUID NOT NULL REFERENCES public.salas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  unido_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sala_id, usuario_id),
  CONSTRAINT fk_miembro_usuario FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Optional: a local profile mirror table for easier joins and denormalized data
-- Uncomment if you prefer maintaining a profiles table instead of querying auth.users directly.
--
-- CREATE TABLE IF NOT EXISTS public.usuarios (
--   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   email TEXT UNIQUE NOT NULL,
--   nombre TEXT,
--   puntaje_total INT DEFAULT 0,
--   creado_en TIMESTAMPTZ DEFAULT now()
-- );

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_partidos_fecha ON public.partidos (fecha_partido);
CREATE INDEX IF NOT EXISTS idx_predicciones_usuario ON public.predicciones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_salas_creador ON public.salas (creador_id);
