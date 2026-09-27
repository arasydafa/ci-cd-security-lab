# Hint 2: The fix

Delete the debug step entirely, then replace the static value with
`DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}` on the deploy step only. For the
long term, move to short-lived OIDC credentials and rotate the exposed token
now that it lived in logs.
