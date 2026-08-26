# Hint 1: The vulnerability

When you write `echo "${{ github.event.pull_request.title }}"`, GitHub substitutes the title BEFORE bash sees it. If the title contains shell metacharacters, they execute as code.
