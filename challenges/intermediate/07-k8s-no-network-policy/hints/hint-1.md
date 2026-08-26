# Hint 1: Default behavior

Kubernetes has no network isolation by default. All pods can communicate with all other pods across all namespaces. NetworkPolicy is the mechanism to restrict this.
