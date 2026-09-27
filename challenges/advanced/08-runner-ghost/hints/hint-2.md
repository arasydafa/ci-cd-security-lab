# Hint 2: The fix

Add `with: persist-credentials: false` to checkouts that never push, and move
untrusted PR work to ephemeral runners or containers so nothing survives
between jobs.
