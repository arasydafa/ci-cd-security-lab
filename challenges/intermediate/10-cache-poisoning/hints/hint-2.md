# Hint 2: The fix

Delete the entire `actions/cache` step from the release job. Keep `npm ci` —
with a committed lockfile it is deterministic without a cache. As a rule:
release and publish jobs restore no caches, ever.
