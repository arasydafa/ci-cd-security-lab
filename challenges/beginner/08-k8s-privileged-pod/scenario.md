# Scenario: Privileged Pod Escape

Your CI pipeline deploys a Kubernetes manifest that includes a pod with `privileged: true`. This was added because "something wasn't working" and the developer looked up the fastest fix.

A privileged container can:
- Access all host devices via `/dev/`
- Mount the host filesystem
- Modify kernel parameters
- Escape to full node compromise

**Your mission:** Remove `privileged: true` from the security context. If the app needs specific capabilities, add only the ones it requires using `capabilities.add`.
