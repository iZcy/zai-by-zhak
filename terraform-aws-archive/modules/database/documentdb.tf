# DocumentDB Cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier      = "${var.project_name}-${var.environment}-docdb"
  engine                  = "docdb"
  engine_version          = var.mongodb_version
  master_username         = var.db_username
  master_password         = var.db_password
  port                    = var.db_port
  backup_retention_period = var.backup_retention_days
  preferred_backup_window = "07:00-09:00"
  preferred_maintenance_window = "sun:09:00-sun:10:00"
  final_snapshot_identifier = "${var.project_name}-${var.environment}-final-snapshot"
  skip_final_snapshot     = var.skip_final_snapshot
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.docdb.arn
  db_subnet_group_name    = aws_docdb_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.docdb.id]
  deletion_protection     = var.deletion_protection

  enabled_cloudwatch_logs_exports = ["audit", "error", "general", "slowquery"]

  tags = {
    Name = "${var.project_name}-${var.environment}-docdb"
  }
}

# DocumentDB Cluster Instance
resource "aws_docdb_cluster_instance" "main" {
  count              = var.instance_count
  identifier         = "${var.project_name}-${var.environment}-docdb-${count.index}"
  cluster_identifier = aws_docdb_cluster.main.id
  instance_class     = var.instance_class
  engine             = aws_docdb_cluster.main.engine
  engine_version     = aws_docdb_cluster.main.engine_version
  apply_immediately  = true

  tags = {
    Name = "${var.project_name}-${var.environment}-docdb-${count.index}"
  }
}

# Database Subnet Group
resource "aws_docdb_subnet_group" "main" {
  name        = "${var.project_name}-${var.environment}-docdb-subnet-group"
  description = "Database subnet group for ${var.project_name} ${var.environment}"
  subnet_ids  = var.subnet_ids

  tags = {
    Name = "${var.project_name}-${var.environment}-docdb-subnet-group"
  }
}

# Security Group for DocumentDB
resource "aws_security_group" "docdb" {
  name        = "${var.project_name}-${var.environment}-docdb-sg"
  description = "Security group for DocumentDB"
  vpc_id      = var.vpc_id

  ingress {
    description     = "MongoDB from EKS nodes"
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [var.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-docdb-sg"
  }
}

# KMS Key for DocumentDB encryption
resource "aws_kms_key" "docdb" {
  description             = "KMS key for DocumentDB encryption"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-${var.environment}-docdb-kms"
  }
}

resource "aws_kms_alias" "docdb" {
  name          = "alias/${var.project_name}-${var.environment}-docdb"
  target_key_id = aws_kms_key.docdb.key_id
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "docdb" {
  name              = "/aws/docdb/${var.project_name}-${var.environment}/cluster"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.project_name}-${var.environment}-docdb-logs"
  }
}

# Parameter Group
resource "aws_docdb_cluster_parameter_group" "main" {
  name        = "${var.project_name}-${var.environment}-docdb-pg"
  description = "DocumentDB cluster parameter group"
  family      = "docdb7.0"

  parameters {
    name  = "audit_logs"
    value = "enabled"
  }

  parameters {
    name  = "profiler"
    value = "disabled"
  }

  parameters {
    name  = "tls"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-docdb-pg"
  }
}
