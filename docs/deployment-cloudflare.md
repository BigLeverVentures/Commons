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
