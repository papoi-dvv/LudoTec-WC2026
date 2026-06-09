# LudoTec WC 2026

Plataforma de predicciones deportivas (Fase 1 - autenticacion)

Requisitos:
- Node.js 18+ y npm
- Cuenta de Supabase con un proyecto creado

Variables de entorno (frontend/.env.local):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-secret
```

Comandos:

```bash
cd frontend
npm install
npm run dev
```

Notas:
- Solo se permiten registros con el dominio @tecsup.edu.pe.
- La ruta server-side `/api/auth/register` revalida el dominio antes de crear el usuario.
- Tras login el cliente llama `/api/auth/set-session` para crear una cookie HttpOnly de sesión.
