# Hint 2: The fix

Add `sigstore/cosign-installer@v4`, grant `id-token: write`, then run
`cosign sign --yes` on the pushed reference after the push step.
