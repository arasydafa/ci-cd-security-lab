# Hint 1: What is missing

The workflow pushes `ghcr.io/example/myapp` but no step signs anything.
Search for `cosign` — there is no installer, no `cosign sign`, and no
`id-token: write` permission for keyless signing.
