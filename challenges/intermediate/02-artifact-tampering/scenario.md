# Scenario: Artifact Tampering

Your pipeline builds an artifact in one job and deploys it in another. The artifact is uploaded and downloaded using GitHub's artifact actions, but there's no integrity verification.

If an attacker gains access to the workflow (via a compromised action or malicious PR), they could swap the artifact between build and deploy.

**Your mission:** Add SHA256 checksum generation and verification to ensure artifact integrity.
