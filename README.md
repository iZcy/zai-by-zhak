# Provider-Agnostic Fullstack Application

A production-ready fullstack JavaScript application with **zero cloud vendor lock-in**. Deploy on any Linux VM, any Kubernetes cluster, or any container registry.

## 🚀 Tech Stack

- **Frontend**: Vite + React
- **Backend**: Express.js + Mongoose
- **Database**: MongoDB
- **Web Server**: Nginx (reverse proxy & load balancer)
- **Containerization**: Docker + Docker Compose
- **Automation**: Ansible
- **Orchestration**: Kubernetes (generic, distribution-agnostic)
- **CI/CD**: GitHub Actions
- **Container Registry**: GitHub Container Registry (GHCR) - supports any registry

## ✨ Key Features

- **Zero Vendor Lock-in**: Deploy on any VM or K8s cluster
- **Multi-Registry Support**: GHCR, Docker Hub, GitLab, or self-hosted
- **Automated Deployment**: Ansible playbooks for VM provisioning
- **Multiple Deployment Options**: Docker Compose, Ansible, or Kubernetes
- **Production-Ready**: Includes monitoring, logging, backups, and security hardening

## 📁 Project Structure

```
.
├── frontend/              # Vite + React application
├── backend/               # Express.js API
├── nginx/                 # Nginx configuration
├── k8s/                   # Generic Kubernetes manifests
│   ├── base/
│   └── overlays/
│       ├── dev/
│       └── production/
├── ansible/               # VM automation (NEW)
│   ├── playbooks/
│   │   ├── setup-vm.yml    # Initial VM provisioning
│   │   ├── deploy.yml      # Application deployment
│   │   └── backup.yml      # Backup automation
│   └── inventory/
│       └── group_vars/
├── scripts/               # Utility scripts (NEW)
│   └── backup.sh          # MongoDB backup script
├── terraform-aws-archive/ # Deprecated AWS config (archived)
├── docs/
│   └── DEPLOYMENT.md      # Comprehensive deployment guide
├── .github/workflows/     # Updated CI/CD (GHCR, no AWS)
├── docker-compose.yml     # Enhanced with environment variables
├── .env.example           # Environment template (NEW)
└── README.md
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- For VM deployment: Ansible
- For Kubernetes: kubectl

### Local Development with Docker

```bash
# Clone the repository
git clone https://github.com/your-org/fullstack-app.git
cd fullstack-app

# Install dependencies
npm install

# Start all services with hot reload
npm run dev

# Or use Docker Compose
docker-compose up -d
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Nginx: http://localhost:80

## 🚀 Deployment Options

This application supports **three deployment methods**:

### 1. Docker Compose on VM (Recommended)

Simple deployment on any Linux VM.

```bash
# On your VM
git clone https://github.com/your-org/fullstack-app.git
cd fullstack-app

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start services
docker-compose up -d
```

### 2. Ansible + Docker Compose (Automated)

Automated VM provisioning and deployment.

```bash
# On your control machine
export VM_IP="192.168.1.100"

# Run initial VM setup (one-time)
ansible-playbook -i "${VM_IP}," ansible/playbooks/setup-vm.yml

# Deploy application
ansible-playbook -i "${VM_IP}," ansible/playbooks/deploy.yml
```

### 3. Kubernetes (Generic)

Deploy to any Kubernetes cluster.

```bash
# Deploy to development
kubectl apply -k k8s/overlays/dev/

# Deploy to production
kubectl apply -k k8s/overlays/production/

# Check status
kubectl get pods -n fullstack-production
```

## 📦 Available Commands

### Using Make

```bash
make help                    # Show all available commands

# Development
make dev                     # Start development servers
make docker-up               # Start containers

# Deployment
make deploy                  # Deploy with Docker Compose
make k8s-deploy ENV=dev      # Deploy to Kubernetes

# Maintenance
make backup                  # Create backup
make logs                    # View logs
```

### Using npm

```bash
npm run dev                  # Start all services
npm start                    # Start containers
npm stop                     # Stop containers
```

## 🌐 API Endpoints

