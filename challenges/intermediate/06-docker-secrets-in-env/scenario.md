# Scenario: Secrets in Image Layers

Your CI pipeline builds Docker images with database credentials passed as build arguments and baked into ENV layers. The image is pushed to a public registry.

Anyone can run `docker history` or inspect image layers to extract the hardcoded passwords. Even if you later remove the ENV instruction, the secret persists in the image layer history.

**Your mission:** Remove secrets from the image build. Use runtime environment variables or Docker build secrets (`--secret`) instead.

## What's at risk?
- Database credentials exposed to anyone with image pull access
- Secrets persist in image layer history forever
- Compliance violations (SOC2, PCI DSS)
