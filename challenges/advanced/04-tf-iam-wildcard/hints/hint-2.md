# Hint 2: The fix

Replace `"Action": "*"` with specific actions your app needs (e.g., `["s3:GetObject", "s3:PutObject"]`). Replace `"Resource": "*"` with specific ARNs (e.g., `"arn:aws:s3:::my-bucket/*"`). Use AWS IAM Access Analyzer to identify unused permissions.
