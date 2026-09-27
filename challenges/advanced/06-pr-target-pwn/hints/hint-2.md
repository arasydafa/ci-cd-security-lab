# Hint 2: The fix

Run tests under the `pull_request` event with a plain checkout — fork builds
get a read-only token and no secrets. Reserve `pull_request_target` for
metadata-only work, or gate it on a maintainer-added `safe-to-test` label.
