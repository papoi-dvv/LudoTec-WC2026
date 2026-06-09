# LudoTec WC 2026

Plataforma de predicciones deportivas para el Mundial 2026.

## Entregables

- Propuesta de arquitectura: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Desarrollo de la aplicacion: frontend Next.js, backend Express, Supabase, Redis, BullMQ y Gemini.
- Contenerizacion con Docker: `frontend/Dockerfile`, `backend/Dockerfile`, `docker-compose.yml`.
- Escalamiento horizontal y balanceo de carga: `docker-compose.yml` levanta `backend-1`, `backend-2` y Nginx con `least_conn`.
- Documentacion de pruebas y stress testing: [`docs/TESTING.md`](docs/TESTING.md), incluye script k6 en `stress/k6-smoke.js`.

## Requisitos

- Node.js 18+ y npm
- Docker Desktop o Docker Engine
- Proyecto de Supabase creado en la nube

Nota para Node.js 20: el backend declara `ws` para que Supabase JS tenga transporte WebSocket compatible al ejecutar workers y procesos Node.

## Variables de entorno

Frontend: copia `frontend/.env.local.example` a `frontend/.env.local`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
# O usa NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en proyectos nuevos de Supabase.
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Backend y migraciones: copia `backend/.env.example` a `backend/.env`.

```bash
PORT=4000
NODE_ENV=development
DB_HOST=db.your-project-ref.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-database-password
DATABASE_URL=postgresql://postgres:your-database-password@db.your-project-ref.supabase.co:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
REDIS_URL=redis://localhost:6379
SCORE_WORKER_CONCURRENCY=3
FRONTEND_URL=http://localhost:3001
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.0-flash
```

`backend/.env` y `frontend/.env.local` son archivos locales y no deben subirse a Git. Las claves secretas, como `SUPABASE_SERVICE_ROLE_KEY`, deben vivir solo en el backend.

El registro y la creación de la cookie de sesión se ejecutan en el backend Express:
- `POST http://localhost:4000/api/auth/register`
- `POST http://localhost:4000/api/auth/set-session`

El frontend solo llama a esas rutas usando `NEXT_PUBLIC_API_URL`; no necesita ni debe tener `SUPABASE_SERVICE_ROLE_KEY`.
En desarrollo, el backend crea usuarios con `email_confirm: true`, así que no se envía correo de confirmación y el usuario puede iniciar sesión inmediatamente. Para producción, configura SMTP y plantillas en Supabase antes de exigir confirmación por email.

## Ejecucion local

Instala dependencias:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Ejecuta las migraciones necesarias contra Supabase:

```bash
cd ..
bash db/migrate.sh db/migrations/001_baseline.sql
bash db/migrate.sh db/migrations/002_score_processing.sql
```

Levanta Redis en una terminal:

```bash
docker run --rm -p 6379:6379 redis:alpine
```

Levanta el backend en otra terminal:

```bash
cd backend
npm run dev
```

Levanta el worker de puntajes en otra terminal:

```bash
cd backend
npm run worker:score
```

Levanta el frontend en otra terminal:

```bash
cd frontend
npm run dev
```

Abre la app en:

```text
http://localhost:3001
```

Servicios locales esperados:
- Frontend Next.js: `http://localhost:3001`
- Backend Express: `http://localhost:4000`
- Redis: `redis://localhost:6379`

Si cambias `PORT` en `backend/.env`, actualiza también `NEXT_PUBLIC_API_URL` en `frontend/.env.local`.

## Ejecucion con Docker

Para ejecutar el sistema contenerizado con Nginx, Redis, frontend, dos replicas backend y worker:

```bash
docker compose up --build
```

Abre:

```text
http://localhost
```

Nginx enruta:

- `/` hacia el frontend.
- `/api/*` hacia el backend balanceado entre `backend-1` y `backend-2`.

Antes de construir en Docker, exporta las variables publicas que necesita el build del frontend:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-or-publishable-key"
```

Tambien puedes copiar `.env.example` a `.env` en la raiz del proyecto. Docker Compose lee ese archivo automaticamente para los `build.args` publicos del frontend. No pongas claves secretas en ese `.env` raiz; los secretos del backend siguen viviendo en `backend/.env`.

## Donde obtener las claves en Supabase

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Dashboard > Project Settings > API > Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` o `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase Dashboard > Project Settings > API > Project API keys. En proyectos nuevos puede aparecer como `Publishable key`.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard > Project Settings > API > Service role key. Esta clave es secreta y solo debe usarse en `backend/.env`.
- `GEMINI_API_KEY`: Google AI Studio > API keys. Esta clave es secreta y solo debe usarse en `backend/.env`.
- `DB_PASSWORD`: Supabase Dashboard > Project Settings > Database. Es la contraseña asignada a la base de datos.
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`: Supabase Dashboard > Project Settings > Database > Connection string. Para desarrollo directo suele ser `db.<project-ref>.supabase.co`, puerto `5432`, base `postgres`, usuario `postgres`.
- `DATABASE_URL`: Supabase Dashboard > Project Settings > Database > Connection string. Si el host directo `db.<project-ref>.supabase.co` solo resuelve por IPv6 en tu máquina o en Docker, usa el connection string del pooler. El usuario del pooler suele tener formato `postgres.<project-ref>` y puerto `6543`.

## Migraciones de desarrollo

El esquema base está en `db/schema.sql`. La migración baseline idempotente está en `db/migrations/001_baseline.sql`; existe porque `Database.sql` ya fue ejecutado previamente en Supabase.

