# AWS Terraform Archive

This directory contains the original AWS-specific Terraform configuration for historical reference.

## Status

**This configuration is deprecated and no longer maintained.**

The application has been migrated to a provider-agnostic deployment model using:
- Docker Compose for VM deployment
- Ansible for automation
- Generic Kubernetes manifests
- GitHub Container Registry (GHCR)

## What's Here

- `main.tf` - Main Terraform configuration
- `variables.tf` - Variable definitions
- `outputs.tf` - Output definitions
- `modules/` - Terraform modules for AWS resources
  - `network/` - VPC, subnets, NAT gateways
  - `compute/` - EKS cluster configuration
  - `database/` - DocumentDB configuration
- `environments/` - Environment-specific configurations

## Migration Path

If you need to deploy to AWS, you have two options:

### Option 1: Use Generic Deployment on AWS EC2

Deploy the provider-agnostic version on AWS EC2:
1. Launch an Ubuntu EC2 instance
2. Use the Ansible playbooks to deploy
3. Use AWS ECR or GHCR for container registry

### Option 2: Restore AWS Configuration

1. Copy this directory back to `terraform/`
2. Update AWS provider configuration
3. Run Terraform commands

## AWS Resources That Were Configured

- EKS (Elastic Kubernetes Service)
- ECR (Elastic Container Registry)
- DocumentDB (MongoDB-compatible)
- VPC with public/private subnets
- NAT Gateways
- Security Groups
- IAM roles and policies

## Alternative: AWS EKS with Generic Manifests

You can still use AWS EKS with the new generic Kubernetes manifests:
1. Create EKS cluster (using eksctl or Terraform)
2. Update `kubeconfig` to point to EKS
3. Use `kubectl apply -k k8s/overlays/production/`
4. Images will be pulled from GHCR instead of ECR

## Need Help?

See the main [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for current deployment options.
