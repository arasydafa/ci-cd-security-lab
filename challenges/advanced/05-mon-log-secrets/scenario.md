# Scenario: Secrets in CI Logs

Your workflow echoes secrets for debugging purposes — `echo ${{ secrets.API_TOKEN }}` to "verify it's set." These logs are stored in GitHub's log storage and are accessible to anyone with Actions read access.

Even after you remove the echo step, the secrets remain in the historical logs. Attackers who gain read access to your repository can extract all secrets that were ever logged.

Additionally, some steps output sensitive data to stdout/stderr by default (like `npm install` showing auth tokens in verbose mode).

**Your mission:** Remove all secret logging and add `::add-mask::` to mask any sensitive values that must appear in logs.

## Key concepts
- `::add-mask::VALUE` redacts a value from all subsequent log output
- Secrets logged once are exposed forever — there's no "unlog"
- Even `echo ${{ secrets.X }}` before the mask leaks the value
