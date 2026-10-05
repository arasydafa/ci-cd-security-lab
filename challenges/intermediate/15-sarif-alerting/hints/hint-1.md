# Hint 1: Where results go to die

The Trivy step writes `results.sarif` to the workspace and nothing ever reads
it. Search the workflow for `upload-sarif` — there is no upload step, so GitHub
never learns the findings exist.
