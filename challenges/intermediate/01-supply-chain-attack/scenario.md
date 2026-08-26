# Scenario: Supply Chain Attack

A contributor submitted a PR that modifies your CI workflow. The changes look innocent at first glance, but hidden in the diff are several malicious steps:

1. A step that dumps environment variables (harvesting secrets)
2. A step that modifies your source code (injecting a backdoor)
3. A step that exfiltrates data to an external server

**Your mission:** Identify and remove all malicious steps, then secure the workflow against similar attacks.

## Key defenses to implement:
- Restrict what PRs can do (limit permissions)
- Don't run untrusted code in CI
- Validate artifact integrity
- Monitor for suspicious behavior
