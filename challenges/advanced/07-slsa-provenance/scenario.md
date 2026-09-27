# Scenario: Prove the Build

Your release pipeline builds `dist/`, uploads it, and publishes to npm. It
works — but nothing proves the published bytes came from this pipeline. An
attacker who compromises a maintainer account, a registry, or any step between
build and publish can substitute artifacts, and consumers have no way to tell.

Signed build provenance fixes that: an attestation binds each artifact to the
exact repository, commit, and workflow that produced it, signed keylessly via
OIDC. An SBOM alongside it documents every dependency inside, so vulnerable
libraries are visible instead of hidden.

**Your mission:** Attest the built artifact and generate an SBOM in the
release workflow.

## Key concepts
- Attestations bind artifacts to source, commit, and build (SLSA provenance)
- `actions/attest` needs `id-token: write` plus `attestations: write`
- `anchore/sbom-action` documents dependencies as SPDX
