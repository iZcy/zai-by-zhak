environment = "production"
aws_region = "us-east-1"

# Production specific settings
min_nodes     = 3
max_nodes     = 10
desired_nodes = 3

node_instance_type      = "t3.medium"
mongodb_instance_class  = "db.r6g.large"
mongodb_storage_size    = 100

# Network
vpc_cidr           = "10.0.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

# Database
db_username = "prodadmin"
db_password = "" # Use AWS Secrets Manager in production

# Domain
domain_name       = "yourdomain.com"
certificate_arn   = "arn:aws:acm:us-east-1:123456789:certificate/xxx"
