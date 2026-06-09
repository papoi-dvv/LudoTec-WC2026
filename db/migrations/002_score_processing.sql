-- Scoring support for concurrent match finalization workers.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS racha_aciertos INT NOT NULL DEFAULT 0;

ALTER TABLE public.predicciones
  ADD COLUMN IF NOT EXISTS puntos_base INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_tiempo INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_racha INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS procesado_en TIMESTAMPTZ DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.apply_prediction_score(
  p_prediction_id UUID,
  p_usuario_id UUID,
  p_base_points INT,
  p_time_bonus INT,
  p_was_correct BOOLEAN
)
RETURNS TABLE (
  prediction_id UUID,
  user_id UUID,
  base_points INT,
  time_bonus INT,
  streak_bonus INT,
  total_points INT,
  new_streak INT,
  already_processed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed BOOLEAN;
  v_current_streak INT;
  v_new_streak INT;
  v_streak_bonus INT;
  v_total_points INT;
BEGIN
  SELECT procesado
  INTO v_processed
  FROM public.predicciones
  WHERE id = p_prediction_id
    AND usuario_id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prediction % for user % was not found', p_prediction_id, p_usuario_id;
  END IF;

  IF v_processed THEN
    RETURN QUERY
    SELECT
      p.id,
      p.usuario_id,
      p.puntos_base,
      p.bonus_tiempo,
      p.bonus_racha,
      p.puntos_obtenidos,
      u.racha_aciertos,
      TRUE
    FROM public.predicciones p
    JOIN public.usuarios u ON u.id = p.usuario_id
    WHERE p.id = p_prediction_id;
    RETURN;
  END IF;

  SELECT racha_aciertos
  INTO v_current_streak
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % was not found', p_usuario_id;
  END IF;

  v_new_streak := CASE WHEN p_was_correct THEN v_current_streak + 1 ELSE 0 END;
  v_streak_bonus := CASE
    WHEN p_was_correct THEN
      ((floor(v_new_streak::numeric / 3) - floor(v_current_streak::numeric / 3))::int * 2)
    ELSE 0
  END;
  v_total_points := p_base_points + p_time_bonus + v_streak_bonus;

  UPDATE public.predicciones
  SET
    puntos_base = p_base_points,
    bonus_tiempo = p_time_bonus,
    bonus_racha = v_streak_bonus,
    puntos_obtenidos = v_total_points,
    procesado = TRUE,
    procesado_en = now()
  WHERE id = p_prediction_id;

  UPDATE public.usuarios
  SET
    puntaje_total = COALESCE(puntaje_total, 0) + v_total_points,
    racha_aciertos = v_new_streak
  WHERE id = p_usuario_id;

  RETURN QUERY
  SELECT
    p_prediction_id,
    p_usuario_id,
    p_base_points,
    p_time_bonus,
    v_streak_bonus,
    v_total_points,
    v_new_streak,
    FALSE;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_predicciones_partido_procesado
  ON public.predicciones (partido_id, procesado);
