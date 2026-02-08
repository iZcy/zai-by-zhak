output "cluster_id" {
  description = "DocumentDB cluster ID"
  value       = aws_docdb_cluster.main.id
}

output "cluster_arn" {
  description = "DocumentDB cluster ARN"
  value       = aws_docdb_cluster.main.arn
}

output "cluster_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

output "cluster_port" {
  description = "DocumentDB cluster port"
  value       = aws_docdb_cluster.main.port
}

output "cluster_members" {
  description = "List of DocumentDB cluster instances"
  value       = aws_docdb_cluster_instance.main[*].id
}

output "connection_string" {
  description = "MongoDB connection string"
  sensitive   = true
  value       = "mongodb://${var.db_username}:${var.db_password}@${aws_docdb_cluster.main.endpoint}:${var.db_port}/?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
}

output "database_name" {
  description = "Suggested database name"
  value       = "${var.project_name}_${var.environment}"
}
