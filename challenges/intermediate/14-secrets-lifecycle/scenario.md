# Scenario: Secrets Lifecycle

Every secret has a lifetime: it is created, distributed, used, and — if you
are lucky — rotated and revoked. This workflow fails the lifecycle at both
ends. The deploy token is a static string baked into the YAML, so it works
forever for anyone who reads the repo. And a debugging step serializes the
entire secrets context with `toJSON(secrets)`, exposing every secret's whole
lifetime in a single log line.

Static credentials never expire on their own, and logs live as long as the
repository. Prefer short-lived credentials (OIDC), confine each secret to the
one step that needs it, and rotate anything that was ever exposed.

**Your mission:** Remove the static token and the secrets dump. Reference the
deploy token from secrets, scoped to the deploy step only.

## Key concepts
- Static secrets work until manually revoked — assume they already leaked
- `toJSON(secrets)` exposes every secret at once; reference single secrets instead
- Scope secrets per step, mask computed values, rotate on a schedule
