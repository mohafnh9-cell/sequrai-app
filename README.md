# SequrAI — AI Security Director for AI-built Apps

> Automated security scanning, vulnerability detection, and AI-powered fix generation for apps built with Cursor, Claude Code, Lovable, Bolt, Vercel, Supabase, and Firebase.

## Stack

- **Framework**: Next.js 16 App Router (TypeScript)
- **Styling**: Tailwind CSS v4 + custom shadcn/ui components
- **Database**: PostgreSQL via Supabase + Prisma ORM v7
- **Auth**: Supabase Auth (email/password + GitHub OAuth)
- **Payments**: Stripe (subscriptions + webhooks)
- **AI**: OpenAI GPT-4o-mini for fix generation
- **Email**: Resend for notifications
- **Deploy**: Vercel

## Project Structure

```
sequrai-app/
├── app/
│   ├── (auth)/              # Public auth pages (login, signup)
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── dashboard/       # Main dashboard
│   │   ├── projects/        # Projects list + detail
│   │   ├── settings/        # Account, team, billing
│   │   └── pricing/         # Plan upgrade page
│   ├── api/                 # API routes
│   │   ├── projects/        # Projects CRUD
│   │   ├── scans/           # Scan triggering
│   │   ├── ai/fix/          # AI fix generation
│   │   ├── stripe/          # Checkout + webhooks
│   │   └── mcp/             # MCP tool endpoints
│   └── auth/callback/       # Supabase OAuth callback
├── components/
│   ├── ui/                  # Base UI components (shadcn/ui)
│   ├── dashboard/           # Dashboard components (sidebar)
│   ├── landing/             # Landing page components
│   ├── projects/            # Project components
│   └── vulnerabilities/     # Vulnerability + AI Fix components
├── lib/
│   ├── supabase/            # Supabase client (server + client + middleware)
│   ├── prisma/              # Prisma client (pg adapter)
│   ├── stripe/              # Stripe client + plan definitions
│   ├── openai/              # OpenAI client + fix generation
│   ├── resend/              # Email notifications
│   ├── scanner/             # Security scanner engine
│   └── utils/               # Shared utilities
├── mcp/
│   ├── server.ts            # MCP server (Phase 6)
│   └── tools/               # MCP tool definitions
├── prisma/
│   └── schema.prisma        # Database schema
└── types/
    └── index.ts             # Shared TypeScript types
```

## Getting Started

### 1. Set up environment variables

Copy `.env.local` and fill in your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Database
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BUILDER_PRICE_ID=price_...
STRIPE_STUDIO_PRICE_ID=price_...
STRIPE_AGENCY_PRICE_ID=price_...

# OpenAI
OPENAI_API_KEY=sk-...

# Resend
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Set up the database

```bash
# Run Prisma migrations
npx prisma migrate dev --name init

# Or push schema directly (for rapid prototyping)
npx prisma db push
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Pricing Plans

| Plan | Price | Projects | Scans/mo | Members |
|------|-------|----------|----------|---------|
| Builder | €49/mo | 5 | 50 | 2 |
| Studio | €99/mo | 20 | 200 | 10 |
| Agency | €299/mo | ∞ | ∞ | ∞ |

All plans include a 14-day free trial, no credit card required.

## Security Scanner — Detection Categories

The scanner (Phase 1) detects:

1. **Secrets Exposed** — API keys, tokens, passwords in code
2. **CORS Permissive** — Wildcard `*` origin policies
3. **Missing Security Headers** — CSP, HSTS, X-Frame-Options
4. **SQL Injection** — String interpolation in queries
5. **Supabase RLS Disabled** — Missing row-level security
6. **Firebase Insecure Rules** — Public read/write access
7. **Vulnerable Dependencies** — Known CVEs in package.json
8. **Auth Bypass** — API routes without authentication
9. **API Security** — Missing rate limiting, no input validation

## MCP Integration (Phase 6)

The `mcp/` folder contains the architecture for the MCP server. Phase 6 will expose these tools to Cursor and Claude Code:

- `run_security_scan` — Trigger a scan from your editor
- `get_project_vulnerabilities` — Fetch vulnerabilities with filters
- `get_security_score` — Get current security score
- `generate_cursor_fix_prompt` — Generate Cursor-ready fix prompt
- `generate_claude_fix_prompt` — Generate Claude Code-ready fix prompt
- `create_fix_proposal` — Create a draft PR

## Deployment

Deploy to Vercel:

```bash
vercel --prod
```

Set up Stripe webhook:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
