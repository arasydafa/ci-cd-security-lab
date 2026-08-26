# Hint 2: The fix

Pass secrets at runtime via `docker run -e DB_PASSWORD=$SECRET` or use Docker BuildKit secrets: `RUN --mount=type=secret,id=dbpass cat /run/secrets/dbpass`. Never bake secrets into image layers.
