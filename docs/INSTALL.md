# Install Commons

These instructions target a new isolated installation. Use the standard Node deployment first. You need Node.js 22.13+, npm, a Supabase project, a domain with HTTPS, and SMTP for real sign-in emails. Optional application notifications use Resend separately.

## 1. Install and preview

Extract the source package, or clone the repository you obtained it from. Enter the directory containing `package.json`:

```sh
node --version
npm --version
npm ci
npm run preview
```

Open http://127.0.0.1:3100 and verify fictional content loads. Stop preview before building. ZIP installation does not require Git. The public release seed is empty; preview data does not populate Supabase.

## 2. Bootstrap Supabase

Create a new Supabase project you control. Save its project reference and database password privately. From the Commons root, use the CLI installed by `npm ci`:

```sh
npx --no-install supabase --version
npx --no-install supabase login
npx --no-install supabase link --project-ref YOUR_PROJECT_REF
npx --no-install supabase migration list
npx --no-install supabase db push --dry-run
npx --no-install supabase db push
npx --no-install supabase migration list
```

Replace `YOUR_PROJECT_REF`; enter the database password when prompted. Login authenticates the CLI; linking selects the target project. Confirm the project before applying. The existing `supabase/config.toml` means you do not need `supabase init`. The CLI applies pending files from `supabase/migrations` in timestamp order and tracks their history. The final listing should have matching local and remote migrations. See [the Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push) for login, linking, migration listing, and dry-run behavior.

This is the documented CLI bootstrap, not a claim that a fresh hosted deployment has been tested. If any migration fails, stop, retain its exact error, and repair the cause on your isolated project. Do not skip failed migrations, relax RLS, or use `db reset` against production. Do not run test databases or migration experiments against live member data.

In Supabase's SQL editor, confirm `public.fellows`, `public.posts`, `public.responses`, `public.public_posts`, `public.notification_outbox`, and `public.storage_cleanup` exist. Confirm the `profile-photos` and `post-attachments` storage buckets exist and are public. The migration chain installs RLS, grants, and the `before_fellow_signup` database trigger on `auth.users`.

Add an email you control and each verified member through an administrator connection:

```sql
INSERT INTO public.auth_email_allowlist (email)
VALUES (lower(trim('member@example.org')))
ON CONFLICT (email) DO NOTHING;
```

Replace the example address. Keep the legacy Supabase **Before User Created** Auth hook disabled: the installed trigger is a PostgreSQL trigger, not a JSON Auth hook. Removing admission later does not revoke an existing account; see [operations](operations.md).

## 3. Set application configuration

```sh
cp .env.example .env.local
```

Fill `.env.local` using your own project URL and public anon key. Set `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, and a random `CRON_SECRET` for background cleanup. For example, generate a secret locally with `openssl rand -hex 32`, then save it in your host and scheduler secret stores. Do not publish its output or commit the environment file.

Update `src/config/community.ts` for your community. Set the same canonical HTTPS origin in `COMMUNITY.canonicalOrigin`, `APP_URL`, Supabase Site URL, and your hosting configuration. See [configuration](configuration.md) for all fields and optional settings. Production must have `COMMONS_LOCAL_PREVIEW` unset or false.

## 4. Configure sign-in mail

In hosted Supabase Auth settings, enable email sign-in. Set Site URL to your origin and allow its `/auth/confirm` URL. For development, allow the matching `http://127.0.0.1:3000/auth/confirm` explicitly and use that hostname consistently. Avoid broad production callback wildcards.

Configure custom SMTP for production. Supabase's default email service is restricted and intended for testing; see [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Follow your provider's current SMTP instructions, verify your sending domain, and disable link tracking for authentication emails. Preserve unrelated DNS mail records.

Copy [`supabase/templates/sign-in.html`](../supabase/templates/sign-in.html) into **both Magic Link and Confirm Signup** email templates in the hosted dashboard. Editing the file alone does not update hosted templates. Preserve the dynamic token-hash link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email">Sign in</a>
```

Replace the displayed Commons name, support contact, and subject with your community’s values before installing both templates. The source-project footer credit is optional and does not identify your administrator. Never paste a received one-time link into the template. `/auth/confirm` first opens a passive page. Pressing Sign in submits a same-origin POST that verifies `token_hash` with `type=email`, sets session cookies, and redirects to `/board`. GET/HEAD email previews do not verify the token. Preserve the direct TokenHash URL above in both hosted templates; a provider ConfirmationURL can consume the token before this page. Open the link in the browser you intend to use; other browser apps have separate cookie stores. SMTP sign-in mail and optional Resend notification mail are independent.

## 5. Build and serve

Run these commands sequentially with build-time public variables set:

```sh
npm run lint
npm test
npm run build
npx --no-install tsc --noEmit
npm start
```

The default port is 3000. Use your host's persistent Node service and HTTPS reverse proxy, and provision runtime secrets before admitting members. Install development dependencies during the build stage. Rebuild when public values or static community configuration change. Configure an authenticated POST scheduler for storage cleanup as described in [operations](operations.md); it is required even if notification emails are disabled. [Cloudflare](deployment-cloudflare.md) is an optional deployment route.

## 6. Accept your installation

Use two consenting test members and an unlisted email you control. Record the deployment URL and results.

1. Signed out: read the board and a public post; confirm private introductions and emails are absent.
2. Admitted sign-in: receive the email, reach the correct callback hostname, save a profile, and keep a session after leaving and returning in the same browser.
3. Unlisted sign-in: verify admission is denied and no unauthorized Auth account is created.
4. Publish an ask, offer, and project. Verify search, filters, outcome display, and narrow-screen/light/dark layouts.
5. Send a private introduction with the second member. Confirm it is visible only to permitted participants, and test reactions independently.
6. Upload, replace, and remove a photo and attachment; delete an owned test post. Confirm scheduled cleanup removes retired files and preserves unrelated files.
7. If notifications are enabled: verify inbox delivery, Reply-To, and opt-out. Provider acceptance alone does not prove inbox delivery.
8. Confirm support links, policy text, canonical redirects, scheduler logs, and an isolated backup restore.

Delete test posts through their owner accounts, remove test uploads, allow cleanup to drain, then retire test accounts using the operations procedure. Do not delete production members as test teardown.

## Troubleshooting

| Symptom | Next check |
| --- | --- |
| Install fails | Node version, correct project directory, registry connectivity, first meaningful error; keep the lockfile |
| Missing Supabase settings | Both public variables must exist before build; rebuild with the host's build environment |
| No sign-in email | Admission row, SMTP/domain verification, rate limits, provider logs, spam folder |
| Wrong callback hostname | Site URL, allowed redirect URLs, template variables, canonical origin |
| Expired or used link | Request a new link; avoid forwarding or link-tracking rewrites |
| Returning browser signs out | Same browser and hostname, cookies, session settings, callback errors |
| Upload rejected | Applied bucket migrations, ownership path, RLS, session, 2 MiB size/type limits |
| Retired files remain | Cleanup authorization, service-role key, scheduler and private queue errors |
| Notification missing | Separate Resend API configuration, sender verification, preferences, job logs and outbox |
| Search result missing | Active filters, supplied public posts, indexed words; see discovery guide |
