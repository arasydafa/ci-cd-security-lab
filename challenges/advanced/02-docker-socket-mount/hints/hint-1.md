# Hint 1: Why docker.sock is dangerous

Mounting `/var/run/docker.sock` gives the container full control over the Docker daemon. It can create containers with `-v /:/host` to mount the entire host filesystem, effectively gaining root access.
