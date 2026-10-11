# Security reporting

Do not publish credentials, member records, private introductions, or exploit details in a public issue. If the repository owner enables GitHub private vulnerability reporting, use the repository's **Security → Advisories → Report a vulnerability** control. Availability must be checked on the actual repository; this package does not claim private reporting is enabled.

If that control is unavailable, contact the operator through its configured private support channel and ask for a secure way to share sensitive details. The template `support@example.org` is not a working contact. A deploying operator must supply a monitored address before launch.

Include the affected version, deployment route, reproduction steps with fictional data, impact, and a proposed fix if available. Never send active secrets or copied production data. Maintainers should acknowledge through the private reporting channel, assess affected deployments, and coordinate a fix and disclosure. No response-time SLA is promised by this package.

Keep server secrets out of browser configuration and logs. Use current reviewed releases, apply all migrations, keep RLS enabled, and verify deployed public/private boundaries. Commons does not declare a historical supported-version range or promise that an untested deployment is secure.

## Dependency review at initial packaging

The locked `braces` 3.0.3 dependency has the high-severity [GHSA-vfj7-8cjw-p6xm stack-exhaustion advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). At packaging, `npm audit` reported nine affected dependency entries through ESLint and vinext build tooling. The npm registry's latest `braces` release was still 3.0.3; the suggested parent-package downgrades would change the supported framework/adapter versions and were not applied blindly. This is an unresolved dependency issue, not a clean security audit.

Keep build inputs and glob patterns trusted, avoid exposing development/build servers publicly, and reassess the advisory and dependency graph before public release or a deployment. Use `npm audit` and `npm ls braces --all` to check the installed lockfile. Apply a reviewed upstream fix when available and rerun tests, lint, and both builds; do not treat the private repository's creation as security approval for deployment.
