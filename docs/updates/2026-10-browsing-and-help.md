# October 2026: browsing and help

Signed-in members now land directly in the board or Built here, without the introductory hero. Visitors still see the introduction and sign-in action. The navigation has a distinct surface in both themes, and browsing actions use a quieter outlined treatment, full width on mobile.

The recent-invitations digest shows up to three actual rows on every screen size. Additional eligible invitations remain available by scrolling; there are no reserved empty rows. Invitations and unsearched board posts are ordered by their latest publication, edit, or confirmation. Search continues to rank matching results by relevance. Confirming availability refreshes all affected views without changing the original publication date.

Website preview images fit in full, preserve their proportions, and no longer zoom on hover. The public FAQ is linked from the footer and covers posting, profiles, interests, invitations, privacy, and browser sign-in.

## Upgrade

No dependency changes, environment variables, or database migrations are introduced in this update. Existing installations should keep their current community configuration and secrets, install from the updated lockfile with `npm ci`, rebuild, and redeploy using their existing deployment guide. The existing `invitation_rows` view remains required; fresh installations should still follow the complete bootstrap instructions.

Review `src/app/faq/page.tsx` for your community's admission and support policy before deployment. Its community name, member terminology, canonical URL, and contact address come from `src/config/community.ts`. This update does not enable an external directory integration or synchronize member profiles.

After deployment, check the board and Built here as a visitor and as a member. Check one-row and overflowing invitation digests on mobile and desktop, keyboard scrolling, a website preview with text at the image edges, and public access to `/faq`. Publication, hosted installation acceptance, and asset redistribution checks remain covered by the [release checklist](../release-checklist.md).
