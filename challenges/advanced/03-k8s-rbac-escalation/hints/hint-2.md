# Hint 2: The fix

Replace `resources: ["*"]` with specific resources like `["pods", "services", "configmaps"]`. Replace `verbs: ["*"]` with only needed verbs like `["get", "list", "watch"]`. Never grant `secrets` access unless absolutely required.
