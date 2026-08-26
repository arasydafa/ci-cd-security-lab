# Hint 2: The safe pattern

Pass inputs through an `env:` block:
```yaml
env:
  INPUT_NAME: ${{ inputs.name }}
run: echo "$INPUT_NAME"
```
Environment variables are not substituted by the shell parser — they're literal strings.
