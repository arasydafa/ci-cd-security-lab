# Hint 2: Verify before deploy

In the deploy job, download both the artifact and checksum file. Verify with: `sha256sum -c checksums.txt`. If verification fails, the deploy should stop.