Ejecutar migración contra la base configurada en `backend/.env`:

```bash
bash db/migrate.sh
```

También puedes pasar la URL de conexión solo para una ejecución:

```bash
DATABASE_URL='postgresql://...' bash db/migrate.sh
```

Ejecutar un archivo específico:

```bash
bash db/migrate.sh db/migrations/001_baseline.sql
```

Ejecutar seed de datos de prueba:

```bash
bash db/migrate.sh db/seed.sql
```

## Desarrollo backend

El backend expone `POST /api/scoring/calculate` para calcular puntos de una predicción finalizada.

Ejemplo de body:

```json
{
  "prediction": {
    "marcador_local": 2,
    "marcador_visitante": 1,
    "fecha_creacion": "2026-06-10T17:00:00.000Z"
  },
  "result": {
    "goles_local": 2,
    "goles_visitante": 1,
    "fecha_partido": "2026-06-11T18:00:00.000Z"
  }
}
```

Reglas de puntaje:
- 5 puntos por marcador exacto.
- 3 puntos por acertar ganador o empate, cuando no hubo marcador exacto.
- 2 puntos por acertar diferencia de goles, cuando no acertó marcador ni ganador/empate.
- 1 punto extra si la predicción fue hecha con más de 24 horas de anticipación.
- En los últimos 10 minutos antes del partido solo se otorgan puntos base.

## Procesamiento de puntajes con Worker

Cuando un administrador finaliza un partido, la API actualiza el resultado y encola un trabajo BullMQ:

```http
POST /api/admin/partidos/:partidoId/finalizar
Content-Type: application/json

{
  "goles_local": 2,
  "goles_visitante": 1
}
```

Respuesta esperada:

```json
{
  "partido": {
    "id": "uuid",
    "estado": "FINALIZADO",
    "goles_local": 2,
    "goles_visitante": 1
  },
  "scoringJob": {
    "id": "score-match:uuid",
    "name": "score-match"
  }
}
```

Ejecutar Redis local:

```bash
docker run --rm -p 6379:6379 redis:alpine
```

Ejecutar API y worker en terminales separadas:

```bash
cd backend
npm run dev
```

```bash
cd backend
npm run worker:score
```

El worker lee las predicciones pendientes del partido, calcula puntos base y bonus de tiempo, y llama a la función SQL `apply_prediction_score`. Esa función bloquea la predicción y el usuario con `FOR UPDATE`, marca la predicción como procesada y suma el puntaje total de forma atómica para evitar dobles sumas si hay reintentos o varios workers.

Bonus por racha:
- Se considera acierto cualquier predicción con puntos base mayores a 0.
- `usuarios.racha_aciertos` aumenta con cada acierto consecutivo y vuelve a 0 cuando falla.
- Se suman 2 puntos extra cada vez que la racha cruza un múltiplo de 3: 3, 6, 9, etc.

Antes de usar el worker, ejecuta la migración:

```bash
bash db/migrate.sh db/migrations/002_score_processing.sql
```

## Salas y Leaderboard

Crear sala:

```http
POST /api/salas
Content-Type: application/json

{
  "nombre": "Promo Tecsup 2026",
  "creador_id": "uuid-del-usuario"
}
```

La API genera un `codigo_invitacion` único y devuelve `inviteUrl` usando `FRONTEND_URL`.

Consultar leaderboard cacheado:

```http
GET /api/salas/:salaId/leaderboard
```

La respuesta indica si los datos vinieron de Redis o de la base:

```json
{
  "source": "redis",
  "ttlSeconds": 30,
  "rows": [
    {
      "posicion": 1,
      "id": "uuid",
      "nombre": "Ana",
      "email": "ana@tecsup.edu.pe",
      "puntaje_total": 42
    }
  ]
}
```

Si no existe cache, el backend consulta Supabase, ordena la tabla y guarda el resultado en Redis por 30 segundos. Cuando el worker de puntajes actualiza a un usuario, invalida los leaderboards de sus salas.

## Analisis IA de partidos

El backend expone un controlador con Gemini:

```http
POST /api/ai/match-analysis
Content-Type: application/json

{
  "equipoA": "Argentina",
  "equipoB": "Brasil"
}
```

Respuesta:

```json
{
  "matchup": "Argentina vs. Brasil",
  "analysis": "Texto maximo de dos lineas generado por Gemini.",
  "model": "gemini-2.0-flash"
}
```

El dashboard incluye una tarjeta para escribir dos equipos y mostrar el analisis. La llamada se hace al backend con `NEXT_PUBLIC_API_URL`; `GEMINI_API_KEY` nunca debe ir en el frontend.
El modelo por defecto es `gemini-2.0-flash`; si tu cuenta de Google AI Studio muestra otro modelo disponible para `generateContent`, cambia `GEMINI_MODEL` en `backend/.env`.

Si Gemini responde `429 Too Many Requests`, la API key no tiene cuota disponible para ese modelo o proyecto. Cambiar la key solo ayuda si pertenece a otro proyecto con cuota activa; si no, habilita billing/cuota en Google AI Studio o espera el tiempo indicado por `retryAfterSeconds`.

Notas:
- Solo se permiten registros con el dominio `@tecsup.edu.pe`.
- La clave `SUPABASE_SERVICE_ROLE_KEY` no debe estar expuesta en el frontend.
- Crear salas funciona aunque Redis no esté levantado; en ese caso el leaderboard consulta la base de datos sin cache. Para cache y worker de puntajes, Redis sí debe estar activo.
