# Contributing

Use a short-lived branch and a pull request describing the problem, resulting behavior, and verification. Preserve the lockfile and keep credentials, member data, uploaded files, and personal contact details out of commits and screenshots.

Install with `npm ci`, then use `npm run preview` to explore fictional data. Follow [installation](docs/INSTALL.md) for authenticated development on an isolated project. Before submitting application changes run `npm run lint`, `npm test`, `npm run build`, and `npx --no-install tsc --noEmit` sequentially. Storage concurrency changes also need the PostgreSQL suite (`npm run test:postgres`) with `POSTGRES_TEST_URL` pointing only to a disposable local database. Never use production for tests.

Document schema changes with a new ordered migration and compatibility/recovery notes. Preserve topic and avatar IDs unless you supply a migration. Review RLS, public/private field boundaries, authenticated job authorization, accessibility, and narrow-screen behavior when they are affected. Re-review behavior-changing fixes.

Bug reports should include the version, runtime/deployment route, reproduction steps, expected/actual behavior, and redacted errors. Do not publish private introductions, email tokens, cookies, keys, or real member records. Report vulnerabilities privately using [SECURITY.md](SECURITY.md).

Contributions must include the notices for any new third-party code or artwork and a documented right to redistribute it. Commons code is MIT licensed; unresolved artwork rights must be settled or the affected asset replaced before public redistribution.
