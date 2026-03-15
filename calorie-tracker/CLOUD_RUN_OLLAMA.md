# Deploying Ollama on Google Cloud Run (Pay-As-You-Go)

This guide explains how to deploy Ollama on Google Cloud Run with a pay-as-you-go pricing model for use with the Apollo Calorie Tracker app.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Automated Setup](#automated-setup)
- [Manual Setup](#manual-setup)
- [Understanding Costs](#understanding-costs)
- [Monitoring and Scaling](#monitoring-and-scaling)
- [Troubleshooting](#troubleshooting)
- [Alternative Deployment Options](#alternative-deployment-options)

## Overview

Google Cloud Run is a fully managed compute platform that automatically scales your stateless containers. Unlike traditional VM-based hosting, Cloud Run:

- Charges you only for the exact compute resources you consume
- Automatically scales from zero to multiple instances based on traffic
- Requires zero maintenance for underlying infrastructure
- Provides a pay-as-you-go pricing model with no minimum fees

This guide helps you deploy Ollama (an API server for running large language models) on Cloud Run to provide AI features for the Apollo Calorie Tracker app.

## Prerequisites

Before you begin, you'll need:

1. A Google Cloud Platform (GCP) account
2. The Google Cloud SDK (`gcloud`) installed on your computer
3. A GCP billing account
4. Firebase CLI installed (only if deploying the Firebase Function)

## Automated Setup

We've created a script that automates the entire setup process. This is the easiest way to deploy Ollama on Cloud Run.

### Using the Automated Script

1. Make the script executable:
   ```bash
   chmod +x scripts/setup-ollama-cloud-run.sh
   ```

2. Run the script:
   ```bash
   ./scripts/setup-ollama-cloud-run.sh
   ```

3. Follow the interactive prompts to configure and deploy your Ollama service.

The script will:
- Set up a GCP project (or use an existing one)
- Enable required APIs
- Deploy Ollama to Cloud Run
- Create a Cloud Storage bucket for models
- Update your Apollo app's configuration
- (Optionally) Update and deploy the Firebase function

## Manual Setup

If you prefer to set up the deployment manually or need to customize it beyond what the script offers, follow these steps:

### 1. Set up Google Cloud Project

```bash
# Login to GCP
gcloud auth login

# Create a new project (or use an existing one)
gcloud projects create [PROJECT_ID] --name="[PROJECT_NAME]"

# Set the active project
gcloud config set project [PROJECT_ID]

# Enable required APIs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 2. Set up Billing

```bash
# List available billing accounts
gcloud billing accounts list

# Link billing account to your project
gcloud billing projects link [PROJECT_ID] --billing-account=[BILLING_ACCOUNT_ID]
```

### 3. Deploy Ollama to Cloud Run

```bash
# Create a bucket for Ollama models
gsutil mb -l us-central1 gs://[PROJECT_ID]-ollama-models

# Deploy Ollama to Cloud Run
gcloud run deploy ollama-service \
  --image ollama/ollama:0.6.0 \
  --cpu 4 \
  --memory 16Gi \
  --concurrency 4 \
  --max-instances 2 \
  --set-env-vars OLLAMA_NUM_PARALLEL=4 \
  --set-env-vars OLLAMA_MODEL=mistral \
  --port 8080 \
  --set-env-vars OLLAMA_HOST=0.0.0.0:8080 \
  --add-volume name=models,type=cloud-storage,bucket=[PROJECT_ID]-ollama-models \
  --add-volume-mount volume=models,mount-path=/root/.ollama \
  --set-env-vars OLLAMA_MODELS=/root/.ollama/models \
  --set-env-vars OLLAMA_KEEP_ALIVE=300 \
  --timeout 3600 \
  --region us-central1 \
  --allow-unauthenticated
```

### 4. Update Apollo App Configuration

1. Get the URL of your deployed Cloud Run service:
   ```bash
   gcloud run services describe ollama-service --region=us-central1 --format='value(status.url)'
   ```

2. Update the `.env.production` file:
   ```
   VITE_AI_API_ENDPOINT=[YOUR_CLOUD_RUN_URL]/api/generate
   ```

3. Update the Firebase function in `functions/index.js`:
   ```javascript
   const OLLAMA_SERVER = '[YOUR_CLOUD_RUN_URL]/api/generate';
   ```

4. Deploy the updated Firebase function:
   ```bash
   cd functions && firebase deploy --only functions
   ```

5. Deploy the updated Apollo app:
   ```bash
   ./deploy.sh
   ```

## Understanding Costs

Cloud Run follows a pay-as-you-go pricing model where you're charged only for the resources you use. The costs are as follows (as of 2024):

### CPU and Memory Pricing (us-central1)
- CPU: $0.00001800 per vCPU-second
- Memory: $0.00000200 per GiB-second

### Example Cost Scenarios

**Idle Usage:**
- After 15 minutes of inactivity, instances scale to zero
- Cost when scaled to zero: $0

**Light Usage (10 requests/day, 10-second duration each):**
- ~100 seconds of compute time per day
- Monthly compute time: ~3,000 seconds
- 4 vCPU × 3,000 seconds = 12,000 vCPU-seconds
- 16 GiB × 3,000 seconds = 48,000 GiB-seconds
- Monthly cost: ~$0.30 (most covered by free tier)

**Medium Usage (100 requests/day, 10-second duration each):**
- ~1,000 seconds of compute time per day
- Monthly compute time: ~30,000 seconds
- 4 vCPU × 30,000 seconds = 120,000 vCPU-seconds
- 16 GiB × 30,000 seconds = 480,000 GiB-seconds
- Monthly cost: ~$3.30 (partially covered by free tier)

**Heavy Usage (1,000 requests/day, 10-second duration each):**
- ~10,000 seconds of compute time per day
- Monthly compute time: ~300,000 seconds
- 4 vCPU × 300,000 seconds = 1,200,000 vCPU-seconds
- 16 GiB × 300,000 seconds = 4,800,000 GiB-seconds
- Monthly cost: ~$33.00 (exceeds free tier)

> **Note**: These are estimates. Actual costs may vary based on exact usage patterns. Always monitor your actual usage and costs in the Google Cloud Console.

## Monitoring and Scaling

### Monitoring Your Service

Monitor your Cloud Run service using Google Cloud Console:
1. Go to [Cloud Run in the Console](https://console.cloud.google.com/run)
2. Click on your service (`ollama-service`)
3. View metrics for CPU utilization, memory usage, and request latency

### Custom Scaling Configuration

You can adjust the scaling behavior of your service:

```bash
# Update minimum and maximum instances
gcloud run services update ollama-service \
  --min-instances=0 \
  --max-instances=5 \
  --region=us-central1
```

## Troubleshooting

### Common Issues and Solutions

1. **Service takes too long to start**
   - This is normal for Ollama as it needs to download the model. Subsequent starts will be faster.
   - Consider increasing the timeout value with `--timeout=3600`

2. **"Memory limit exceeded" errors**
   - Increase memory: `--memory=32Gi`

3. **Slow response times**
   - Increase CPU: `--cpu=8`
   - Use the `--no-cpu-throttling` flag (note: increases costs)

4. **CORS errors from the Apollo app**
   - Ensure your Cloud Run service URL is correctly set in the Apollo app

### Checking Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ollama-service" --limit=10
```

## Alternative Deployment Options

### 1. Google Compute Engine (VMs)

If Cloud Run doesn't meet your needs, consider using a regular VM:

- **Pros**: More control, potentially lower cost for constant usage
- **Cons**: No automatic scaling, you pay even when idle

Basic deployment command:
```bash
gcloud compute instances create ollama-vm \
  --machine-type=e2-standard-4 \
  --image-family=debian-11 \
  --image-project=debian-cloud \
  --metadata=startup-script='#!/bin/bash
  curl -fsSL https://ollama.com/install.sh | sh
  systemctl enable ollama
  systemctl start ollama'
```

### 2. Google Kubernetes Engine (GKE)

For larger deployments or complex scaling needs:

- **Pros**: Advanced orchestration, high availability
- **Cons**: More complex setup, higher learning curve

### 3. Self-Hosting on Your Own Hardware

- **Pros**: Complete control, potentially lower cost
- **Cons**: Requires maintenance, no automatic scaling

## Support

If you encounter issues with this deployment, please:

1. Check the [Ollama GitHub repository](https://github.com/ollama/ollama) for common issues
2. Consult the [Google Cloud Run documentation](https://cloud.google.com/run/docs)
3. Raise an issue in the Apollo Calorie Tracker repository

---

Enjoy your pay-as-you-go Ollama service! 