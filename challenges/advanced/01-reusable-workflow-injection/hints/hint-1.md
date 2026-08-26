# Hint 1: The injection mechanism

When you write `run: echo "${{ inputs.name }}"`, GitHub replaces the expression with the actual value BEFORE bash parses the command. If the value contains shell metacharacters (`;`, `|`, `$()`), they execute as code.
