# Fullstack Docker Application

A production-ready fullstack JavaScript application with Vite + React frontend, Express.js backend, MongoDB database, and Nginx reverse proxy. Fully containerized with Infrastructure as Code using Terraform and Kubernetes.

## 🚀 Tech Stack

- **Frontend**: Vite + React
- **Backend**: Express.js + Mongoose
- **Database**: MongoDB
- **Web Server**: Nginx (reverse proxy & load balancer)
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (EKS)
- **Infrastructure**: Terraform (AWS)
- **CI/CD**: GitHub Actions

## 📁 Project Structure

```
.
├── frontend/              # Vite + React application
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── backend/               # Express.js API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── nginx/                 # Nginx configuration
│   └── nginx.conf
├── k8s/                   # Kubernetes manifests
│   ├── base/
│   └── overlays/
│       ├── dev/
│       └── production/
├── terraform/             # Infrastructure as Code
│   ├── modules/
│   │   ├── network/
│   │   ├── compute/
│   │   └── database/
│   └── environments/
│       ├── dev/
│       └── production/
├── .github/workflows/     # CI/CD pipelines
├── docker-compose.yml
├── Makefile
└── README.md
```

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- kubectl (for Kubernetes)
- Terraform (for IaC)
- AWS CLI (for cloud deployment)

### Local Development with Docker

```bash
# Install dependencies
make install

# Start all services (Frontend + Backend + MongoDB + Nginx)
make docker-up

# Or using npm
npm install
npm start
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Nginx: http://localhost:80
- MongoDB: mongodb://localhost:27017

### Local Development (Hot Reload)

```bash
# Start frontend and backend with hot reload
make dev

# Or using npm
npm run dev
```

## 📦 Available Commands

### Using Make (Recommended)

```bash
make help                    # Show all available commands

# Development
make dev                     # Start development servers
make dev-frontend            # Start only frontend
make dev-backend             # Start only backend

# Docker
make docker-build            # Build Docker images
make docker-up               # Start containers
make docker-down             # Stop containers
make docker-logs             # View logs
make docker-clean            # Clean up resources

# Kubernetes
make k8s-deploy ENV=dev      # Deploy to Kubernetes
make k8s-logs ENV=dev SERVICE=backend
make k8s-restart ENV=dev DEPLOYMENT=backend

# Terraform
make tf-plan ENV=dev         # Plan infrastructure
make tf-apply ENV=dev        # Apply infrastructure
```

### Using npm

```bash
# Development
npm run dev                  # Start all services
npm run dev:frontend         # Frontend only
npm run dev:backend          # Backend only

# Building
npm run build                # Build for production
npm run build:frontend       # Frontend only
npm run build:backend        # Backend only

# Docker
npm start                    # Start containers
npm stop                     # Stop containers
npm run docker:logs          # View logs
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

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:5000/api
```

### Backend (.env)
```bash
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://admin:password@mongodb:27017/fullstack?authSource=admin
DB_NAME=fullstack
DB_USERNAME=admin
DB_PASSWORD=password
```

## 🚀 Deployment

### Docker Compose (Local/Small Production)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Kubernetes (On-Premise/Cloud)

```bash
# Deploy to development
kubectl apply -k k8s/overlays/dev/

# Deploy to production
kubectl apply -k k8s/overlays/production/

# Check status
kubectl get pods -n fullstack-production
kubectl get svc -n fullstack-production
```

### Terraform (AWS Cloud)

```bash
# Initialize
cd terraform/environments/dev
terraform init

# Plan changes
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan

# Get outputs
terraform output
```

## 🔄 CI/CD Pipeline

The GitHub Actions workflow automates:

1. **Lint & Test** - Runs on every push
2. **Build Images** - Builds and pushes to ECR
3. **Security Scan** - Scans images with Trivy
4. **Deploy Dev** - Auto-deploys develop branch
5. **Deploy Staging** - Auto-deploys main branch
6. **Deploy Production** - Manual approval required

See `.github/workflows/ci-cd.yml` for details.

## 📊 DevOps Cycle

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
- **Secret Management**: Kubernetes secrets
- **Network Policies**: VPC isolation
- **Image Scanning**: Trivy security scans

## 📈 Monitoring & Logging

- **Health Checks**: `/health` endpoints
- **Logs**: JSON file logging with rotation
- **Metrics**: CloudWatch integration
- **Alerts**: Configurable thresholds

## 🛠️ Troubleshooting

### Common Issues

**MongoDB Connection Error:**
```bash
# Check MongoDB is running
docker ps | grep mongo

# Check connection string
echo $MONGODB_URI
```

**Pods Not Starting:**
```bash
# Describe pod
kubectl describe pod <pod-name> -n fullstack-production

# View logs
kubectl logs <pod-name> -n fullstack-production
```

**High Memory Usage:**
```bash
# Check resource usage
kubectl top pods -n fullstack-production
```

## 📚 Documentation

- [DevOps Pipeline](./docs/DEVOPS_PIPELINE.md) - Complete CI/CD documentation
- [Terraform](./terraform/README.md) - Infrastructure documentation
- [Kubernetes](./k8s/README.md) - K8s deployment guide

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
- Kubernetes documentation
- Terraform providers
