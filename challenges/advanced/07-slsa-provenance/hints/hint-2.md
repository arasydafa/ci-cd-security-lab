# Hint 2: The fix

Add `actions/attest@v4` with `subject-path: 'dist/**'` after the download,
plus `id-token: write` and `attestations: write` permissions. Add
`anchore/sbom-action@v0` so dependencies are documented too.
