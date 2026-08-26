# Hint 2: The fix

Add an `actions/github-script` step that calls `github.rest.repos.createCommitStatus()` to set the commit status to success or failure. This makes the build result visible on the commit and enables branch protection rules.
