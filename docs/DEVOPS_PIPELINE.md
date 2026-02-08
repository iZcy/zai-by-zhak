# DevOps CI/CD Pipeline Documentation

## Overview

This document describes the complete DevOps lifecycle for deploying the fullstack application using Infrastructure as Code (IaC) and automated CI/CD pipelines.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CI/CD Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Developer Push ──► Code ──► Lint/Test ──► Build Images         │
│                            │              │                      │
│                            │              ▼                      │
│                            │         Push to ECR                 │
│                            │              │                      │
│                            ▼              ▼                      │
│                       ┌─────────────────────┐                   │
│                       │   Deploy Dev        │ (auto)            │
│                       └─────────────────────┘                   │
│                            │                                    │
│                            ▼                                    │
│                       ┌─────────────────────┐                   │
│                       │   Deploy Staging    │ (auto)            │
│                       └─────────────────────┘                   │
│                            │                                    │
│                            ▼                                    │
│                       Integration Tests                         │
│                            │                                    │
│                            ▼                                    │
│                       ┌─────────────────────┐                   │
│                       │   Deploy Production │ (manual approval) │
│                       └─────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## DevOps Cycle

### 1. Development Phase

**Local Development:**
```bash
# Run everything locally with hot reload
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# MongoDB: mongodb://localhost:27017
```

**Pre-commit Hooks:**
- ESLint runs automatically
- Unit tests execute before commit
- Code formatting with Prettier

### 2. Continuous Integration (CI)

**On Push to Branch:**

1. **Lint & Test Job** (2-3 min)
   ```yaml
   - Checkout code
   - Install dependencies
   - Run ESLint
   - Run unit tests
   - Check test coverage (>80% required)
   ```

2. **Build Job** (3-5 min)
   ```yaml
   - Build Docker images (multi-stage)
   - Run security scans (Trivy)
   - Push to Amazon ECR
   - Tag with branch, commit SHA, and semantic version
   ```

**Quality Gates:**
- All tests must pass
- Code coverage must be >80%
- Security vulnerabilities must be below threshold
- Image size must be reasonable (<500MB)

### 3. Continuous Deployment (CD)

**Automated Deployments:**

**Develop Branch → Development Environment:**
```bash
# Auto-deploys on push to develop
kubectl apply -k k8s/overlays/dev/
- 1 replica each service
- Development database
- Public ingress
```

**Main Branch → Staging Environment:**
```bash
# Auto-deploys on push to main
kubectl apply -k k8s/overlays/staging/
- 2 replicas each service
- Staging database
- Integration tests run
```

**Main Branch → Production Environment:**
```bash
# Manual approval required
kubectl apply -k k8s/overlays/production/
- 3+ replicas each service
- Production database
- Full monitoring enabled
```

### 4. Infrastructure as Code (IaC)

**Terraform Workflow:**

```bash
# 1. Initialize Terraform
cd terraform/environments/dev
terraform init

# 2. Plan changes
terraform plan -out=tfplan

# 3. Apply changes
terraform apply tfplan

# 4. Destroy (when needed)
terraform destroy
```

**Terraform State:**
- Stored in S3 with versioning
- DynamoDB for state locking
- Separate state per environment

**Kubernetes Deployment:**

```bash
# Deploy with Kustomize
kubectl apply -k k8s/overlays/dev/

# Check rollout status
kubectl rollout status deployment/backend -n fullstack-dev

# View pods
kubectl get pods -n fullstack-dev
```

### 5. Monitoring & Observability

**Health Checks:**
```bash
# Application health
curl https://app.example.com/health

# Database health
curl https://app.example.com/api/health
```

**Metrics Collected:**
- CPU/Memory usage
- Request/response times
- Error rates
- Database connection pool
- Custom business metrics

**Logging:**
- Application logs → CloudWatch Logs
- Access logs → CloudWatch Logs
- Audit logs → S3 for long-term storage

**Alerting:**
- Pod crash loops
- High error rates (>1%)
- High latency (>500ms p95)
- Database connection issues

### 6. Rollback Procedures

**Automatic Rollback:**
```yaml
# If health checks fail, Kubernetes auto-rolls back
kubectl rollout undo deployment/backend -n fullstack-production
```

