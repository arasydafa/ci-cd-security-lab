# Scenario: Sign the Image

Your Dockerfile is pinned, your build is reproducible — and then you push the
image unsigned. The tag is just a mutable pointer: anyone with registry access
can overwrite it with different bytes, and every cluster pulling the tag runs
whatever it currently points at.

Keyless signing with cosign fixes that without managing keys: the workflow's
OIDC identity mints a short-lived certificate, the signature binds the exact
image digest to your repository, and consumers verify with
`cosign verify` before deploying.

**Your mission:** Sign the pushed image with keyless cosign.

## Key concepts
- Pinning proves what you built from; signing proves who built it
- Keyless cosign needs `id-token: write` — no long-lived keys
- Sign digests in production; verify with `cosign verify` before deploy
