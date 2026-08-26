# Scenario: Invisible Failures

Your team's CI pipeline runs tests and builds, but doesn't report the status back to GitHub. Developers push code, the build runs, but nobody checks if it passed or failed.

Broken code is being merged because there's no status check blocking the PR. The team only discovers failures after deployment — in production.

**Your mission:** Add a step that reports the build status back to the commit using `actions/github-script` so that failures are visible and can block merges.
