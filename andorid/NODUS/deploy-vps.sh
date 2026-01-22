#!/bin/bash
# Deploy NODUS servers to VPS 194.87.103.193

VPS_IP="194.87.103.193"
VPS_USER="root"

echo "=== Deploying NODUS to VPS ==="

# Copy server files
scp -r server/vps/* $VPS_USER@$VPS_IP:/opt/nodus/

# SSH and setup
ssh $VPS_USER@$VPS_IP << 'EOF'
cd /opt/nodus

# Install dependencies
npm install

# Install PM2 if not present
which pm2 || npm install -g pm2

# Stop existing processes
pm2 delete nodus-relay 2>/dev/null
pm2 delete nodus-bootstrap 2>/dev/null

# Start services
pm2 start relay.js --name nodus-relay
pm2 start bootstrap.js --name nodus-bootstrap

# Save PM2 config
pm2 save

# Setup startup
pm2 startup

echo "=== Services started ==="
pm2 status
EOF

echo "=== Deployment complete ==="
echo "Relay: https://$VPS_IP:3000"
echo "Bootstrap: wss://$VPS_IP:3001"
