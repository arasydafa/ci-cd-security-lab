# Hint 1: continue-on-error danger

`continue-on-error: true` makes a failing step report as "success" to GitHub. The pipeline continues as if nothing went wrong. Critical failures — test failures, security issues, deployment problems — are silently swallowed.
