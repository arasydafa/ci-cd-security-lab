# Hint 2: Safer alternatives

Use `docker buildx create --driver remote` for remote builders, or use Google's kaniko for building images without Docker daemon access. GitHub Actions also offers `docker/build-push-action` with BuildKit remote builders.
