# Ansible Automation

This directory contains Ansible playbooks for provider-agnostic VM provisioning and application deployment.

## 📁 Structure

```
ansible/
├── ansible.cfg              # Ansible configuration
├── inventory/
│   ├── inventory.yml        # Inventory file
│   └── group_vars/
│       ├── all.yml          # Common variables
│       └── production.yml   # Production overrides
└── playbooks/
    ├── setup-vm.yml         # Initial VM setup
    ├── deploy.yml           # Application deployment
    └── backup.yml           # Backup automation
```

## 🚀 Quick Start

### Prerequisites

- Ansible installed on your control machine
- SSH access to target VMs
- Python 3 on target VMs (for Ansible modules)

### Installation

```bash
# Install Ansible on Ubuntu/Debian
sudo apt update
sudo apt install -y ansible

# Install Ansible on macOS
brew install ansible

# Install Ansible via pip
pip install ansible
```

### Configure Inventory

Edit `inventory/inventory.yml` with your VM details:

```yaml
production:
  hosts:
    prod-server:
      ansible_host: 192.168.1.100
      ansible_user: deploy
```

### Initial Setup

Run the setup playbook once per VM:

```bash
ansible-playbook -i inventory/inventory.yml playbooks/setup-vm.yml
```

This will:
- Create deployment user
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Set up Fail2Ban
- Tune system parameters
- Create necessary directories

### Deploy Application

```bash
ansible-playbook -i inventory/inventory.yml playbooks/deploy.yml \
  --extra-vars "target_environment=production" \
  --extra-vars "image_tag=main"
```

## 📋 Available Playbooks

### setup-vm.yml

Initial VM provisioning and hardening.

**Usage:**
```bash
ansible-playbook -i inventory/inventory.yml playbooks/setup-vm.yml
```

**What it does:**
- Creates deployment user with sudo access
- Installs Docker and Docker Compose
- Configures firewall rules
- Sets up Fail2Ban
- Creates application directories
- Tunes system parameters

### deploy.yml

Application deployment using Docker Compose.

**Usage:**
```bash
ansible-playbook -i inventory/inventory.yml playbooks/deploy.yml \
  --extra-vars "target_environment=production" \
  --extra-vars "image_tag=v1.0.0"
```

**What it does:**
- Pulls images from configured registry
- Generates environment file
- Deploys services via Docker Compose
- Runs health checks
- Cleans up old images

### backup.yml

Database and configuration backup.

**Usage:**
```bash
ansible-playbook -i inventory/inventory.yml playbooks/backup.yml
```

**What it does:**
- Creates MongoDB dump
- Backs up configuration files
- Compresses backup archive
- Removes old backups (per retention policy)
- Optionally copies to remote backup server

## 🔧 Configuration

### Variables

Edit `inventory/group_vars/all.yml` for common settings:

```yaml
# Application
app_name: fullstack-app
app_domain: example.com

# Container registry
container_registry: ghcr.io
image_owner: your-github-username

# Ports
frontend_port: 3000
backend_port: 5000
mongodb_port: 27017

# MongoDB
mongodb_root_username: admin
mongodb_root_password: changeme
```

Edit `inventory/group_vars/production.yml` for production overrides:

```yaml
# Use specific image tag
image_tag: main

# Enable monitoring
monitoring_enabled: true

# Configure SSL
ssl_enabled: true
```

### Secret Management

For sensitive data, use Ansible Vault:

```bash
# Encrypt a variable file
ansible-vault encrypt inventory/group_vars/vault.yml

# Edit encrypted file
ansible-vault edit inventory/group_vars/vault.yml

# Run playbook with vault
ansible-playbook -i inventory/inventory.yml playbooks/deploy.yml --ask-vault-pass
```

## 🔒 Security

### SSH Configuration

The playbooks expect SSH key-based authentication:

```bash
# Generate SSH key if needed
ssh-keygen -t rsa -b 4096 -C "deploy@example.com"

# Copy to target VM
ssh-copy-id deploy@your-vm-ip
```

### Firewall Rules

Default ports opened by setup playbook:
- SSH (22)
- HTTP (80)
- HTTPS (443)
- Application ports (3000, 5000)

Modify in `playbooks/setup-vm.yml` if needed.

## 📊 Monitoring

### Check Deployment Status

```bash
# Check running containers
ansible -i inventory/inventory.yml production -m shell -a "docker ps"

# Check service health
ansible -i inventory/inventory.yml production -m uri -a "url=http://localhost:3000/health"

# View logs
ansible -i inventory/inventory.yml production -m shell -a "docker-compose -f /opt/fullstack-app/docker-compose.yml logs --tail=50"
```

## 🔄 Rollback

### Rollback Deployment

```bash
# Deploy previous version
ansible-playbook -i inventory/inventory.yml playbooks/deploy.yml \
  --extra-vars "target_environment=production" \
  --extra-vars "image_tag=v0.9.0"
```

### Restore from Backup

```bash
# Restore playbook included in backup.yml
ansible-playbook -i inventory/inventory.yml playbooks/backup.yml \
  --extra-vars "backup_file=/opt/backups/fullstack-backup-1234567890.tar.gz" \
  --extra-vars "restore=true"
```

## 🧪 Testing

### Check Mode

Run playbooks in check mode to see changes without applying:

```bash
ansible-playbook -i inventory/inventory.yml playbooks/deploy.yml --check
```

### Dry Run

Test inventory connectivity:

```bash
ansible -i inventory/inventory.yml all -m ping
```

## 🐛 Troubleshooting

### Connection Issues

```bash
# Test SSH connection
ssh deploy@your-vm-ip

# Check Ansible can reach hosts
ansible -i inventory/inventory.yml all -m ping
```

### Permission Issues

```bash
# Run with become (sudo)
ansible-playbook -i inventory/inventory.yml playbooks/deploy.yml --become --ask-become-pass
```

### Debug Output

```bash
# Enable verbose output
ansible-playbook -i inventory/inventory.yml playbooks/deploy.yml -v
```

## 📚 Best Practices

1. **Use Version Control**: Keep your inventory in git
2. **Test First**: Use check mode before deploying to production
3. **Backup First**: Always run backup playbook before major changes
4. **Monitor Logs**: Check application logs after deployment
5. **Use Tags**: Tag tasks to run specific parts of playbooks
6. **Document Changes**: Update inventory files when infrastructure changes

## 🔗 Related Documentation

- [Main Deployment Guide](../docs/DEPLOYMENT.md)
- [Ansible Documentation](https://docs.ansible.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
