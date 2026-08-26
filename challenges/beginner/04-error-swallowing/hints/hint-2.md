# Hint 2: The fix

Simply remove `|| echo "..."` from the commands. Let them fail naturally — GitHub Actions will mark the step as failed and stop the pipeline.
