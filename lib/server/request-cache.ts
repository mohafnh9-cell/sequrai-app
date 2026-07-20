import "server-only";

import { cache } from "react";
import { getServerAuthContext as resolveServerAuthContext } from "@/lib/auth/dev-bypass";
import type { ServerAuthContext } from "@/lib/auth/dev-bypass";

export const getCachedServerAuthContext = cache(
  async (): Promise<ServerAuthContext | null> => resolveServerAuthContext()
);
