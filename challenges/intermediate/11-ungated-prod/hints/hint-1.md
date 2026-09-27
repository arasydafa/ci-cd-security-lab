# Hint 1: What the gate enforces

An environment in repository Settings can require reviewers (up to 6 people
or teams), a wait timer, and a deployment-branches policy. The job only
starts — and only receives the environment's secrets — after those rules
pass. Without the `environment:` key, none of that exists.
