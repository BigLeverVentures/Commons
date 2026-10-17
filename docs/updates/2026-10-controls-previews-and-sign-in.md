# October 2026: controls, previews and sign-in

Topic, project-state, sharing-destination and profile cohort menus use compact themed controls with keyboard navigation and touch-sized targets. Cohorts remain optional and disabled by default.

Recent-invitation headings use up to 40 characters on phone widths and 80 on wider screens, shortening at word boundaries where practical. Narrow windows can shorten them further. Complete text remains on the post and in the accessible name. Authors see both lengths while editing. Actions such as Explore project and Explore offer keep their arrow on the same line; the redundant author intent label is removed.

Website previews now fill a uniform 2:1 window, top aligned, with a maximum height of 600 CSS pixels. This **supersedes whole-image fitting** from the earlier [browsing update](2026-10-browsing-and-help.md): images with other proportions can be cropped. Screenshot fallback captures the initial 720 × 360 CSS-pixel viewport at 2× density, without full-page capture or image-specific cropping. Social preview images still take priority. Existing stored captures are not automatically regenerated, but the display frame changes immediately after redeployment. PDF previews show a full-width glimpse of the first page in an 8:5 window with a PDF badge; open the document to read it in full.

Signed-out navigation offers Sign in on desktop and as the final separated mobile-menu entry. Magic links open a passive confirmation page; only pressing Sign in submits the same-origin verification POST. GET/HEAD previews do not consume the one-use token. This mitigates ordinary email prefetch, not scanners that submit forms. See [Supabase's email-prefetch guidance](https://supabase.com/docs/guides/auth/auth-email-templates#email-prefetching). Admission and private introductions are unchanged. Search indexing is deferred until the first nonempty query; browsing avoids that allocation.

## Upgrade

No database migrations, dependencies or binary assets change. Keep your existing community configuration and secrets, run `npm ci`, checks and builds, then redeploy using [INSTALL](../INSTALL.md) or the optional [Cloudflare guide](../deployment-cloudflare.md).

Update the hosted **Magic Link and Confirm Signup** templates using the checked-in sign-in template, retaining your own name, support address and direct `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email` link. Do not use a provider verification link that consumes the token before this page. Editing a local HTML file alone does not update hosted templates. Review SMTP link tracking and open the newest message in the intended browser.

Cloudflare invocation diagnostics now persist with query strings redacted and traces disabled. Review retention, sampling and your privacy policy. `COMMONS_WORKER_CPU_MS` is an optional build-time setting for Paid Workers; leaving it empty preserves the account's default limit. For a server-rendered deployment, use Workers Paid and consider `1000` for one second of CPU headroom per invocation. Free's 10 ms limit can be too tight even with few members. This setting does not purchase a plan or cap elapsed network waiting time. Rebuild adapter output after changing it.

## Acceptance

Check guest/member navigation and menus on mobile and desktop, both themes, keyboard selection/dismissal and saved form values. Check long invitation previews, a non-2:1 website image and a PDF. For a hosted deployment, receive a fresh real magic link, verify that previews do not consume it, press Sign in, and confirm a session in the intended browser. Inspect Worker CPU/error metrics and redacted invocation logs. Local builds and mocked auth checks do not replace these deployment-specific checks.
