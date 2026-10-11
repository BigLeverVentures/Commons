# Configuration

## Public community identity

Edit [`src/config/community.ts`](../src/config/community.ts), then rebuild. `COMMUNITY` is imported into browser code: put only public presentation values here, never keys, passwords, private membership information, or internal URLs.

| Field | Default / purpose |
| --- | --- |
| `name`, `wordmark` | Commons / commons; displayed identity |
| `memberSingular`, `memberPlural` | member / members; participation labels |
| `heroHeadline` | Landing headline |
| `canonicalOrigin` | `https://commons.example.org`; replace with your HTTPS origin |
| `supportEmail` | `support@example.org`; replace with a monitored contact |
| `operatorName` | Your community; responsible operator attribution |
| `directoryUrlPrefix` | `null`; optional trusted directory prefix, reviewed before enabling |
| `cohortsEnabled` | `false`; optional cohort display |
| `topics` | Labels/descriptions keyed by existing topic IDs |

Keep topic IDs `planet`, `enterprise`, `learning`, `care`, `technology`, and `open`: they are persisted database values. Renaming labels is presentation customization; changing identifiers requires coordinated schema/data migration and application updates. Topic inference tags and colors are in `src/lib/topics.ts`. Cohort definitions are in `src/lib/cohorts.ts`; enabling cohort display does not import a private directory or admit members.

Review `src/app/faq/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, authentication templates, and artwork for your actual operator practices. The FAQ uses the configured community identity and support address; adapt its admission instructions to your actual membership process. Identity configuration does not make policy statements accurate automatically. Publish only contact details you intend to expose.

Regenerate the static home share image after changing name, origin, or headline:

```sh
node scripts/render-home-share.mjs
```

This writes `public/images/commons-share.png` from the public config and bundled artwork/fonts. Commit that output with your branding changes. The per-post share image route reads the config directly. Supabase hosted email templates are separate HTML: customize their displayed community name and support contact and paste them into the hosted dashboard; they do not import the application config.

## Environment

Use `.env.local` for local work and the host's secret store for production. `.env.example` contains safe examples, not working credentials.

| Variable | Exposure and requirement |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public, available at build time; your Supabase endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public, available at build time; access still governed by RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret; required for cleanup and privileged background work; bypasses RLS |
| `APP_URL` | Server configuration; canonical HTTPS origin for scheduled requests and mail links |
| `CRON_SECRET` | Server/scheduler secret; Bearer authorization for job POSTs |
| `COMMONS_LOCAL_PREVIEW` | `true` enables fictional local preview; leave unset/false in production |
| `COMMONS_NOTIFICATIONS_ENABLED` | `true` enables Cloudflare scheduled notification dispatch; cleanup is independent |
| `RESEND_API_KEY` | Optional server secret for notification delivery |
| `EMAIL_FROM` | Optional verified Resend sender identity |
| `CLOUDFLARE_WORKER_NAME` | Cloudflare build/deploy configuration; choose your own Worker name |
| `CLOUDFLARE_DOMAINS` | Cloudflare build/deploy configuration; comma-separated domains you control |

On Node, notification scheduling is configured by your external scheduler; the Cloudflare notification flag does not configure that scheduler. Never place the service-role key or cron/email secrets in a `NEXT_PUBLIC_` variable. Keep `APP_URL` aligned with `canonicalOrigin` and Supabase Auth settings.

## Avatars and assets

The picker offers 48 bundled local SVG portraits (`peep-1` through `peep-48`) generated with DiceBear 10.6.0's Open Peeps style. Open Peeps by Pablo Stanley is CC0; DiceBear's generator is MIT. No avatar network API is needed. IDs are stored in member profiles. Retain existing IDs and files when changing gallery order or labels.

To add choices beyond 48, update SVG files and reproduction metadata in `public/avatars/collection.json`, picker definitions in `src/lib/profile-presence.ts`, and add a migration updating the database avatar constraint. Updating only the UI will make saves fail. Consult [`public/avatars/README.md`](../public/avatars/README.md) for original generation notes.

Fonts and the PDF renderer are bundled locally. Preserve their license files and [third-party notices](../THIRD_PARTY_NOTICES.md). A courtesy footer credit may be changed or removed under MIT; required license notices are separate. Confirm decorative artwork redistribution rights before a public release.

## Optional directory adapter

A fresh installation has empty private directory tables and `directoryUrlPrefix: null`. Neither a directory provider nor a member admission list is bundled. Enabling a trusted HTTPS link prefix allows outgoing directory links; it does not fetch records, establish consent, or authorize an import.

The optional [`scripts/import-directory.mjs`](../scripts/import-directory.mjs) accepts a normalized JSON array or a SQLite database with a `fellows` table. Prepare this mapping from your own authorized source:

| Normalized input | Source mapping and effect |
| --- | --- |
| `record_id` | Stable source identifier; upsert key in private `directory_profiles` |
| `name` | Display name, trimmed and limited to 200 characters |
| `contact_email` | Verified admission address, trimmed/lowercased; required and unique |
| `bio_tagline` | Optional description text |
| `extra_json.skills_to_give`, `extra_json.industries` | Optional text joined into description, limited to 2,000 characters |
| `search_tags` | String array or comma/semicolon/pipe-separated string; lowercased, limited to 50 entries |

The SQLite adapter selects exactly these columns; other schemas need a conversion to normalized JSON first. Reject duplicate source IDs/emails before applying. No original provider endpoint or export is required. Example fictional JSON:

```json
[{"record_id":"member-001","name":"Morgan Rivera","contact_email":"morgan@example.test","bio_tagline":"Community gardens","search_tags":["ecology","restoration"],"extra_json":{"skills_to_give":"Mentoring"}}]
```

Keep authorized input and generated SQL in ignored `.private/` storage with restricted access:

```sh
mkdir -p .private
node scripts/import-directory.mjs .private/members.json .private/import.sql
```

The output is created exclusively with mode `0600`; an existing output path is rejected. Inspect the generated transaction and apply it only through your own administrator connection to the intended staging project. It upserts private matching records **and adds every imported email to the signup admission allowlist**. It does not remove obsolete records/admissions, revoke existing accounts, import cohorts, set directory source URLs, or populate the separate mention/credit identity tables. Do not run it merely to preview matching.

Outgoing matching links require an administrator to set each private `directory_profiles.source_url` to an approved destination. Public mention/credit identity search separately reads `fellow_identities` through the authenticated server; maintain `display_name`, optional cohort, `directory_url`, and `active`, and use `fellow_directory_sources(provider, source_record_id, fellow_identity_id)` to retain stable provenance. Review these identities for intended disclosure before importing; their names/cohorts may become public when credited or mentioned, while admission emails remain separate. There is no automatic identity synchronization job.

For category mapping, retain the six stored topic IDs. First inventory source skills/categories, then map source values to the known inference tags in `src/lib/topics.ts` or an explicit supported post topic. Document unmapped values and use Open possibilities when uncertain. The matching index uses descriptive words/tags for candidate suggestions; it does not automatically assign a person's interests or change their saved profile. Have members choose their interests, and validate the mapping with a small consenting staging sample before a wider import. Preserve source IDs and record mapping changes so updates can be reconciled without guessing identities.
