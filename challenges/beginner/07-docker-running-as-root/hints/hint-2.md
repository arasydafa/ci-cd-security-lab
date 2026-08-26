# Hint 2: The fix

Add `USER nonroot` or `USER 1000` to your Dockerfile after installing packages but before the CMD/ENTRYPOINT. Create the user first with `RUN adduser --system --group nonroot` if needed.
