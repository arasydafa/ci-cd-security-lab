# Hint 2: Safe alternatives

Pass user input as an environment variable instead of interpolating directly:
```yaml
env:
  PR_TITLE: ${{ github.event.pull_request.title }}
run: echo "$PR_TITLE"
```
Environment variables are not subject to shell injection.
