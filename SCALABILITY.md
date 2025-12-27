# Scalability & Production Deployment Guide

This document outlines the architecture decisions and deployment recommendations for running the Credit Card Analyzer at scale.

## Current Architecture

The application is designed with **stateless request handling**, making it suitable for horizontal scaling:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Load Balancer │────▶│  Backend Pod 1  │────▶│   OpenRouter    │
│   (ALB / NGINX) │────▶│  Backend Pod 2  │────▶│   AI API        │
│                 │────▶│  Backend Pod N  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Health: /health│
                        └─────────────────┘
```

## Key Design Decisions

### Stateless Processing
- PDFs are processed entirely in-memory
- No session state or sticky sessions required
- Each request is independent and can be handled by any backend instance

### Ephemeral Data
- Raw PDF data is never persisted to disk
- Sensitive data is explicitly cleared after processing
- Garbage collection is triggered after each request

## Docker Deployment

### Dockerfile (Backend)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ .

# Run with uvicorn
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Kubernetes Deployment

### Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: credit-analyzer-backend
spec:
  replicas: 3  # Adjust based on load
  selector:
    matchLabels:
      app: credit-analyzer-backend
  template:
    metadata:
      labels:
        app: credit-analyzer-backend
    spec:
      containers:
      - name: backend
        image: your-registry/credit-analyzer-backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENROUTER_API_KEY
          valueFrom:
            secretKeyRef:
              name: credit-analyzer-secrets
              key: openrouter-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: credit-analyzer-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: credit-analyzer-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Cloud Run Deployment (GCP)

```bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/credit-analyzer-backend

# Deploy
gcloud run deploy credit-analyzer-backend \
  --image gcr.io/PROJECT_ID/credit-analyzer-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "OPENROUTER_API_KEY=your-key"
```

## Performance Considerations

### PDF Processing
- Typical 3-page PDF: **< 5 seconds** total processing time
- Most time spent in AI API call (network-bound)
- Text extraction itself is fast (~100-500ms)

### Bottlenecks
1. **OpenRouter API Rate Limits**: Mitigated by model rotation
2. **Memory per request**: ~50-100MB for large PDFs
3. **Network latency**: Consider regional deployment close to users

### Recommendations
- Use connection pooling for API requests
- Consider caching extracted text for retry scenarios
- Monitor memory usage per pod

## Monitoring & Observability

### Key Metrics to Track
- Request latency (p50, p95, p99)
- PDF parsing duration (logged in stdout)
- Health check success rate
- Memory usage per instance
- AI API error rates by model

### Logging
Performance logs are emitted to stdout:
```
PDF parsing completed in 2.34s
```

Integrate with your logging solution (CloudWatch, Stackdriver, ELK).

## Security in Production

### Network Security
- Deploy behind WAF (Web Application Firewall)
- Use TLS termination at load balancer
- Restrict CORS origins (currently `*` - update for production)

### Secrets Management
- Use Kubernetes Secrets or cloud secret managers
- Never commit API keys to source control
- Rotate API keys periodically

## Availability Target: 99.9%

To achieve 99.9% uptime:
1. **Multi-AZ deployment** - Spread pods across availability zones
2. **Health checks** - `/health` endpoint for automatic failover
3. **Auto-scaling** - Handle traffic spikes automatically
4. **Circuit breakers** - Graceful degradation on AI API failures
5. **Monitoring & Alerting** - Proactive issue detection
