import type { Metadata } from "next";

// Force dynamic rendering so this route is never cached at the CDN edge.
// Prevents stale "Supabase not configured" warnings from persisting after
// env var changes and redeploys.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      {children}
    </div>
  );
}
