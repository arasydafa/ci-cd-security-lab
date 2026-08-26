# Hint 1: What does || echo do?

In bash, `command || echo "failed"` runs the command, and if it fails, runs `echo` instead. The exit code of the whole expression is 0 (success), so GitHub Actions thinks the step passed.
