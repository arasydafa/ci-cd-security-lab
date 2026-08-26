# Scenario: Unsafe Dependencies

Your workflow uses `@v3` tags to reference GitHub Actions. Tags are mutable — the same tag can point to different code over time.

If the `actions/checkout` action's repository were compromised, an attacker could push a new version under the `v3` tag that steals your code or secrets.

**Your mission:** Pin all actions to full commit SHAs. You can find the SHA for each action version on its GitHub releases page.
