# Scenario: Error Swallowing

Your deploy pipeline uses `|| echo` after critical commands like `npm test` and `npm run build`. This means even if tests fail or the build breaks, the pipeline continues and may deploy broken code to production.

**Your mission:** Remove the error swallowing so failures stop the pipeline.
