# Scenario: Open Network Chaos

Your cluster runs multiple microservices: a web frontend, an API backend, a database, and a payment service. All deployed without any NetworkPolicy.

By default, Kubernetes allows all pod-to-pod communication. This means:
- A compromised frontend pod can directly access the database
- Any pod can reach the payment service
- Lateral movement is trivial for attackers

**Your mission:** Add NetworkPolicy resources to restrict traffic flow. The frontend should only reach the API, the API should only reach the database, and the payment service should be isolated.

## Key principle
Zero-trust networking: deny all by default, then allow specific paths.
