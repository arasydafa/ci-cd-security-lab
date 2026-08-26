# Hint 1: How secrets leak in logs

`echo ${{ secrets.X }}` directly prints the secret value. Even if you remove it later, the log entry persists. GitHub Actions logs are stored indefinitely and accessible to anyone with repository read access.
