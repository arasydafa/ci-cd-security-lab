# Hint 2: The fix

Add `github/codeql-action/upload-sarif@v4` with `sarif_file: results.sarif`
after the scan, and grant `security-events: write` — without that permission
the upload is rejected and the silence continues.
