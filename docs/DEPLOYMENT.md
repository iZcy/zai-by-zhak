# Provider-Agnostic Deployment Guide

This guide covers deploying the fullstack application on any infrastructure without cloud vendor lock-in.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Deployment Options](#deployment-options)
3. [Local Development](#local-development)
4. [VM Deployment](#vm-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Container Registries](#container-registries)
7. [Backups](#backups)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Git repository access
- For CI/CD: GitHub account with Actions enabled

### Clone and Configure

```bash
# Clone the repository
git clone https://github.com/your-org/fullstack-app.git
cd fullstack-app

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Start Locally

```bash
# Start all services
docker-compose up -d

# Check service health
curl http://localhost:3000/health
curl http://localhost:5000/health
```

## Deployment Options

This application supports multiple deployment methods:

| Method | Complexity | Scalability | Use Case |
|--------|-----------|-------------|----------|
| **Docker Compose** | Low | Medium | Single VM, small-to-medium deployments |
| **Ansible + Docker Compose** | Medium | Medium | Automated VM deployment, multiple environments |
| **Kubernetes** | High | High | Large deployments, auto-scaling, multi-cluster |

## Local Development

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Build

```bash
# Build images locally
docker-compose build

# Or build individual services
docker-compose build frontend
docker-compose build backend
```

## VM Deployment

### Option 1: Manual Deployment

#### 1. Prepare Your VM

Ensure your VM meets these requirements:
- **OS**: Ubuntu 20.04+, Debian 11+, CentOS 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB
- **Network**: SSH access, open ports 80, 443

#### 2. Install Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**CentOS/RHEL:**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
```

#### 3. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-org/fullstack-app.git
cd fullstack-app

# Configure environment
cp .env.example .env
nano .env  # Update with your settings

# Start services
docker-compose up -d

# Verify deployment
curl http://localhost:3000/health
curl http://localhost:5000/health
```

### Option 2: Ansible Automated Deployment

#### Setup Ansible Control Machine

```bash
# Install Ansible
pip install ansible

# Or on Ubuntu/Debian
sudo apt update
sudo apt install -y ansible
```

#### Configure Inventory

Edit `ansible/inventory/inventory.yml`:

```yaml
production:
  hosts:
    prod-server:
      ansible_host: 192.168.1.100
      ansible_user: deploy
```

#### Initial VM Setup

```bash
# Run initial setup playbook (one-time)
ansible-playbook -i ansible/inventory/inventory.yml ansible/playbooks/setup-vm.yml
```

This playbook:
- Creates deployment user
- Installs Docker and Docker Compose
- Configures firewall
- Hardens security
- Sets up fail2ban

#### Deploy Application

```bash
# Deploy application
ansible-playbook -i ansible/inventory/inventory.yml ansible/playbooks/deploy.yml \
  --extra-vars "target_environment=production" \
  --extra-vars "image_tag=main"
```

#### Backup Data

```bash
# Create backup
ansible-playbook -i ansible/inventory/inventory.yml ansible/playbooks/backup.yml
```

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (any distribution: k3s, microk8s, minikube, EKS, GKE, AKS)
- kubectl configured
- kustomize installed (or kubectl apply -k)

### Deploy to Development

```bash
# Deploy to development namespace
kubectl apply -k k8s/overlays/dev/

# Check deployment
kubectl get pods -n fullstack-dev
kubectl get services -n fullstack-dev
```

### Deploy to Production

```bash
# Update image tags in environment or via command
export VERSION=main
export GITHUB_REPOSITORY_OWNER=your-org

# Deploy to production
kubectl apply -k k8s/overlays/production/

# Check deployment
kubectl get pods -n fullstack-production
kubectl get services -n fullstack-production
```

### Access Services

```bash
# Port forward for testing
kubectl port-forward -n fullstack-production svc/backend 5000:5000
kubectl port-forward -n fullstack-production svc/frontend 3000:80

# Or configure ingress (nginx-ingress example)
kubectl apply -f k8s/base/nginx-ingress.yaml
```

## Container Registries

This application supports any container registry. Configure via environment variables:

### GitHub Container Registry (GHCR) - Recommended

**Advantages:**
- Free for public repositories
- Integrated with GitHub Actions
- No additional secrets required

**Configuration:**
```bash
CONTAINER_REGISTRY=ghcr.io
IMAGE_OWNER=your-github-username
```

**No additional setup needed** - GitHub Actions uses `GITHUB_TOKEN` automatically.

### Docker Hub

**Configuration:**
```bash
CONTAINER_REGISTRY=docker.io
IMAGE_OWNER=your-dockerhub-username
```

**Required Secrets:**
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_PASSWORD` (or access token)

### GitLab Container Registry

**Configuration:**
```bash
CONTAINER_REGISTRY=registry.gitlab.com
IMAGE_OWNER=your-gitlab-username
```

**Required Secrets:**
- `GITLAB_TOKEN`

### Self-Hosted Registry

**Configuration:**
```bash
CONTAINER_REGISTRY=registry.example.com
IMAGE_OWNER=your-project
```

**Required Secrets:**
- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`

## Backups

### Manual Backup

```bash
# Using backup script
./scripts/backup.sh

# Or via Docker Compose
docker-compose --profile backup run --rm backup
```

### Automated Backups

#### Via Cron Job

```bash
# Add to crontab (crontab -e)
0 2 * * * cd /opt/fullstack-app && ./scripts/backup.sh
```

#### Via Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-backup
  namespace: fullstack-production
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: mongo:7.0
            command:
            - /scripts/backup.sh
            env:
            - name: MONGODB_HOST
              value: mongodb
            # Add other env vars
          restartPolicy: OnFailure
```

#### Via Ansible

```bash
# Run backup playbook
ansible-playbook -i ansible/inventory/inventory.yml ansible/playbooks/backup.yml
```

### Restore from Backup

```bash
# Extract backup
gunzip mongodb-backup-YYYYMMDD-HHMMSS.gz

# Restore to MongoDB
mongorestore --archive=mongodb-backup-YYYYMMDD-HHMMSS --gzip
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs mongodb

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart backend
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check network connectivity
docker-compose exec backend ping -c 3 mongodb
```

### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/fullstack-app
sudo chmod -R 755 /opt/fullstack-app
```

### Kubernetes Pod Issues

```bash
# Describe pod for detailed info
kubectl describe pod -n fullstack-production <pod-name>

# View pod logs
kubectl logs -n fullstack-production <pod-name>

# Get events
kubectl get events -n fullstack-production --sort-by='.lastTimestamp'
```

### CI/CD Pipeline Issues

**Check GitHub Actions logs for:**
- Image build failures
- Registry authentication errors
- Deployment failures

**Common fixes:**
- Verify registry credentials are set as repository secrets
- Check image names match registry format
- Ensure VM SSH keys are configured correctly

### Health Check Failures

```bash
# Manual health check
curl http://localhost:3000/health
curl http://localhost:5000/health

# Check if ports are listening
sudo netstat -tlnp | grep -E '3000|5000|27017'
```

## Security Best Practices

1. **Change Default Passwords**
   - Update MongoDB credentials in `.env`
   - Use strong, unique passwords

2. **Enable Firewall**
   - Only allow necessary ports (80, 443)
   - Restrict SSH access

3. **Use SSL/TLS**
   - Set up SSL certificates for production
   - Configure nginx for HTTPS

4. **Regular Updates**
   - Keep Docker images updated
   - Apply OS security patches

5. **Backups**
   - Schedule regular automated backups
   - Test restore procedures
   - Store backups off-site

6. **Monitoring**
   - Set up log aggregation
   - Configure alerting for failures
   - Monitor resource usage

## Next Steps

- [ ] Configure your container registry
- [ ] Set up CI/CD secrets in GitHub
- [ ] Test deployment locally with Docker Compose
- [ ] Deploy to staging environment
- [ ] Configure SSL/TLS for production
- [ ] Set up automated backups
- [ ] Configure monitoring and alerting
- [ ] Document your deployment procedures
