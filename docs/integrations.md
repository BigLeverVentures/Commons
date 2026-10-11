# Integrations and data flows

| Component | Role | Data crossing the boundary |
| --- | --- | --- |
| Supabase | Email Auth, PostgreSQL, public file storage | Accounts, profiles, posts, private introductions, upload objects, operational queues |
| SMTP provider | Authentication mail configured in Supabase | Recipient email and one-time sign-in link |
| Resend API (optional) | Introduction and reminder notifications | Recipient email, post link/title, introduction note and verified Reply-To email when applicable |
| Microlink | Submitted website preview capture | Submitted website URL; returned preview metadata/image |
| Node host or Cloudflare | Application execution | Requests, cookies, operational logs and server-side calls |
| MiniSearch | Local public-post search | No hosted search service; public post fields only |
| DiceBear/Open Peeps | Bundled avatar generation | No runtime service or identifying seed |

Supabase's public key is safe to ship only with correct database policies. Server-side service-role access is privileged; protect it and audit its uses. Auth SMTP settings belong in hosted Supabase configuration; application Resend API settings belong in the application host. They do not enable one another.

Preview URLs are sent to Microlink by the preview implementation. External preview images can contact their image host from a visitor's browser. Do not submit private/intranet URLs or confidential query parameters for previewing. Preview failure should not be mistaken for loss of the underlying project link.

The fonts, avatar SVGs, and PDF.js browser renderer are included locally. Their code/artwork licenses are documented in [third-party notices](../THIRD_PARTY_NOTICES.md). Supabase, Resend, Microlink, and Cloudflare **hosted services** have separate account terms, pricing, retention, and privacy arrangements. An SDK's open-source license does not grant hosted service access. Review the services you actually enable in your published policy.

Website preview capture, optional email delivery, and the Cloudflare adapter require deployment-specific checks. The local preview does not demonstrate their production behavior. Test with consenting accounts and URLs you control.
