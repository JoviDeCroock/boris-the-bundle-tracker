# Boris — API Reference

Base URL (production): `https://api.example.com`
Base URL (local dev): `http://localhost:8787`

---

## Authentication

### Session endpoints

Session-protected endpoints (`/api/v1/*`) require a valid session cookie obtained via BetterAuth. In the browser the frontend handles this transparently; for scripted access use the sign-in endpoint first and pass the returned cookie.

### API key authentication

The bundle-size report endpoint (`POST /api/report`) does **not** use sessions. Instead, pass the API key as a Bearer token:

```
Authorization: Bearer bbt_<key>
```

API keys are scoped to a single repository; the key must match the repository identified in the request body.

---

## Repositories

### List repositories

```
GET /api/v1/repositories
```

**Response 200**

```json
{
  "repositories": [
    {
      "id": "uuid",
      "owner": "acme",
      "name": "my-app",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Link a repository

```
POST /api/v1/repositories
Content-Type: application/json
```

**Body**

```json
{ "owner": "acme", "name": "my-app" }
```

Both fields must be valid GitHub identifiers (alphanumeric, `-`, `_`, `.`).

**Response 201**

```json
{ "repository": { "id": "uuid", "owner": "acme", "name": "my-app", ... } }
```

**Errors**

| Status | Reason                                    |
| ------ | ----------------------------------------- |
| 400    | Missing or invalid fields                 |
| 409    | Repository already linked to your account |

---

### Unlink a repository

```
DELETE /api/v1/repositories/:id
```

Removes the link between the authenticated user and the repository. The repository record (and all its packages/evolutions) is preserved; other users who linked the same repository are unaffected.

**Response 200**

```json
{ "success": true }
```

---

## API Keys

### List API keys

```
GET /api/v1/repositories/:repoId/api-keys
```

Returns metadata only — the secret key value is never returned after creation.

**Response 200**

```json
{
  "apiKeys": [
    {
      "id": "uuid",
      "name": "CI",
      "keyPrefix": "bbt_a1b2c3…",
      "createdAt": "...",
      "lastUsedAt": "..."
    }
  ]
}
```

---

### Create an API key

```
POST /api/v1/repositories/:repoId/api-keys
Content-Type: application/json
```

**Body**

```json
{ "name": "CI" }
```

**Response 201**

```json
{
  "apiKey": {
    "id": "uuid",
    "name": "CI",
    "keyPrefix": "bbt_a1b2c3…",
    "createdAt": "...",
    "lastUsedAt": null,
    "key": "bbt_a1b2c3d4e5f6..."
  }
}
```

> **Important**: `key` is included **once** in this response and is never returned again. Store it immediately as a GitHub Actions secret.

---

### Delete an API key

```
DELETE /api/v1/repositories/:repoId/api-keys/:keyId
```

**Response 200**

```json
{ "success": true }
```

---

## Packages

### List packages

```
GET /api/v1/repositories/:repoId/packages
```

**Response 200**

```json
{
  "packages": [
    {
      "id": "uuid",
      "repositoryId": "uuid",
      "name": "@acme/ui",
      "path": "packages/ui",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

### Get evolution history

```
GET /api/v1/repositories/:repoId/packages/:packageId/evolutions
```

Returns size records ordered by `reportedAt` descending (newest first).

**Response 200**

```json
{
  "package": { "id": "uuid", "name": "@acme/ui", ... },
  "evolutions": [
    {
      "id": "uuid",
      "packageId": "uuid",
      "prNumber": 42,
      "prTitle": "feat: add dark mode",
      "branch": "feat/dark-mode",
      "commitSha": "abc1234",
      "prMerged": false,
      "prState": "open",
      "exportPath": ".",
      "fileName": "dist/index.js",
      "mainSize": 10240,
      "prSize": 10850,
      "reportedAt": "..."
    }
  ]
}
```

---

### Delete a package

```
DELETE /api/v1/repositories/:repoId/packages/:packageId
```

Deletes the package record **and all its evolution records** (cascade). This cannot be undone.

**Response 200**

```json
{ "success": true }
```

---

## Bundle-size report

This endpoint is called by the **GitHub Action**. It is authenticated with a Bearer API key, not a session cookie.

```
POST /api/report
Authorization: Bearer bbt_<key>
Content-Type: application/json
```

### Body

```json
{
  "repository": "acme/my-app",
  "prNumber": 42,
  "prTitle": "feat: add dark mode",
  "branch": "feat/dark-mode",
  "commitSha": "abc1234def5678",
  "prMerged": false,
  "prState": "open",
  "packages": [
    {
      "name": "@acme/ui",
      "path": "packages/ui",
      "exports": [
        {
          "exportPath": ".",
          "files": [
            { "file": "dist/index.js", "mainSize": 10240, "prSize": 10850 },
            { "file": "dist/index.mjs", "mainSize": 9600, "prSize": 10100 }
          ]
        },
        {
          "exportPath": "./client",
          "files": [{ "file": "dist/client.js", "mainSize": 5120, "prSize": 5200 }]
        }
      ]
    }
  ]
}
```

| Field                                   | Type    | Required | Notes                                                |
| --------------------------------------- | ------- | -------- | ---------------------------------------------------- |
| `repository`                            | string  | yes      | `owner/name` matching the API key's repository       |
| `prNumber`                              | integer | yes      | GitHub pull request number                           |
| `prTitle`                               | string  | no       | Human-readable PR title                              |
| `branch`                                | string  | yes      | Feature branch name                                  |
| `commitSha`                             | string  | yes      | Full or short commit SHA                             |
| `prMerged`                              | boolean | no       | Whether GitHub marks the PR as merged at report time |
| `prState`                               | string  | no       | `open` or `closed` as reported by GitHub             |
| `packages[].name`                       | string  | yes      | Package name from `package.json`                     |
| `packages[].path`                       | string  | no       | Relative path in monorepo                            |
| `packages[].exports[].exportPath`       | string  | yes      | Export map key                                       |
| `packages[].exports[].files[].file`     | string  | yes      | Relative output file path                            |
| `packages[].exports[].files[].mainSize` | integer | yes      | Bytes on base branch                                 |
| `packages[].exports[].files[].prSize`   | integer | yes      | Bytes on PR branch                                   |

### Response 200

```json
{ "success": true, "recordsCreated": 6 }
```

### Errors

| Status | Reason                                              |
| ------ | --------------------------------------------------- |
| 400    | Missing required fields or invalid JSON             |
| 401    | Missing, malformed, or unknown API key              |
| 403    | API key does not belong to the specified repository |
