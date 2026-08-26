# Scenario: RBAC Privilege Escalation

Your CI pipeline applies a ClusterRole and ClusterRoleBinding with wildcard permissions (`verbs: ["*"]`, `resources: ["*"]`). This was done for "convenience" so the app wouldn't hit permission errors.

The problem: any pod that uses the bound ServiceAccount can:
- Read all Secrets in the cluster (including credentials)
- Create new pods that mount host filesystems
- Create new ClusterRoleBindings to grant itself admin access
- Essentially become cluster-admin

**Your mission:** Replace wildcard permissions with specific, least-privilege rules. Only grant the exact verbs and resources the application needs.

## The escalation chain
```
Wildcard ClusterRole → read Secrets → mount host → full cluster compromise
```
