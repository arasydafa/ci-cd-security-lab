# Scenario: Runner Ghost

Your pull-request workflow runs on a persistent self-hosted runner for speed.
The checkout step uses defaults — which means `persist-credentials: true` —
so the job token is written into `.git/config` in the workspace. The workspace
itself is never wiped between jobs either.

Those leftovers haunt every later run on that host: files, credentials, even
processes from earlier jobs are still there when the next PR — possibly from a
stranger's fork — starts executing. One malicious PR harvests the previous
job's token and the haunting continues.

**Your mission:** Stop credentials from surviving the job. Disable credential
persistence where no push is needed, and keep untrusted work off persistent
runners.

## Key concepts
- Checkout persists the token to disk unless told otherwise
- Persistent runners share filesystem state across jobs and trust levels
- Ephemeral single-job runners (or containers) leave no ghost behind
