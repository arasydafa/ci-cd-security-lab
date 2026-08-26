# Hint 2: The fix

Replace `runs-on: self-hosted` with `runs-on: ubuntu-latest` (or another GitHub-hosted runner). If you must use self-hosted runners, add `container:` to run steps inside an isolated Docker container.
