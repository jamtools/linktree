# Linktree

A Cloudflare Worker serving a public link directory and a KV-backed editor at `/admin/links`.

Known website links use [Font Awesome Free brand icons](https://fontawesome.com/)
(icons licensed under CC BY 4.0), bundled as inline SVGs. Icons inherit the
terminal colors and don't require third-party network requests. Other destinations
keep their numbered markers. Domain mappings live in `src/site-icons.ts`.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Local Wrangler storage is separate from production. Links and page settings are not copied automatically.

## Production automation

`.github/workflows/deploy.yml` checks pull requests and deploys pushes to `main`
or `vk/1cce-lt-basic-linktre`. Both branches target the same production Worker.
Once registered on the default branch, the workflow can also be run manually
on either deployment branch from GitHub Actions.

Repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Production defaults to **https://kochell.dev**. Override it with the GitHub Actions
repository variable `PRODUCTION_HOSTNAME` if needed. The hostname's zone must
already be active in the deployment Cloudflare account. Existing conflicting DNS
records or an existing Worker custom domain must be resolved before the first deployment.

Each deployment:

1. Type-checks, tests provisioning logic, and dry-runs the Worker bundle.
2. Looks up `linktree-production-links` in the account, creating it only if absent.
3. Generates `.wrangler/deploy/wrangler.json` with the real namespace binding.
4. Deploys `linktree-production` and provisions its custom domain through Wrangler.
5. Checks that the public page returns the link directory.

Deployments are serialized to avoid competing KV creation. The generated config
is ignored by Git; resource IDs are discovered from Cloudflare on each run.
Existing KV contents are preserved. No separate infrastructure state backend is needed.

The token needs Account **Workers Scripts: Edit**, **Workers KV Storage: Edit**,
and **Account Settings: Read**; Zone **Workers Routes: Edit**, **DNS: Edit**, and
**Zone: Read**, scoped to the deployment account and zone.

### Admin access (configured manually)

Configure Cloudflare Access for **`kochell.dev/admin/links`**, allowing your chosen
identities. The Worker itself does not authenticate admin requests. Until Access
is configured, anyone who reaches that route can change links and page settings.
Keep `/` public. The deployment disables `workers.dev` and version preview URLs
so they cannot provide alternative routes around the custom domain's Access policy.
Access applications and policies are managed manually and are not modified by CI.

### Run locally

With the same Cloudflare credentials exported:

```sh
pnpm run deploy:production
```

To validate without credentials or remote changes:

```sh
pnpm run check
pnpm test
pnpm run deploy:prepare --dry-run
pnpm exec wrangler deploy --config .wrangler/deploy/wrangler.json --dry-run
```

The staging Wrangler environment still contains a placeholder ID; automatic
infrastructure provisioning targets production only. The default environment
retains the separately configured KV binding from the original setup.
