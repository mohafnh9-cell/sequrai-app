import { createClient } from "@/lib/supabase/server";
import { saveGitHubToken } from "@/lib/github/token-store";
import { NextRequest, NextResponse } from "next/server";

function redirectOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const origin = redirectOrigin(request);
  const cookieNext = request.cookies.get("sequrai_auth_next")?.value;
  const next = safeNextPath(
    cookieNext ? decodeURIComponent(cookieNext) : searchParams.get("next")
  );

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error("auth_callback_exchange_failed", { code: error?.code });
      return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }

    if (data.session.provider_token && data.user) {
      try {
        await saveGitHubToken(
          data.user.id,
          data.session.provider_token,
          data.session.provider_refresh_token
        );
      } catch (tokenError) {
        console.error("auth_callback_token_store_failed", {
          name: tokenError instanceof Error ? tokenError.name : "UnknownError",
        });
      }
    }

    const response = NextResponse.redirect(`${origin}${next}`);
    response.cookies.delete("sequrai_auth_next");
    return response;
  } catch (callbackError) {
    console.error("auth_callback_failed", {
      name: callbackError instanceof Error ? callbackError.name : "UnknownError",
    });
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }
}
