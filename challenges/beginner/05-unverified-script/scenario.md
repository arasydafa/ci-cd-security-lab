# Scenario: Unverified Script Execution

Your pipeline downloads a setup script from a remote server and pipes it directly to bash. The script URL is hardcoded and there's no integrity verification.

If the remote server is compromised, or if a MITM attack intercepts the download, malicious code would execute in your CI environment with access to your secrets.

**Your mission:** Download the script first, verify its integrity, then execute it.
