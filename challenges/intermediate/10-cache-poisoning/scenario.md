# Scenario: Poisoned Cache, Trusted Release

Your release workflow publishes to npm on every GitHub release. To speed it up,
someone added `actions/cache` to restore `~/.npm` before `npm ci`.

The problem: caches are **shared across runs**. An untrusted run (a fork PR, a
compromised dependency job) can write a poisoned entry under the same key. Your
release job then restores attacker-controlled bytes and publishes them with
production credentials attached.

This is not theoretical. In May 2026 attackers chained a `pull_request_target`
misconfiguration with cache poisoning across the fork-to-base trust boundary to
publish malicious packages under a trusted identity (CVE-2026-45321).

**Your mission:** Remove caching from the release job so every release installs
dependencies fresh.

## Key concepts
- Cache entries are shared state, not trusted input
- Release and publish jobs must not restore caches written by less-trusted runs
- `npm ci` on a lockfile is reproducible without a cache
