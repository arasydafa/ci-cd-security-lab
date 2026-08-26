# Hint 1: How secrets leak in images

`ENV DB_PASSWORD=secret` or `--build-arg DB_PASSWORD=secret` creates a layer that stores the secret. `docker history --no-trunc` reveals it. Even multi-stage builds don't help if the secret is in the final stage's ENV.
