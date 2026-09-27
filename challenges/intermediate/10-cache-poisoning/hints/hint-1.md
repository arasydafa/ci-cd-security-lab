# Hint 1: Where the trust boundary breaks

The `actions/cache` step restores `~/.npm` using a key any run can compute:
`npm-deps-${{ hashFiles('package-lock.json') }}`. Any workflow run in this
repository that saves under that key — including low-privilege ones — feeds
bytes straight into your release build.
