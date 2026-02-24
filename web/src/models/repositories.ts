import { signal, createModel } from "@preact/signals";
import {
  listRepositories,
  addRepository,
  removeRepository,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  listPackages,
  getPackageEvolutions,
  deletePackage,
  type Repository,
  type ApiKey,
  type Package,
  type PackageEvolution,
} from "../lib/api";

export const RepositoriesModel = createModel(() => {
  // ── Repository list ──────────────────────────────────────────────────────
  const repositories = signal<Repository[]>([]);
  const reposLoading = signal(false);
  const reposError = signal<string | null>(null);

  const fetchRepositories = async () => {
    reposLoading.value = true;
    reposError.value = null;
    try {
      repositories.value = await listRepositories();
    } catch (err) {
      reposError.value = err instanceof Error ? err.message : "Failed to load repositories";
    } finally {
      reposLoading.value = false;
    }
  };

  const addRepo = async (owner: string, name: string) => {
    const repo = await addRepository(owner, name);
    repositories.value = [repo, ...repositories.value];
    return repo;
  };

  const removeRepo = async (id: string) => {
    await removeRepository(id);
    repositories.value = repositories.value.filter((r) => r.id !== id);
  };

  // ── API Keys ─────────────────────────────────────────────────────────────
  const apiKeys = signal<ApiKey[]>([]);
  const apiKeysLoading = signal(false);
  const apiKeysError = signal<string | null>(null);
  /** The newly-created key value shown once after creation. */
  const newKeyValue = signal<string | null>(null);

  const fetchApiKeys = async (repoId: string) => {
    apiKeysLoading.value = true;
    apiKeysError.value = null;
    try {
      apiKeys.value = await listApiKeys(repoId);
    } catch (err) {
      apiKeysError.value = err instanceof Error ? err.message : "Failed to load API keys";
    } finally {
      apiKeysLoading.value = false;
    }
  };

  const addApiKey = async (repoId: string, name: string) => {
    const key = await createApiKey(repoId, name);
    // Persist the secret for the one-time display; strip it before storing in the list
    newKeyValue.value = key.key ?? null;
    apiKeys.value = [{ ...key, key: undefined }, ...apiKeys.value];
    return key;
  };

  const removeApiKey = async (repoId: string, keyId: string) => {
    await deleteApiKey(repoId, keyId);
    apiKeys.value = apiKeys.value.filter((k) => k.id !== keyId);
  };

  // ── Packages ─────────────────────────────────────────────────────────────
  const packages = signal<Package[]>([]);
  const packagesLoading = signal(false);
  const packagesError = signal<string | null>(null);

  const fetchPackages = async (repoId: string) => {
    packagesLoading.value = true;
    packagesError.value = null;
    try {
      packages.value = await listPackages(repoId);
    } catch (err) {
      packagesError.value = err instanceof Error ? err.message : "Failed to load packages";
    } finally {
      packagesLoading.value = false;
    }
  };

  const removePackage = async (repoId: string, packageId: string) => {
    await deletePackage(repoId, packageId);
    packages.value = packages.value.filter((p) => p.id !== packageId);
  };

  // ── Evolutions ───────────────────────────────────────────────────────────
  const evolutions = signal<PackageEvolution[]>([]);
  const evolutionsLoading = signal(false);
  const evolutionsError = signal<string | null>(null);
  const selectedPackage = signal<Package | null>(null);

  const fetchEvolutions = async (repoId: string, packageId: string) => {
    evolutionsLoading.value = true;
    evolutionsError.value = null;
    try {
      const res = await getPackageEvolutions(repoId, packageId);
      selectedPackage.value = res.package;
      evolutions.value = res.evolutions;
    } catch (err) {
      evolutionsError.value = err instanceof Error ? err.message : "Failed to load evolutions";
    } finally {
      evolutionsLoading.value = false;
    }
  };

  return {
    repositories,
    reposLoading,
    reposError,
    fetchRepositories,
    addRepo,
    removeRepo,

    apiKeys,
    apiKeysLoading,
    apiKeysError,
    newKeyValue,
    fetchApiKeys,
    addApiKey,
    removeApiKey,

    packages,
    packagesLoading,
    packagesError,
    fetchPackages,
    removePackage,

    evolutions,
    evolutionsLoading,
    evolutionsError,
    selectedPackage,
    fetchEvolutions,
  };
});
