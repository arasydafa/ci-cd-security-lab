# Hint 2: The fix

Remove `privileged: true` from `securityContext`. If the app needs specific capabilities, use `capabilities: { add: ["NET_BIND_SERVICE"] }` to add only what's needed. Most apps don't need any special capabilities.
