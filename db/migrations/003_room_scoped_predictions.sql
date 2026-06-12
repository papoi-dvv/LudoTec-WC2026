-- Make predictions belong to a specific room.

ALTER TABLE public.predicciones
  ADD COLUMN IF NOT EXISTS sala_id UUID REFERENCES public.salas(id) ON DELETE CASCADE;

ALTER TABLE public.predicciones
  DROP CONSTRAINT IF EXISTS uq_usuario_partido;

ALTER TABLE public.predicciones
  ADD CONSTRAINT uq_usuario_sala_partido UNIQUE (usuario_id, sala_id, partido_id);

ALTER TABLE public.predicciones
  ADD CONSTRAINT predicciones_sala_required CHECK (sala_id IS NOT NULL) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_predicciones_sala
  ON public.predicciones (sala_id);

CREATE INDEX IF NOT EXISTS idx_predicciones_sala_partido
  ON public.predicciones (sala_id, partido_id);
