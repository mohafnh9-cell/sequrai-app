"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database";

// ─── Profile Hook ─────────────────────────────────────────────────────────────

export const profileKeys = {
  detail: (id: string) => ["profile", id] as const,
};

export function useProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ""),
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!userId) return null;
      const supabase = createClient();

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}
