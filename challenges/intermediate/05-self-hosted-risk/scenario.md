# Scenario: Self-Hosted Runner Risk

Your team uses self-hosted runners for faster builds. The problem: a malicious pull request ran code that installed a backdoor on the runner. Now every subsequent build — including builds that handle secrets — runs on a compromised machine.

Self-hosted runners persist between builds. Unlike GitHub-hosted runners which are fresh VMs every time, a compromised self-hosted runner stays compromised.

**Your mission:** Replace self-hosted runners with GitHub-hosted runners, or add container isolation to limit the blast radius.
