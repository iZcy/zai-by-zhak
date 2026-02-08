environment = "dev"
aws_region = "us-east-1"

# Development specific settings
min_nodes     = 1
max_nodes     = 2
desired_nodes = 1

node_instance_type      = "t3.small"
mongodb_instance_class  = "db.t3.medium"
mongodb_storage_size    = 20

# Network
vpc_cidr           = "10.1.0.0/16"
availability_zones = ["us-east-1a", "us-east-1b"]

# Database
db_username = "admin"
db_password = "DevPass123!@#"
