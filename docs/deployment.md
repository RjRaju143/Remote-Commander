# Deployment Guide

## Prerequisites

- Node.js 20+
- MongoDB database
- Environment variables configured

## Manual Deployment

### 1. Environment Setup

Create `.env` file with required variables:
```bash
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/remote-commander
ENCRYPTION_SECRET=your-encryption-secret
GEMINI_API_KEY=your-gemini-api-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER="smtp-user"
SMTP_PASS="smtp-password"
SENDER_EMAIL="smtp-email"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Application

```bash
npm run build
```

### 4. Start Production Server

```bash
npm start
```

The application will be available at `http://localhost:3000`

### 5. Process Management (Optional)

Use PM2 for production process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start with ecosystem config
pm2 start ecosystem.config.cjs

# Or start directly
pm2 start npm --name "remote-commander" -- start
```

## Docker Deployment

### 1. Build Docker Image

```bash
docker build -t remote-commander .
```

### 2. Run Container

```bash
docker run -d \
  --name remote-commander \
  -p 3000:3000 \
  -e MONGODB_URI="your-mongodb-uri" \
  -e ENCRYPTION_SECRET="your-encryption-secret" \
  -e GEMINI_API_KEY="your-gemini-api-key" \
  -e NODE_ENV="production" \
  -e SMTP_HOST="smtp.gmail.com" \
  -e SMTP_PORT=465 \
  -e SMTP_USER="smtp-user" \
  -e SMTP_PASS="smtp-password" \
  -e SENDER_EMAIL="smtp-email" \
  remote-commander
```

### 3. Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=${NODE_ENV}
      - MONGODB_URI=${MONGODB_URI}
      - ENCRYPTION_SECRET=${ENCRYPTION_SECRET}
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - SMTP_HOST=${SMTP_HOST}
      - SMTP_PORT=${SMTP_PORT}
      - SMTP_USER=${SMTP_USER}
      - SMTP_PASS=${SMTP_PASS}
      - SENDER_EMAIL=${SENDER_EMAIL}

    depends_on:
      - mongodb
    restart: unless-stopped

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

Run with:
```bash
docker-compose up -d
```

## Production Considerations

### Security
- Use strong JWT and encryption secrets
- Enable HTTPS in production
- Configure firewall rules
- Use environment-specific MongoDB credentials

### Performance
- Configure MongoDB indexes
- Enable Next.js caching
- Use CDN for static assets
- Monitor resource usage

### Monitoring
- Set up application logs
- Monitor MongoDB performance
- Configure health checks
- Set up alerts for downtime

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

**MongoDB connection issues:**
- Verify MongoDB is running
- Check connection string format
- Ensure network connectivity

**Build failures:**
- Clear node_modules and reinstall
- Check Node.js version compatibility
- Verify all environment variables are set