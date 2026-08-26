# Hint 1: Why wildcards are dangerous

`verbs: ["*"]` means ALL operations (get, list, watch, create, update, patch, delete). `resources: ["*"]` means ALL resource types including Secrets, Pods, and RoleBindings. Together, they grant full cluster admin access.