- `GET /api` - Welcome message with database stats
- `GET /api/health` - Health check
- `GET /api/items` - Get all items (paginated)
- `GET /api/items/:id` - Get single item
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `PATCH /api/items/:id/archive` - Archive item
- `DELETE /api/items/:id` - Delete item
- `GET /api/stats` - Get statistics

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Container Registry
CONTAINER_REGISTRY=ghcr.io
IMAGE_OWNER=your-github-username
IMAGE_TAG=latest

# Application
NODE_ENV=production
FRONTEND_PORT=3000
BACKEND_PORT=5000

# Database
MONGODB_ROOT_USERNAME=admin
MONGODB_ROOT_PASSWORD=changeme
MONGODB_DATABASE=fullstack
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow:

1. **Lint & Test** - Runs on every push
2. **Build Images** - Pushes to **GitHub Container Registry (GHCR)**
3. **Security Scan** - Trivy vulnerability scanning
4. **Deploy Dev** - Auto-deploys develop branch via Ansible
5. **Deploy Staging** - Auto-deploys main branch via Ansible
6. **Deploy Production** - Manual approval required
7. **Backup** - Automatic backup on production deployment

### Required GitHub Secrets

- `SSH_PRIVATE_KEY` - SSH key for VM access
- `DEV_VM_HOST` / `DEV_VM_USER` - Development VM details
- `STAGING_VM_HOST` / `STAGING_VM_USER` - Staging VM details
- `PROD_VM_HOST` / `PROD_VM_USER` - Production VM details

**No registry secrets needed for GHCR** - uses `GITHUB_TOKEN` automatically!

## 🔄 DevOps Cycle

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Local     │ ───▶ │    Dev      │ ───▶ │  Staging    │
│ Development │      │  (Auto)     │      │   (Auto)    │
└─────────────┘      └─────────────┘      └─────────────┘
                                                  │
                                                  ▼
                                          ┌─────────────┐
                                          │ Production  │
                                          │  (Manual)   │
                                          └─────────────┘
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: DDoS protection
- **Input Validation**: Mongoose schemas
- **Fail2Ban**: Brute force protection (Ansible)
- **UFW Firewall**: Network isolation (Ansible)
- **Image Scanning**: Trivy security scans

## 💾 Backups

### Manual Backup

```bash
# Run backup script
./scripts/backup.sh

# Or via Docker Compose
docker-compose --profile backup run --rm backup
```

### Automated Backup

```bash
# Via Ansible
ansible-playbook -i inventory ansible/playbooks/backup.yml

# Via cron
0 2 * * * cd /opt/fullstack-app && ./scripts/backup.sh
```

## 📈 Monitoring & Logging

- **Health Checks**: `/health` endpoints on all services
- **Structured Logging**: JSON format with rotation
- **Log Aggregation**: Centralized in `/var/log/fullstack-app`
- **Resource Monitoring**: Container stats available via `docker stats`

## 🎯 Container Registries

This application supports **any** container registry:

### GitHub Container Registry (Default)

```bash
CONTAINER_REGISTRY=ghcr.io
IMAGE_OWNER=your-github-username
```

### Docker Hub

```bash
CONTAINER_REGISTRY=docker.io
IMAGE_OWNER=your-dockerhub-username
```

### Self-Hosted

```bash
CONTAINER_REGISTRY=registry.example.com
IMAGE_OWNER=your-project
```

## 🛠️ Troubleshooting

### Common Issues

**Container won't start:**
```bash
docker-compose logs backend
docker-compose ps
```

**Database connection errors:**
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

**Permission issues:**
```bash
sudo chown -R $USER:$USER /opt/fullstack-app
```

## 📚 Documentation

- [Deployment Guide](./docs/DEPLOYMENT.md) - Comprehensive deployment documentation
- [Ansible Playbooks](./ansible/README.md) - VM automation guide
- [Kubernetes Manifests](./k8s/README.md) - K8s deployment

## 🔄 Migration from AWS

If you're migrating from the previous AWS-specific setup:

1. AWS Terraform is archived in `terraform-aws-archive/`
2. CI/CD now uses GHCR instead of ECR
3. Deployment uses Ansible instead of EKS
4. No AWS SDK or credentials required

To deploy on AWS EC2 with the new setup:
1. Launch an Ubuntu EC2 instance
2. Use the Ansible playbooks to deploy
3. No EKS, VPC, or NAT Gateway configuration needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Vite team
- Express.js community
- Ansible project
- Kubernetes documentation
- GitHub Actions team
