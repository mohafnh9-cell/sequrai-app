# Private Beta Launch Checklist

**Last updated:** July 2026  
**Project:** SequrAI Builder Edition V1

Use this to track go-live. Status reflects automated checks run from `/Users/mohamedfornah/Projects/sequrai-app`.

---

## SUPABASE

| Task | Status | Evidence / action |
|------|--------|-------------------|
| Aplicar migrations 010–015 | ❌ **Pendiente** | Schema check sigue fallando. `DATABASE_URL` local no resuelve DNS (`ENOTFOUND db.*.supabase.co`) — aplicar en **Supabase SQL Editor** (ver abajo). |
| Validar schema | ❌ **Falló** | `npm run validate:schema` — faltan `scans.review_type`, `organizations.verdict_autopilot_enabled`, `repository_sync_status.connection_status` |
| Validar RLS | ⏳ **Tras migration 015** | Ejecutar: `npm run validate:rls` (requiere `DATABASE_URL` válido) |
| Validar RPC | ✅ **Parcial** | `create_organization_with_owner()` existe vía API; revalidar con `validate:rls` tras 015 |

### Aplicar en Supabase SQL Editor (en orden)

1. `database/migrations/010_production_verdicts.sql` — si `production_verdicts` ya existe, puede omitirse
2. `database/migrations/011_profiles_locale.sql`
3. `database/migrations/012_repository_sync_status.sql` — **necesario** (`connection_status` falta)
4. `database/migrations/013_automatic_production_reviews.sql`
5. `database/migrations/014_verdict_autopilot.sql`
6. `database/migrations/015_organization_security_hardening.sql`

### Verificación

```bash
npm run validate:schema
npm run validate:rls
```

### Corregir DATABASE_URL local

En Supabase → **Project Settings → Database → Connection string** (URI).  
Actualizar `.env.local`:

- `DATABASE_URL` — pooler (puerto 6543) para app
- `DIRECT_URL` — conexión directa (puerto 5432) para migraciones

El host `db.<ref>.supabase.co` debe resolver en DNS. Si no, el ref del proyecto cambió o el proyecto está pausado.

---

## VERCEL

| Variable | Status | Notas |
|----------|--------|-------|
| `GITHUB_WEBHOOK_SECRET` | ✅ **En Vercel** | Presente en Preview + Production (comprobado vía `vercel env ls`) |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | ❌ **Falta** | No en Vercel ni en `.env.local` — generar y añadir |
| `NEXT_PUBLIC_APP_URL` | ✅ **En Vercel** | Comprobar que coincide con dominio de producción |
| Comprobar resto de env | ⚠️ **Parcial** | En Vercel: `SUPABASE_*`, `DATABASE_URL`. Falta encryption key. |

### Generar encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Añadir en Vercel (Production + Preview):

```bash
vercel env add GITHUB_TOKEN_ENCRYPTION_KEY production
vercel env add GITHUB_TOKEN_ENCRYPTION_KEY preview
```

### Local vs producción

| Variable | Local | Producción |
|----------|-------|------------|
| `GITHUB_WEBHOOK_SECRET` | ❌ Falta | ✅ |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | ❌ Falta | ❌ |
| `SEQURAI_BYPASS_AUTH` | ⚠️ Activado (dev) | Debe estar **unset** |

```bash
npm run validate:env:production   # tras configurar Vercel + pull
```

---

## GITHUB

| Task | Status | Acción |
|------|--------|--------|
| OAuth (Supabase) | ⏳ **Manual** | Supabase → Authentication → GitHub. Scopes: `repo`, `admin:repo_hook`, `read:user`, `user:email`. Callback: `{APP_URL}/auth/callback` |
| Webhooks | ⏳ **Tras deploy** | URL: `{NEXT_PUBLIC_APP_URL}/api/webhooks/github`. Secret = mismo que `GITHUB_WEBHOOK_SECRET` |
| Repositorio de pruebas | ⏳ **Manual** | Repo Next.js pequeño (p. ej. `sequrai-app`). Push de prueba → Continuous Review → Verdict |

### Smoke test GitHub

1. Integrations → conectar repo
2. GitHub repo → Settings → Webhooks → delivery 2xx
3. Push commit trivial
4. SequrAI → badge Continuous Reviews + Verdict actualizado (&lt; 60s)

---

## LOCAL

| Task | Status | Notas |
|------|--------|-------|
| Commit hardening branch | ⏳ **En curso** | Ver commit en repo |
| Merge | ⏳ | Tras commit → merge a `main` |
| Deploy | ⏳ | `git push` → Vercel auto-deploy |

### Comandos

```bash
git checkout -b hardening/private-beta
git add -A
git commit -m "..."
git checkout main && git merge hardening/private-beta
git push origin main
```

O deploy manual:

```bash
vercel --prod
```

---

## Resumen go / no-go

| Área | ¿Listo? |
|------|---------|
| Supabase schema | ❌ |
| Vercel env | ⚠️ (falta encryption key) |
| GitHub E2E | ⏳ |
| Código hardening | ✅ (189 tests, build OK) |
| **Invitar 25 usuarios** | ❌ **Todavía no** |

**Orden recomendado:**

1. SQL Editor → migrations 012–015 (mínimo)
2. `npm run validate:schema` → verde
3. Añadir `GITHUB_TOKEN_ENCRYPTION_KEY` en Vercel
4. Push hardening → deploy
5. Smoke test GitHub en producción
6. Invitar 5 usuarios → luego 25
