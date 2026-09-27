# Hint 1: What is missing

The workflow builds and publishes, but no step vouches for the artifact.
Look for `actions/attest` (or the older `attest-build-provenance`) and any
SBOM generation — neither exists, so consumers trust the bytes blindly.
