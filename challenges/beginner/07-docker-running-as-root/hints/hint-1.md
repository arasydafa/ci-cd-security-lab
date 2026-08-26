# Hint 1: Default behavior

Docker containers run as root (UID 0) by default. If there's no `USER` instruction in the Dockerfile, the process inside the container has root privileges.
