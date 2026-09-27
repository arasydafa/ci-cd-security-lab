# Hint 1: Defaults that haunt

`actions/checkout` stores credentials in `.git/config` unless
`persist-credentials: false` is set. On a persistent `self-hosted` runner
that file — and the whole `_work` directory — is still there when the next
job starts.
