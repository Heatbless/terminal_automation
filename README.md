# Automation System - Quick Start Guide

A full-stack automation system with QR code registration, scanning, and MQTT-based pump control. Built with React, Node-RED, ThingsBoard, Mosquitto MQTT broker, and Supabase.

## Prerequisites

### Windows
- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
  - **Important**: Docker Desktop must be configured to run **Linux containers** (uses WSL2 backend by default)
  - To verify your Docker mode, run:
    ```bash
    docker info --format '{{.OSType}}'
    ```
    - Should output `linux` (correct) — not `windows`
  - If output is `windows`, right-click Docker Desktop system tray icon → "Switch to Linux containers"
- [Git for Windows](https://git-scm.com/download/win)

> **Note**: The Dockerfile uses Linux base images (`node:20-alpine`, `nginx:alpine`). Docker Desktop with WSL2 backend handles this automatically. If you cannot use WSL2, Docker Desktop will use Hyper-V to run Linux containers.

### Linux
- Docker Engine and Docker Compose
  ```bash
  # Ubuntu/Debian
  sudo apt update
  sudo apt install docker.io docker-compose
  
  # Add your user to docker group (to run without sudo)
  sudo usermod -aG docker $USER
  newgrp docker
  ```

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd automation
```

### 2. Configure Environment Variables

Navigate to the frontend directory and set up your Supabase credentials:

```bash
cd frontend
cp .env.example .env
```

Edit `.env` and add your Supabase configuration:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Start the Services

From the root directory (`automation/`):

**Windows (PowerShell/CMD):**
```bash
docker compose up -d
```

**Linux:**
```bash
docker compose up -d
```

This will start all services:
- **Frontend** (React + Vite + Nginx) - http://localhost:80
- **ThingsBoard** - http://localhost:9090
- **Mosquitto MQTT Broker** - ports 1885, 9001
- **Node-RED** - http://localhost:1880

### 4. Access the Application

- **Main App**: http://localhost
  - Register page: http://localhost/
  - Scanner page: http://localhost/scanner (localhost only)
  - Admin page: http://localhost/admin (localhost only)

- **ThingsBoard Dashboard**: http://localhost:9090
  - Default credentials: `tenant@thingsboard.org` / `tenant`

- **Node-RED**: http://localhost:1880

## Project Structure

```
automation/
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/         # Register, Scanner, Admin pages
│   │   └── components/    # LocalhostOnly wrapper
│   ├── nginx/             # Nginx configuration
│   └── Dockerfile
├── node-red-data/         # Node-RED flows and settings
├── mosquitto/             # MQTT broker configuration
├── data/                  # ThingsBoard data and logs
└── docker-compose.yaml    # Service orchestration
```

## Services Overview

### Frontend (Port 80)
- React application with QR code registration and scanning
- Routes:
  - `/` - Public registration page
  - `/scanner` - QR scanner (localhost only)
  - `/admin` - Database management (localhost only)
- MQTT WebSocket connections proxied through nginx

### ThingsBoard (Port 9090)
- IoT platform for device management
- MQTT port: 1883

### Mosquitto (Ports 1885, 9001)
- Primary MQTT broker
- Port 1885: MQTT TCP
- Port 9001: WebSocket

### Node-RED (Ports 1880, 1886)
- Flow-based automation
- Port 1880: Web interface
- Port 1886: Backup MQTT broker (Aedes)

## Database Setup (Supabase)

You need to create the following tables in your Supabase project:

### 1. `truck` table
```sql
CREATE TABLE truck (
  id SERIAL PRIMARY KEY,
  driver_id VARCHAR(6) NOT NULL,
  plate_num VARCHAR(10) NOT NULL,
  UNIQUE(driver_id, plate_num)
);
```

### 2. `access` table
```sql
CREATE TABLE access (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id VARCHAR(6) NOT NULL,
  plate_num VARCHAR(10) NOT NULL,
  UNIQUE(driver_id, plate_num)
);
```

### 3. `access_log` table
```sql
CREATE TABLE access_log (
  id SERIAL PRIMARY KEY,
  uid UUID NOT NULL,
  driver_id VARCHAR(6) NOT NULL,
  plate_num VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Stopping the Services

```bash
docker compose down
```

To also remove volumes (data will be lost):
```bash
docker compose down -v
```

## Rebuilding After Changes

If you make changes to the frontend code:

```bash
docker compose up --build -d frontend
```

To rebuild all services:

```bash
docker compose up --build -d
```

## Troubleshooting

### Port Already in Use
If you get port conflict errors:
- **Windows**: Check Docker Desktop settings or stop conflicting applications
- **Linux**: Find and stop the process using the port
  ```bash
  sudo lsof -i :80  # Check what's using port 80
  sudo systemctl stop nginx  # Example: stop nginx if running
  ```

### MQTT Not Connecting
- Check if Mosquitto container is running: `docker ps`
- View Mosquitto logs: `docker logs custom_broker`
- Verify nginx is proxying correctly: `docker logs react_frontend`

### Supabase Connection Issues
- Verify `.env` file has correct credentials
- Check network connectivity to Supabase
- Ensure Supabase project is not paused

### Permission Issues (Linux)
```bash
sudo chown -R $USER:$USER /path/to/automation
```

## Development

### Running Frontend in Development Mode

```bash
cd frontend
npm install
npm run dev
```

The dev server will run on port 80 with hot-reload enabled.

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f thingsboard
docker compose logs -f mosquitto
docker compose logs -f nodered
```
