.PHONY: help dev build test docker-build docker-up docker-down k8s-deploy k8s-logs clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## Development
dev: ## Start development environment with hot reload
	npm run dev

dev-frontend: ## Start only frontend dev server
	npm run dev:frontend

dev-backend: ## Start only backend dev server
	npm run dev:backend

## Building
build: ## Build frontend and backend
	npm run build

build-frontend: ## Build frontend only
	npm run build:frontend

build-backend: ## Build backend only
	npm run build:backend

## Testing
test: ## Run all tests
	npm test

test-unit: ## Run unit tests
	npm run test:unit

test-integration: ## Run integration tests
	npm run test:integration

test-coverage: ## Run tests with coverage
	npm run test:coverage

lint: ## Run linter
	npm run lint

lint-fix: ## Fix linting issues
	npm run lint:fix

## Docker
docker-build: ## Build Docker images
	docker-compose build

docker-up: ## Start Docker containers
	docker-compose up -d

docker-down: ## Stop Docker containers
	docker-compose down

docker-logs: ## View Docker logs
	docker-compose logs -f

docker-clean: ## Clean Docker resources
	docker-compose down -v
	docker system prune -f

docker-restart: ## Restart Docker containers
	docker-compose restart

## Infrastructure (Terraform)
tf-init: ## Initialize Terraform
	cd terraform/environments/$(ENV) && terraform init

tf-plan: ## Plan Terraform changes
	cd terraform/environments/$(ENV) && terraform plan -out=tfplan

tf-apply: ## Apply Terraform changes
	cd terraform/environments/$(ENV) && terraform apply tfplan

tf-destroy: ## Destroy Terraform infrastructure
	cd terraform/environments/$(ENV) && terraform destroy -auto-approve

tf-validate: ## Validate Terraform configuration
	cd terraform/environments/$(ENV) && terraform validate

tf-fmt: ## Format Terraform files
	terraform fmt -recursive terraform/

## Kubernetes
k8s-deploy: ## Deploy to Kubernetes (ENV=dev|staging|production)
	kubectl apply -k k8s/overlays/$(ENV)/

k8s-delete: ## Delete Kubernetes deployment (ENV=dev|staging|production)
	kubectl delete -k k8s/overlays/$(ENV)/

k8s-logs: ## View Kubernetes logs (SERVICE=backend|frontend, ENV=dev)
	kubectl logs -l app=$(SERVICE) -n fullstack-$(ENV) -f

k8s-pods: ## List Kubernetes pods (ENV=dev)
	kubectl get pods -n fullstack-$(ENV)

k8s-describe: ## Describe Kubernetes resource (RESOURCE, NAME, ENV=dev)
	kubectl describe $(RESOURCE) $(NAME) -n fullstack-$(ENV)

k8s-exec: ## Execute command in pod (POD, ENV=dev, CMD=/bin/sh)
	kubectl exec -it $(POD) -n fullstack-$(ENV) -- $(CMD)

k8s-port-forward: ## Port forward to local (POD, PORT=5000, ENV=dev, LOCAL=5000)
	kubectl port-forward $(POD) $(LOCAL):$(PORT) -n fullstack-$(ENV)

k8s-rollout: ## Rollout status (DEPLOYMENT, ENV=dev)
	kubectl rollout status deployment/$(DEPLOYMENT) -n fullstack-$(ENV)

k8s-restart: ## Restart deployment (DEPLOYMENT, ENV=dev)
	kubectl rollout restart deployment/$(DEPLOYMENT) -n fullstack-$(ENV)

k8s-undo: ## Undo last rollout (DEPLOYMENT, ENV=dev)
	kubectl rollout undo deployment/$(DEPLOYMENT) -n fullstack-$(ENV)

## CI/CD
ci: ## Run CI pipeline locally
	$(MAKE) lint
	$(MAKE) test
	$(MAKE) build

## Database
db-migrate: ## Run database migrations
	npm run db:migrate

db-seed: ## Seed database with sample data
	npm run db:seed

db-reset: ## Reset database (WARNING: deletes all data)
	npm run db:reset

db-backup: ## Backup database
	npm run db:backup

db-restore: ## Restore database (FILE=backup.dump)
	npm run db:restore -- $(FILE)

## Utilities
install: ## Install all dependencies
	npm run install:all

clean: ## Clean build artifacts
	rm -rf node_modules frontend/node_modules backend/node_modules
	rm -rf frontend/dist backend/dist
	rm -rf logs *.log

logs: ## View application logs
	tail -f logs/*.log

ps: ## Show running processes
	ps aux | grep -E "(node|npm)" | grep -v grep

## Production
deploy-dev: ## Deploy to development
	$(MAKE) k8s-deploy ENV=dev

deploy-staging: ## Deploy to staging
	$(MAKE) k8s-deploy ENV=staging

deploy-production: ## Deploy to production
	$(MAKE) k8s-deploy ENV=production

## Monitoring
health: ## Check health endpoints
	@echo "Frontend: $$(curl -s http://localhost:3000/health || echo 'Not reachable')"
	@echo "Backend:  $$(curl -s http://localhost:5000/health || echo 'Not reachable')"

metrics: ## Show application metrics
	curl -s http://localhost:5000/metrics | jq .

## Security
security-scan: ## Run security scans
	trivy image fullstack-backend:latest
	trivy image fullstack-frontend:latest

security-audit: ## Audit dependencies
	npm audit
	cd frontend && npm audit
	cd ../backend && npm audit

## Environment
env-setup: ## Setup environment files
	cp backend/.env.example backend/.env
	cp frontend/.env.example frontend/.env

## Documentation
docs-serve: ## Serve documentation locally
	npm run docs:serve

## Default
.DEFAULT_GOAL := help
