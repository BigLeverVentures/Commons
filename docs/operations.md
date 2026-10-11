# Operate Commons

## Public and private data

Published posts and associated author information are public. Both storage buckets are public: profile photos and post attachments can be accessed by anyone with their object URL. RLS controls database operations and ownership of uploads; it does not make public asset URLs confidential. The upload limits are 2 MiB, with JPEG/PNG/WebP for photos and those formats plus PDF for attachments. Do not upload sensitive material.

Private introductions are restricted to authorized participants; administrators and service-role jobs can access records necessary to run the service. Introduction notifications share the sender's verified reply email with the recipient. Signed-in member access can expose more profile data than public views. Review actual RLS and projections before promising a narrower privacy boundary. Email copies, downloaded files, caches, and provider backups can outlive deletion in the application.

Deleting a profile through the UI is not deleting its Auth account. Review the UI confirmation and your policy for the distinction between profile removal, post deletion, and account erasure. Removing an allowlist address also does not revoke an existing account.

## Mandatory file cleanup

On a Node host schedule this authenticated **POST** every five minutes, storing both values in the scheduler's secret store:

```sh
curl --fail-with-body --request POST \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL}/api/jobs/storage-cleanup"
```

This shell example assumes `CRON_SECRET` and `APP_URL` are securely set for the scheduled process. Do not put the resolved secret in a crontab, issue, or screenshot. The application needs `SUPABASE_SERVICE_ROLE_KEY`. Unauthorized jobs return 401; missing job configuration returns 503. Alert on failures or a queue that does not drain.

Cleanup is required independently of notification email: database reference retirement can finish before physical storage removal. The private `public.storage_cleanup` table retains retry state and completed tombstones. Inspect it only as an administrator:

```sql
SELECT bucket, attempts, next_attempt_at, last_error
FROM public.storage_cleanup
WHERE completed_at IS NULL
ORDER BY next_attempt_at;
```

Fix credential/provider failures and let the scheduler retry. Do not reuse retired object paths, clear tombstones casually, or manually delete arbitrary objects based on an untrusted URL. Verify an upload/replace/remove flow removes retired objects and leaves other members' objects intact.

Cloudflare's bundled five-minute scheduled handler dispatches cleanup automatically once deployed with bindings. Avoid adding a duplicate external scheduler to that route. Verify actual trigger execution and endpoint success in deployed logs.

## Optional notification mail

Set server-only `RESEND_API_KEY`, a verified `EMAIL_FROM`, `APP_URL`, service-role key, and cron secret. On Node, schedule authenticated POSTs to `/api/jobs/notifications` using the same header pattern. On Cloudflare, set `COMMONS_NOTIFICATIONS_ENABLED=true` at build/deploy time to include notification dispatch and bindings.

Before enabling delivery, inspect pending `public.notification_outbox` records administratively; remove or cancel fictional/historical test work through a reviewed maintenance procedure. Run a controlled introduction between consenting members. Confirm inbox receipt, verified Reply-To, profile opt-out, and retry behavior. Inspect `delivered_at`, `cancelled_at`, `attempts`, `next_attempt_at`, and `last_error`; avoid copying recipient details or notes into public logs. Provider idempotency is not an unlimited guarantee against duplicates. Auth sign-in SMTP remains necessary even when application notification delivery is off.

## Admission and account revocation

To deny future account creation, remove the normalized email from `public.auth_email_allowlist` using an administrator connection. This affects the signup trigger only. Existing Auth accounts and already-issued sessions remain a separate responsibility.

For an existing member, first decide whether the request is a temporary suspension or permanent erasure and preserve only data you are entitled to retain. Use Supabase's authenticated administrator controls to ban the account and revoke refresh sessions according to its current Auth interface. Confirm the ban and refresh-token behavior with that account on staging. Already-issued access JWTs may remain valid until expiry; do not claim immediate revocation from removing an admission row or signing out one browser. If immediate containment is required, restrict application access while the account/session issue is resolved.

For permanent erasure, inventory the member's posts, profile, introduction records, reactions, queued emails, and both buckets before deleting the Auth user through administrator controls. Database foreign keys can cascade deletion: Auth users own fellow rows, and fellow rows own posts. Retire public files through supported application deletion flows first and drain cleanup. Verify the final database and storage state rather than assuming Auth deletion removes files. The application does not provide a complete administrator account-erasure workflow. Inform the member about copies already delivered to others and provider backup retention. Test all administrative procedures with disposable accounts before using them on member data.

## Backups and restore

Back up database records and uploaded objects separately, store encrypted copies with restricted access, and record retention and deletion policies. Supabase database backups do not contain the uploaded Storage objects; see [Supabase backups](https://supabase.com/docs/guides/platform/backups). Export both `profile-photos` and `post-attachments` objects with their exact paths using an authenticated Storage client or your provider's supported export process.

For a CLI database archive on the linked project:

```sh
npx --no-install supabase db dump --linked -f backup-schema.sql
npx --no-install supabase db dump --linked --data-only --use-copy -f backup-data.sql
```

Treat these files as sensitive. The CLI dump has provider-managed schema exclusions; it is not a complete Auth/Storage disaster-recovery archive. Use your project's supported provider backup/restore route for managed Auth and Storage metadata, and record its plan-specific availability. Document the object export inventory and checksums alongside the database backup. Do not assume a generic SQL dump restores managed accounts or sessions.

Rehearse recovery into an isolated project: restore compatible schema/data through the provider-supported procedure, restore bucket objects to their original paths, provision new secrets and SMTP, point an isolated application at it, then verify sign-in, ownership, public/private boundaries, file access, and cleanup. Preserve member UUIDs and object paths. A backup is not proven until this rehearsal succeeds. Do not restore over production as a drill.

## Upgrade and rollback

Pin the source release and lockfile. Read its changes and migration notes, take verified backups, apply pending migrations in filename order, deploy compatible application code, then repeat sign-in, privacy, upload, and job smoke checks. Do not edit migration files already applied to a shared database. Rolling code back does not undo SQL; verify schema compatibility or restore through your rehearsed recovery route. Drain any real-device verification queue before an archive or mobile distribution build if your deployment adds such a client.

Monitor job errors, SMTP/Resend failures, storage usage, database backup health, and support requests. Rotate exposed keys and cron secrets, update both host and scheduler, and verify the old cron secret is rejected. Keep logs useful without storing one-time links, cookies, or private messages.
