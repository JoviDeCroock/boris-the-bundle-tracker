import { API_BASE_URL } from "./constants";

// ── Shared fetch helper ───────────────────────────────────────────────────────

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error((error as { error?: string }).error || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ── Subscription ──────────────────────────────────────────────────────────────

export interface SubscriptionResponse {
  plan: "free" | "pro";
  limits: Record<string, unknown>;
}

export async function getSubscription(): Promise<SubscriptionResponse> {
  return fetchApi<SubscriptionResponse>("/api/v1/subscription");
}

// ── Repositories ──────────────────────────────────────────────────────────────

export interface Repository {
  id: string;
  name: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export async function listRepositories(): Promise<Repository[]> {
  const res = await fetchApi<{ repositories: Repository[] }>("/api/v1/repositories");
  return res.repositories;
}

export async function addRepository(owner: string, name: string): Promise<Repository> {
  const res = await fetchApi<{ repository: Repository }>("/api/v1/repositories", {
    method: "POST",
    body: JSON.stringify({ owner, name }),
  });
  return res.repository;
}

export async function removeRepository(id: string): Promise<void> {
  await fetchApi(`/api/v1/repositories/${id}`, { method: "DELETE" });
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  /** Only present in the creation response. */
  key?: string;
}

export async function listApiKeys(repoId: string): Promise<ApiKey[]> {
  const res = await fetchApi<{ apiKeys: ApiKey[] }>(`/api/v1/repositories/${repoId}/api-keys`);
  return res.apiKeys;
}

export async function createApiKey(repoId: string, name: string): Promise<ApiKey> {
  const res = await fetchApi<{ apiKey: ApiKey }>(`/api/v1/repositories/${repoId}/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.apiKey;
}

export async function deleteApiKey(repoId: string, keyId: string): Promise<void> {
  await fetchApi(`/api/v1/repositories/${repoId}/api-keys/${keyId}`, { method: "DELETE" });
}

// ── Packages ──────────────────────────────────────────────────────────────────

export interface Package {
  id: string;
  repositoryId: string;
  name: string;
  path: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PackageEvolution {
  id: string;
  packageId: string;
  prNumber: number;
  prTitle: string | null;
  branch: string;
  commitSha: string;
  prMerged: boolean;
  prState: "open" | "closed";
  exportPath: string;
  fileName: string;
  mainSize: number;
  prSize: number;
  gzipMainSize: number | null;
  gzipPrSize: number | null;
  brotliMainSize: number | null;
  brotliPrSize: number | null;
  reportedAt: string;
}

export async function listPackages(repoId: string): Promise<Package[]> {
  const res = await fetchApi<{ packages: Package[] }>(`/api/v1/repositories/${repoId}/packages`);
  return res.packages;
}

export async function getPackageEvolutions(
  repoId: string,
  packageId: string,
): Promise<{ package: Package; evolutions: PackageEvolution[] }> {
  return fetchApi(`/api/v1/repositories/${repoId}/packages/${packageId}/evolutions`);
}

export async function deletePackage(repoId: string, packageId: string): Promise<void> {
  await fetchApi(`/api/v1/repositories/${repoId}/packages/${packageId}`, { method: "DELETE" });
}

export async function updateEvolution(
  repoId: string,
  packageId: string,
  prNumber: number,
  data: { prMerged?: boolean; prState?: string },
): Promise<void> {
  await fetchApi(`/api/v1/repositories/${repoId}/packages/${packageId}/evolutions/${prNumber}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
