# SequrAI Database Setup

## Quick Start

1. Create a new [Supabase project](https://supabase.com/dashboard)
2. Copy your project URL and anon key to `.env.local`
3. Open the Supabase SQL Editor and run `migrations/001_initial_schema.sql`
4. Enable GitHub OAuth in Authentication → Providers → GitHub

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profiles, auto-created on signup |
| `organizations` | Team workspaces |
| `organization_members` | User ↔ Organization membership with roles |
| `projects` | Individual projects within an org |
| `subscriptions` | Stripe subscription data (ready for Stripe) |

## Row Level Security

All tables have RLS enabled. Users can only access data belonging to their organization.
