# Hint 1: Who runs what

`pull_request_target` checks out your **base** branch by default and hands the
job a write token plus secrets. The `with: repository/ref` override swaps in
the **fork's** code — so `npm ci` and `npm test` now execute attacker code
with your privileges.
