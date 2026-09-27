# Scenario: Pin the Base

Your Dockerfile starts with `FROM node:20-slim`. That tag is mutable: the
maintainers rebuild it regularly, and anyone who compromises the registry
account can point it at different bytes. Your pipeline then builds — and
ships — code you never reviewed, with no diff in your repository to alert you.

Digest pinning fixes the name to exact bytes:
`FROM node:20-slim@sha256:2cf0...`. The tag stays for readability; the digest
enforces immutability. Refresh it with
`docker buildx imagetools inspect node:20-slim`, and let Dependabot's docker
ecosystem propose digest updates on schedule.

**Your mission:** Pin every `FROM` line in the inline Dockerfile to its digest.

## Key concepts
- Tags move, digests do not — pin `tag@sha256:digest`
- Refresh via `docker buildx imagetools inspect`, automate via Dependabot
- Signing (next challenge) proves who built it; pinning proves what you built from
