# Hint 1: Why wildcards are catastrophic

`"Action": "*"` means the entity can call ANY AWS API — create users, delete databases, access any bucket. `"Resource": "*"` means it applies to EVERYTHING. Together, they're equivalent to root access.
