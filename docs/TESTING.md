# Documentacion de pruebas

## Pruebas automatizadas ejecutadas

Backend:

```bash
cd backend
npm test
```

Cobertura funcional incluida:

- Validacion de dominio de correo.
- Calculo de puntajes base y bonus.
- Procesamiento atomico de puntajes.
- Generacion de invitaciones para salas.
- Normalizacion de leaderboard.
- Manejo de errores Gemini.

Frontend:

```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Validaciones incluidas:

- Lint de componentes Next/React.
- Typecheck TypeScript.
- Build productivo de Next.js.

## Pruebas manuales recomendadas

1. Abrir `http://localhost:3001`.
2. Confirmar que `/` redirige a `/login`.
3. Registrar un usuario `@tecsup.edu.pe`.
4. Iniciar sesion.
5. Crear una sala.
6. Copiar enlace de invitacion.
7. Consultar leaderboard.
8. Probar analisis IA con dos equipos.

## Stress testing

La prueba de humo/estres usa k6 contra el balanceador Nginx o backend local.

Instalar k6:

```bash
winget install k6
```

Ejecutar contra Docker/Nginx:

```bash
docker compose up --build
k6 run stress/k6-smoke.js
```

Ejecutar contra backend local:

```bash
BASE_URL=http://localhost:4000 k6 run stress/k6-smoke.js
```

Umbrales configurados:

- Menos de 5% de requests fallidos.
- Percentil 95 menor a 800 ms.

Endpoints ejercitados:

- `GET /api/health`
- `POST /api/scoring/calculate`

## Resultados esperados

Para una ejecucion local sana:

- `http_req_failed` menor a `0.05`.
- `http_req_duration p(95)` menor a `800ms`.
- Respuestas 200 en health y scoring.

Registra capturas o salida terminal de k6 como evidencia final de stress testing.
