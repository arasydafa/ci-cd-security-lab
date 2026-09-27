# Hint 1: What moves under you

`node:20-slim` today and `node:20-slim` next month can be different images.
Look at the `FROM` line inside the heredoc Dockerfile — it names a mutable
tag with no digest, so nothing binds your build to specific bytes.
