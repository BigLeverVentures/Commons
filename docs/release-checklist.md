# Public release checklist

A private source repository is a review stage. Complete these checks on the exact release commit before changing visibility or publishing a distribution.

- [ ] Confirm redistribution rights for every decorative and reaction asset listed in THIRD_PARTY_NOTICES.md, or replace/remove assets whose rights remain unverified.
- [ ] Resolve or reassess the known dependency advisory recorded in SECURITY.md against the release lockfile. Record any remaining risk explicitly.
- [ ] Install from a clean clone or source archive; run lint, tests, type checks, and the selected production build.
- [ ] Complete the fresh hosted Supabase/SMTP/storage/scheduler acceptance protocol in INSTALL.md on isolated infrastructure. Verify both admitted and unlisted accounts and private introductions with consenting test users.
- [ ] If shipping Cloudflare support, complete its deployed callback, privacy, custom-domain and scheduled-event checks. A successful adapter build alone is insufficient.
- [ ] Verify generic branding, email templates, social previews, policies, support contact, configuration examples, and fictional content across desktop/mobile and light/dark themes.
- [ ] Review tracked files and reachable release history for private information and run a redacted secret scan. Inspect image metadata separately; provider provenance and third-party license author credits are not member records.
- [ ] Confirm all required third-party notices match the bundled versions, including metadata-only exceptions noted in docs/licenses/README.md.
- [ ] Review README, setup instructions, screenshots and repository description/topics; use fictional content for demos and documentation.
- [ ] Obtain the repository owner's explicit approval to make it public. Create a tagged release and verify the downloaded archive contains no credentials, local state, original repository history, or internal project notes.

Retaining “Built on Commons by Big Lever Ventures” is an optional courtesy under MIT; it is not a release requirement imposed on downstream users.
