# Hint 1: The danger of piping

`curl URL | bash` downloads and executes in one step. You never see what you're running. A compromised server or MITM attack could inject anything.
