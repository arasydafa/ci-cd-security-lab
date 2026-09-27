# Hint 1: Two lifetime failures

`DEPLOY_TOKEN: FILL_ME_FROM_SECRETS` in `env:` is a static credential — it works forever for anyone with repo read access. And
`echo "${{ toJSON(secrets) }}"` prints every secret at once, so one log line
exposes all of them for as long as logs are kept.
