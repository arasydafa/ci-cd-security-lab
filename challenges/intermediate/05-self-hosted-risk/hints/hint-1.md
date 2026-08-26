# Hint 1: Why self-hosted is risky

Self-hosted runners persist between builds. If a malicious step installs a backdoor or modifies the runner, all future builds are compromised. GitHub-hosted runners are ephemeral — destroyed after each job.
