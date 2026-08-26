# Scenario: Container Root Trap

Your CI pipeline builds and pushes Docker images. The inline Dockerfile doesn't specify a `USER` instruction, so the container runs as root by default.

If an attacker escapes the container (via a kernel vulnerability or misconfiguration), they have full root access to the host system. Running as root inside a container also means any vulnerability in your app can be leveraged for container escape.

**Your mission:** Add a non-root `USER` instruction to the Dockerfile.
