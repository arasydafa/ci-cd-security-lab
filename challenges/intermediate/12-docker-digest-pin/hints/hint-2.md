# Hint 2: The fix

Rewrite the line as `FROM node:20-slim@sha256:<digest>`, keeping the tag for
readability. Get the current digest with
`docker buildx imagetools inspect node:20-slim` and record the refresh date in
a comment so the next rotation is not a surprise.
