-- LudoTec WC 2026 - Schema
-- Mirrors the development schema already applied from Database.sql.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT,
  puntaje_total INT DEFAULT 0,
  racha_aciertos INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipo_local TEXT NOT NULL,
  equipo_visitante TEXT NOT NULL,
  fecha_partido TIMESTAMPTZ NOT NULL,
  estado TEXT DEFAULT 'PROGRAMADO',
  goles_local INT DEFAULT NULL,
  goles_visitante INT DEFAULT NULL,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo_invitacion TEXT UNIQUE NOT NULL,
  creador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.predicciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  sala_id UUID NOT NULL REFERENCES public.salas(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
  tipo_prediccion TEXT NOT NULL DEFAULT 'exact',
  prediccion_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  marcador_local INT NOT NULL,
  marcador_visitante INT NOT NULL,
  puntos_base INT NOT NULL DEFAULT 0,
  bonus_tiempo INT NOT NULL DEFAULT 0,
  bonus_racha INT NOT NULL DEFAULT 0,
  puntos_obtenidos INT DEFAULT 0,
  procesado BOOLEAN DEFAULT FALSE,
  procesado_en TIMESTAMPTZ DEFAULT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_usuario_sala_partido UNIQUE (usuario_id, sala_id, partido_id)
);

CREATE TABLE IF NOT EXISTS public.sala_miembros (
  sala_id UUID REFERENCES public.salas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
  unido_en TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (sala_id, usuario_id)
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios (email);
CREATE INDEX IF NOT EXISTS idx_partidos_fecha ON public.partidos (fecha_partido);
CREATE INDEX IF NOT EXISTS idx_predicciones_usuario ON public.predicciones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_predicciones_sala ON public.predicciones (sala_id);
CREATE INDEX IF NOT EXISTS idx_predicciones_partido ON public.predicciones (partido_id);
CREATE INDEX IF NOT EXISTS idx_predicciones_sala_partido ON public.predicciones (sala_id, partido_id);
CREATE INDEX IF NOT EXISTS idx_predicciones_partido_procesado ON public.predicciones (partido_id, procesado);
CREATE INDEX IF NOT EXISTS idx_salas_creador ON public.salas (creador_id);
