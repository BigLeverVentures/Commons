# Third-party notices

Commons code is MIT licensed under LICENSE. That grant does not replace third-party licenses or establish rights in user-supplied assets. Preserve the following notices when redistributing relevant components.

## Runtime code and tooling

License files below were copied from installed package sources where provided; package-family notices and metadata-only exceptions are identified in their notice directories. Versions are the installed versions at packaging time. The lockfile is authoritative after upgrades. Supabase client subpackages are included because their code ships with the client SDK. Build tools are listed separately through their package names; service subscriptions are not covered by these licenses.

| Package | Version | Declared license | Notice |
| --- | --- | --- | --- |
| `@supabase/ssr` | 0.12.7 | MIT | [Bundled notices](docs/licenses/supabase-ssr/) |
| `@supabase/supabase-js` | 2.117.3 | MIT | [Bundled notices](docs/licenses/supabase-supabase-js/) |
| `@supabase/auth-js` | 2.117.3 | MIT | [Bundled notices](docs/licenses/supabase-auth-js/) |
| `@supabase/functions-js` | 2.117.3 | MIT | [Bundled notices](docs/licenses/supabase-functions-js/) |
| `@supabase/postgrest-js` | 2.117.3 | MIT | [Bundled notices](docs/licenses/supabase-postgrest-js/) |
| `@supabase/realtime-js` | 2.117.3 | MIT | [Bundled notices](docs/licenses/supabase-realtime-js/) |
| `@supabase/storage-js` | 2.117.3 | MIT | [Bundled notices](docs/licenses/supabase-storage-js/) |
| `minisearch` | 7.2.0 | MIT | [Bundled notices](docs/licenses/minisearch/) |
| `next` | 16.4.0 | MIT | [Bundled notices](docs/licenses/next/) |
| `react` | 19.3.0 | MIT | [Bundled notices](docs/licenses/react/) |
| `react-dom` | 19.3.0 | MIT | [Bundled notices](docs/licenses/react-dom/) |
| `react-server-dom-webpack` | 19.3.0 | MIT | [Bundled notices](docs/licenses/react-server-dom-webpack/) |
| `vinext` | 1.0.1 | MIT | [Bundled notices](docs/licenses/vinext/) |
| `@vinext/cloudflare` | 1.0.1 | MIT | [Bundled notices](docs/licenses/vinext-cloudflare/) |
| `@cloudflare/vite-plugin` | 2.0.0-beta.sha-52b0dc0e9 | MIT | [Bundled notices](docs/licenses/cloudflare-vite-plugin/) |
| `cf` | 1.0.0-beta.13 | MIT OR Apache-2.0 | [Bundled notices](docs/licenses/cf/) |
| `@electric-sql/pglite` | 0.5.8 | Apache-2.0 | [Bundled notices](docs/licenses/electric-sql-pglite/) |
| `@tailwindcss/postcss` | 4.2.1 | MIT | [Bundled notices](docs/licenses/tailwindcss-postcss/) |
| `@types/node` | 22.20.5 | MIT | [Bundled notices](docs/licenses/types-node/) |
| `@types/react` | 19.2.14 | MIT | [Bundled notices](docs/licenses/types-react/) |
| `@types/react-dom` | 19.2.3 | MIT | [Bundled notices](docs/licenses/types-react-dom/) |
| `@vitejs/plugin-react` | 6.1.2 | MIT | [Bundled notices](docs/licenses/vitejs-plugin-react/) |
| `@vitejs/plugin-rsc` | 0.5.36 | MIT | [Bundled notices](docs/licenses/vitejs-plugin-rsc/) |
| `eslint` | 9.39.3 | MIT | [Bundled notices](docs/licenses/eslint/) |
| `eslint-config-next` | 16.4.0 | MIT | [Bundled notices](docs/licenses/eslint-config-next/) |
| `pg` | 8.23.1 | MIT | [Bundled notices](docs/licenses/pg/) |
| `sharp` | 0.35.5 | Apache-2.0 | [Bundled notices](docs/licenses/sharp/) |
| `supabase` | 2.120.0 | MIT | [Bundled notices](docs/licenses/supabase/) |
| `tailwindcss` | 4.2.1 | MIT | [Bundled notices](docs/licenses/tailwindcss/) |
| `typescript` | 5.9.3 | Apache-2.0 | [Bundled notices](docs/licenses/typescript/) |
| `vite` | 8.3.0 | MIT | [Bundled notices](docs/licenses/vite/) |

This inventory covers the named direct packages and Supabase client subpackages, not a claim that every transitive package has been independently audited. Preserve package-level and compiled dependency notices in `node_modules` and built output, including licenses shipped by Next.js under `dist/compiled`. Any binary redistribution should review the exact resulting dependency bundle.

## Bundled fonts, renderer, and icons

- **Inter** by the Inter Project Authors: SIL Open Font License 1.1, [full notice](public/fonts/Inter-OFL.txt).
- **Fraunces**: SIL Open Font License 1.1, [full notice and author attribution](public/fonts/Fraunces-OFL.txt). Retain reserved-font-name restrictions when modifying fonts.
- **PDF.js** (`public/pdf.min.mjs`, `public/pdf.worker.min.mjs`), Mozilla Foundation: Apache License 2.0, [full license](public/pdfjs-LICENSE.txt). These local browser bundles originate from `pdfjs-dist` 5.4.624; preserve bundle notices.
- **Lucide** icon paths: ISC, [retained license](docs/licenses/lucide.txt); upstream [Lucide license and contributors](https://github.com/lucide-icons/lucide/blob/main/LICENSE). The upstream attribution includes Lucide and inherited Feather material; do not infer that all paths were originally authored for Commons.

## Open Peeps avatars

The 48 local SVG choices use **Open Peeps by Pablo Stanley**, dedicated under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/legalcode). Style provenance: [Open Peeps](https://www.openpeeps.com/) and [DiceBear Open Peeps](https://www.dicebear.com/styles/open-peeps/). They were generated with DiceBear core/styles 10.6.0; the generator is MIT, independently of the CC0 artwork. [Generation notes](public/avatars/README.md) and [collection options](public/avatars/collection.json) preserve reproduction information. There is no runtime DiceBear API dependency.

## Decorative and reaction artwork: release rights pending

`public/images/reactions/highfive.svg`, `lightbulb.svg`, and `rocket.svg` were supplied by the user for this project. Their original author and public redistribution license have not been independently confirmed. Private export was authorized. Do not describe these files as independently verified Commons-owned or MIT-licensed artwork.

`public/images/commons-glass-discs.png` is generated decorative artwork included at the user's direction. `public/images/fellowship-footer.webp` is user-supplied footer artwork included at the user's direction. That inclusion authorization does not establish a third-party copyright claim or independently verify public redistribution rights. Public release containing these assets remains pending rights verification; obtain the necessary evidence or replace/remove the affected artwork before publishing. This notice records origin and the unresolved scope; it does not invent a license.

## Hosted services

Supabase, Resend, Microlink, and Cloudflare hosted services have separate terms, account requirements, and pricing. Their SDK or tooling licenses do not grant hosted-service use. Website previews and remote images remain subject to their original owners' rights. Member uploads remain the uploader's responsibility; obtain appropriate permission before including them in a distributable sample package.
