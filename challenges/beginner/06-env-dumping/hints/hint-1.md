# Hint 1: Where are the secrets?

Environment variables in CI include secrets you've configured (like `secrets.AWS_ACCESS_KEY_ID`). Commands like `env`, `printenv`, or `env | grep` dump everything — including those secrets.
