# Optional Cloudflare deployment

The primary installation path is Node/Next.js. This alternative uses vinext, the Cloudflare Vite plugin, and the pinned beta `cf` CLI. Successful local adapter output is not proof of deployed Auth, scheduled jobs, or privacy behavior. Validate on a staging Worker before moving a real community.

Complete the Supabase, SMTP, community identity, and environment setup in [INSTALL.md](INSTALL.md). Use a Cloudflare account and DNS domains you control. Keep staging and production projects, Worker names, domains, and secrets separate.

## Configure and build

Set the two public Supabase variables, your HTTPS `APP_URL`, `CLOUDFLARE_WORKER_NAME`, and comma-separated `CLOUDFLARE_DOMAINS` in the build environment. For example, with a domain you own:

```dotenv
APP_URL=https://board.example.org
CLOUDFLARE_WORKER_NAME=my-community-board
CLOUDFLARE_DOMAINS=board.example.org,www.board.example.org
COMMONS_NOTIFICATIONS_ENABLED=false
# Optional CPU cap; only set after enabling Workers Paid.
COMMONS_WORKER_CPU_MS=1000
```

Replace the examples. Align `COMMUNITY.canonicalOrigin` and Supabase Site URL with `APP_URL`. `cloudflare.config.ts` declares bindings and a `*/5 * * * *` trigger. `src/worker.ts` contains fetch and scheduled handlers. Do not copy another operator's domains or deploy placeholder domains.

```sh
npm run lint
npm test
npm run build
npx --no-install tsc --noEmit
npm run build:vinext
npm run start:vinext
```

Stop the local preview before deployment. Adapter preview is for local inspection; complete the real acceptance checklist at the HTTPS domain after deploying.

## Authenticate and deploy

Use the installed CLI; do not initialize over this existing project:

```sh
npx --no-install cf auth login
npx --no-install cf deploy --help
npm run deploy:vinext
```

The deploy script uses `cf deploy --prebuilt --mode production`, so rebuild adapter output after configuration changes. Verify the target account and Worker name before deploying. The pinned CLI README documents authentication and prebuilt deployment; see [Cloudflare cf](https://github.com/cloudflare/cf).

Provision `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` as Worker secrets, with `RESEND_API_KEY` and `EMAIL_FROM` if notifications are enabled. Use the deployer's secret prompts when offered, or the Cloudflare dashboard's Worker **Settings → Variables and Secrets** controls; use encrypted Secret values for privileged credentials. Never commit them or place them in text bindings. Ensure all required secrets exist before exposing the Worker to members. If setting secrets after an initial deployment, keep access restricted until provisioning and smoke checks finish.

## Validate the deployed Worker

1. Confirm the custom domains and HTTPS certificate are active and the canonical origin is correct. Test an alternate hostname redirect with path and query preserved.
2. Receive a magic link and verify its token-hash callback/session on the deployed hostname.
3. Verify public posts and public assets while signed out; verify private introductions are inaccessible to unrelated accounts.
4. Observe an actual five-minute scheduled event. Confirm cleanup POST success and retired-object removal, not merely that the trigger appears in configuration.
5. Keep notifications disabled until pending outbox work and sender identity are reviewed. If enabled, test receipt, Reply-To, and opt-out.
6. Confirm logs, backups, support contact, and policy describe this deployment.

The Worker scheduler calls its own authenticated endpoints using `APP_URL` and `CRON_SECRET`. Cleanup remains active when notifications are disabled. An unreachable origin, missing secret, or failed service-role connection makes scheduled dispatch ineffective. Do not add duplicate external schedules without deliberately replacing the bundled trigger. Confirm compatibility before switching between Node and vinext builds.

## CPU limits and diagnostics

Server rendering can exceed Workers Free's 10 ms CPU allowance even at low traffic, producing error 1102. Use Workers Paid for adequate headroom; the example above sets an explicit 1000 ms CPU budget. Leave `COMMONS_WORKER_CPU_MS` empty to retain your account default. Valid explicit values are whole milliseconds from 1 through 300000, subject to your plan. The setting does not subscribe you to a plan or change billing by itself. See [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/) and [pricing](https://developers.cloudflare.com/workers/platform/pricing/).

Invocation logs are enabled with full sampling, query-string redaction and traces disabled. After deploying, confirm the live CPU limit and redaction settings, check CPU/error metrics, and review sampling/retention as traffic grows. Avoid adding console output containing tokens, headers, emails or request bodies. Older incidents cannot be reconstructed if logs were disabled at the time.
