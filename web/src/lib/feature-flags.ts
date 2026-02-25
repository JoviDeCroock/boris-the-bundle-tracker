import { useQuery } from "@tanstack/react-query";
import { getFeatureFlags } from "./api";

/**
 * Fetches the list of feature flag names enabled for the current user.
 * Returns an empty array when the user is unauthenticated or the request fails.
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature-flags"],
    queryFn: getFeatureFlags,
    staleTime: 60_000,
    // Don't throw on auth errors — unauthenticated users simply get no flags
    throwOnError: false,
  });
}

/**
 * Returns true when the named flag is enabled for the current user.
 *
 * @example
 * const newDashboard = useFlag("new-dashboard");
 * if (newDashboard) { ... }
 */
export function useFlag(name: string): boolean {
  const { data } = useFeatureFlags();
  return data?.includes(name) ?? false;
}
