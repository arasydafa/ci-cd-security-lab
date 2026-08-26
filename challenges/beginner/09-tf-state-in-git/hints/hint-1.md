# Hint 1: What's in state

Terraform state tracks every resource attribute, including secrets you've set as variables. A `.tfstate` file in git means your AWS keys, database passwords, and API tokens are in your repository history — forever.
