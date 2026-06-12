-- Store the user's visible prediction mode for comparison views.

ALTER TABLE public.predicciones
  ADD COLUMN IF NOT EXISTS tipo_prediccion TEXT NOT NULL DEFAULT 'exact',
  ADD COLUMN IF NOT EXISTS prediccion_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.predicciones
  DROP CONSTRAINT IF EXISTS predicciones_tipo_prediccion_check;

ALTER TABLE public.predicciones
  ADD CONSTRAINT predicciones_tipo_prediccion_check
  CHECK (tipo_prediccion IN ('exact', 'winner', 'difference'));

NOTIFY pgrst, 'reload schema';
