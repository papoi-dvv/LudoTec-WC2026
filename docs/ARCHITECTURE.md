# Propuesta de arquitectura

## Objetivo

LudoTec WC 2026 es una aplicacion web para predicciones deportivas con autenticacion restringida, salas privadas, leaderboard, procesamiento asincrono de puntajes e integracion opcional con Gemini AI.

## Componentes

- Frontend: Next.js 16 en `frontend`, expuesto en el puerto `3001` en desarrollo.
- Backend API: Node.js + Express en `backend`, expuesto en el puerto `4000` en desarrollo.
- Base de datos: Supabase Postgres en la nube.
- Auth: Supabase Auth, gestionado desde backend para no exponer `SUPABASE_SERVICE_ROLE_KEY`.
- Cache y colas: Redis para leaderboard cacheado y BullMQ.
- Worker: proceso Node separado para puntajes asincronos.
- Balanceador: Nginx como reverse proxy y balanceador de carga para replicas backend.
- IA: Gemini API desde backend usando `@google/generative-ai`.

## Flujo principal

1. El usuario entra a `/`, Next redirige a `/login`.
2. El login valida dominio `@tecsup.edu.pe`.
3. El frontend llama al backend para registro/sesion.
4. El backend usa Supabase Admin para crear usuarios y validar tokens.
5. En dashboard se crean salas y se consultan leaderboards.
6. Redis responde leaderboards cacheados; si no hay cache, el backend consulta Supabase.
7. Al finalizar un partido, la API encola un job BullMQ.
8. El worker calcula puntos, aplica bonus y actualiza Supabase con una funcion SQL transaccional.

## Escalamiento horizontal

El backend es stateless: las sesiones se validan mediante token/cookie y el estado compartido vive en Supabase/Redis. Por eso puede correr en replicas:

- `backend-1`
- `backend-2`

Nginx balancea `/api/*` con `least_conn`. El frontend y worker corren como servicios separados.

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo existe en backend.
- `GEMINI_API_KEY` solo existe en backend.
- El frontend usa solo variables `NEXT_PUBLIC_*`.
- El registro valida dominio en frontend y backend.
- Las cookies de sesion son HttpOnly desde backend.

## Contenerizacion

La entrega incluye:

- `frontend/Dockerfile`
- `backend/Dockerfile`
- `docker-compose.yml`
- `nginx/nginx.conf`

Ejecutar:

```bash
docker compose up --build
```

La aplicacion queda disponible por Nginx en:

```text
http://localhost
```
