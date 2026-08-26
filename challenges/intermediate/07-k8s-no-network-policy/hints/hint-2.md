# Hint 2: The fix

Create a NetworkPolicy with `policyTypes: ["Ingress"]` and `ingress: []` to deny all ingress by default. Then add specific allow rules for each service's legitimate traffic sources.
