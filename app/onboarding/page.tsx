import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";
import { OnboardingFlow } from "@/features/onboarding/components/OnboardingFlow";
import { getOnboardingContext } from "@/server/onboarding/get-onboarding-context";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Get your first Production Verdict | SequrAI" };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/onboarding");

  const params = await searchParams;
  const forcedStep = params.step != null;
  const context = await getOnboardingContext(supabase, user.id);

  if (context.isComplete && !forcedStep) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-8 md:flex-row md:items-start md:justify-center md:py-12">
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center md:sticky md:top-12 md:items-start md:text-left">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">First Production Verdict</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Under five minutes to your first answer: ready to ship, or not.
            </p>
          </div>
        </div>

        <Suspense fallback={null}>
          <OnboardingFlow initialContext={context} />
        </Suspense>
      </div>
    </div>
  );
}