**Manual Rollback:**
```bash
# View rollout history
kubectl rollout history deployment/backend -n fullstack-production

# Rollback to specific revision
kubectl rollout undo deployment/backend -n fullstack-production --to-revision=2
```

**Database Rollback:**
- DocumentDB automated backups (daily)
- Point-in-time recovery (up to 35 days)
- Manual snapshots before major changes

## Environment Promotion

### Dev → Staging → Production

```
┌────────────┐     ┌────────────┐     ┌──────────────┐
│   Local    │────▶│    Dev     │────▶│   Staging    │
│ (Docker    │     │ (EKS Dev)  │     │ (EKS Stage)  │
│  Compose)  │     │            │     │              │
└────────────┘     └────────────┘     └──────────────┘
                                              │
                                              ▼ (manual approval)
                                        ┌──────────────┐
                                        │  Production  │
                                        │  (EKS Prod)  │
                                        │              │
                                        └──────────────┘
```

**Rules:**
- Direct commits to `main` are blocked
- All changes go through PRs
- PRs require 1 approval
- CI must pass before merge
- Main → Production requires manual approval

## Deployment Strategies

### 1. Rolling Update (Default)
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

### 2. Blue-Green (Future)
```yaml
# Deploy new version alongside old
# Switch traffic when ready
# Immediate rollback capability
```

### 3. Canary (Future)
```yaml
# Deploy to small subset of users
# Monitor metrics
# Gradual traffic increase
```

## Infrastructure Components

### AWS Resources

| Component | Service | Purpose |
|-----------|---------|---------|
| EKS | Elastic Kubernetes Service | Container orchestration |
| ECR | Elastic Container Registry | Docker image storage |
| DocumentDB | MongoDB-compatible database | Data persistence |
| ALB | Application Load Balancer | Traffic distribution |
| Route53 | DNS | Domain management |
| ACM | Certificate Manager | SSL/TLS certificates |
| CloudWatch | Monitoring | Logs and metrics |

### Kubernetes Resources

| Resource | Replicas | Purpose |
|----------|----------|---------|
| Frontend Deployment | 1-3 | Serves React app |
| Backend Deployment | 1-3 | Express API |
| MongoDB StatefulSet | 1-3 | Database cluster |
| Nginx Ingress | - | Routing and SSL |

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to git
   - Use AWS Secrets Manager
   - Rotate credentials regularly
   - Use IRSA for pod IAM roles

2. **Network Security**
   - VPC with private subnets
   - Security groups for each tier
   - Network policies in Kubernetes
   - WAF rules for ingress

3. **Image Security**
   - Scan images with Trivy
   - Use minimal base images
   - Run as non-root user
   - Sign images with Cosign

4. **Application Security**
   - Helmet.js headers
   - Rate limiting
   - Input validation
   - CORS configuration

## Cost Optimization

1. **Development:**
   - Single AZ
   - t3.small instances
   - 1 replica per service
   - Spot instances for nodes

2. **Production:**
   - Multi-AZ
   - t3.medium instances
   - 3+ replicas per service
   - Reserved instances for baseline
   - Auto-scaling for traffic spikes

## Troubleshooting

### Common Issues

**Pods Not Starting:**
```bash
kubectl describe pod <pod-name> -n fullstack-production
kubectl logs <pod-name> -n fullstack-production
```

**High Memory Usage:**
```bash
kubectl top pods -n fullstack-production
# Adjust resource limits in deployment
```

**Database Connection Issues:**
```bash
kubectl exec -it backend-xxx -n fullstack-production -- mongo
# Check connection string and security groups
```

### Getting Help

1. Check CloudWatch Logs
2. Review GitHub Actions runs
3. Check Kubernetes events
4. Verify Terraform state
5. Check AWS Health Dashboard

## Maintenance

### Regular Tasks

**Daily:**
- Review error rates
- Check backup completion
- Monitor cost alerts

**Weekly:**
- Review and rotate secrets
- Clean up old Docker images
- Review unused resources

**Monthly:**
- Security patch updates
- Cost optimization review
- Disaster recovery test

## Runbooks

See `docs/runbooks/` for detailed procedures:
- `deployment.md` - Deployment procedures
- `rollback.md` - Rollback procedures
- `scaling.md` - Scaling procedures
- `incident-response.md` - Incident management
