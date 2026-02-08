output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "database_connection_string" {
  description = "MongoDB connection string (sensitive)"
  value       = module.database.connection_string
  sensitive   = true
}

output "load_balancer_url" {
  description = "Load balancer URL"
  value       = module.ingress.load_balancer_url
}

output "frontend_url" {
  description = "Frontend application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : module.ingress.load_balancer_url
}
