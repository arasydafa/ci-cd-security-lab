# Hint 2: The fix

Replace `permissions: write-all` with specific permissions. A build job typically only needs `contents: read`. Deploy jobs might also need `id-token: write` for OIDC.
