# Scenario: Docker Socket Escape

Your CI pipeline uses Docker-in-Docker (DinD) by mounting `/var/run/docker.sock` into the build container. This lets the build container create new containers on the host.

The Docker socket is equivalent to root access. A compromised build container can:
1. Create a privileged container that mounts the host filesystem
2. Extract all secrets from other containers
3. Install persistent backdoors on the host
4. Pivot to other machines on the network

**Your mission:** Remove the Docker socket mount. Use a remote Docker builder, kaniko, or buildx with a remote builder instead.

## Attack chain
```
Container with docker.sock → docker run -v /:/host alpine → chroot /host → full host compromise
```
