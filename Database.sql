-- Habilitar la extensión para generar UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABLA DE PERFILES DE USUARIOS (Espejo de auth.users de Supabase)
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT,
    puntaje_total INT DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE PARTIDOS
CREATE TABLE public.partidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipo_local TEXT NOT NULL,
    equipo_visitante TEXT NOT NULL,
    fecha_partido TIMESTAMP WITH TIME ZONE NOT NULL,
    estado TEXT DEFAULT 'PROGRAMADO', -- PROGRAMADO, EN_CURSO, FINALIZADO
    goles_local INT DEFAULT NULL,
    goles_visitante INT DEFAULT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE PREDICCIONES
CREATE TABLE public.predicciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    partido_id UUID NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
    marcador_local INT NOT NULL,
    marcador_visitante INT NOT NULL,
    puntos_obtenidos INT DEFAULT 0,
    procesado BOOLEAN DEFAULT FALSE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, partido_id) -- Evita que un usuario prediga dos veces el mismo partido
);

-- 4. TABLA DE SALAS (GRUPOS PRIVADOS)
CREATE TABLE public.salas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    codigo_invitacion TEXT UNIQUE NOT NULL,
    creador_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA INTERMEDIA: MIEMBROS DE LAS SALAS
CREATE TABLE public.sala_miembros (
    sala_id UUID REFERENCES public.salas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE,
    unido_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (sala_id, usuario_id)
);

-- Habilitar seguridad por filas (RLS) si se requiere, o configurarlo desde el panel.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Inserción de 10 partidos iniciales de prueba para el Mundial 2026
INSERT INTO public.partidos (equipo_local, equipo_visitante, fecha_partido, estado)
VALUES 
('Estados Unidos', 'México', '2026-06-11 18:00:00+00', 'PROGRAMADO'),
('Canadá', 'Costa Rica', '2026-06-12 15:00:00+00', 'PROGRAMADO'),
('Argentina', 'Francia', '2026-06-13 20:00:00+00', 'PROGRAMADO'),
('Brasil', 'España', '2026-06-14 17:00:00+00', 'PROGRAMADO'),
('Alemania', 'Japón', '2026-06-15 14:00:00+00', 'PROGRAMADO'),
('Inglaterra', 'Senegal', '2026-06-16 19:00:00+00', 'PROGRAMADO'),
('Italia', 'Uruguay', '2026-06-17 16:00:00+00', 'PROGRAMADO'),
('Portugal', 'Marruecos', '2026-06-18 21:00:00+00', 'PROGRAMADO'),
('Países Bajos', 'Ecuador', '2026-06-19 13:00:00+00', 'PROGRAMADO'),
('Bélgica', 'Corea del Sur', '2026-06-20 18:00:00+00', 'PROGRAMADO');