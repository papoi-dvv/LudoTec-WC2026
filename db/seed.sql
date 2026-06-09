-- Seed data for LudoTec WC 2026 - Partidos
-- Inserts at least 10 fictitious matches for testing

INSERT INTO public.partidos (equipo_local, equipo_visitante, fecha_partido, estado)
SELECT equipo_local, equipo_visitante, fecha_partido::timestamptz, estado
FROM (VALUES
  ('Estados Unidos', 'México', '2026-06-11 18:00:00+00', 'PROGRAMADO'),
  ('Canadá', 'Costa Rica', '2026-06-12 15:00:00+00', 'PROGRAMADO'),
  ('Argentina', 'Francia', '2026-06-13 20:00:00+00', 'PROGRAMADO'),
  ('Brasil', 'España', '2026-06-14 17:00:00+00', 'PROGRAMADO'),
  ('Alemania', 'Japón', '2026-06-15 14:00:00+00', 'PROGRAMADO'),
  ('Inglaterra', 'Senegal', '2026-06-16 19:00:00+00', 'PROGRAMADO'),
  ('Italia', 'Uruguay', '2026-06-17 16:00:00+00', 'PROGRAMADO'),
  ('Portugal', 'Marruecos', '2026-06-18 21:00:00+00', 'PROGRAMADO'),
  ('Países Bajos', 'Ecuador', '2026-06-19 13:00:00+00', 'PROGRAMADO'),
  ('Bélgica', 'Corea del Sur', '2026-06-20 18:00:00+00', 'PROGRAMADO')
) AS seed(equipo_local, equipo_visitante, fecha_partido, estado)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.partidos p
  WHERE p.equipo_local = seed.equipo_local
    AND p.equipo_visitante = seed.equipo_visitante
    AND p.fecha_partido = seed.fecha_partido::timestamptz
);
