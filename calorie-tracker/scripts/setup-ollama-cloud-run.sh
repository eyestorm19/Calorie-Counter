#!/bin/bash
# setup-ollama-cloud-run.sh
# Purpose: Automate the deployment of Ollama to Google Cloud Run
# Author: Apollo Team

# Set text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
  echo -e "${BLUE}[SETUP]${NC} $1"
}

# Print success message
print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Print warning message
print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Print error message
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if gcloud is installed
check_gcloud() {
  if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud SDK is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
  fi
  print_success "Google Cloud SDK is installed."
}

# Check if user is logged in to gcloud
check_gcloud_auth() {
  local account=$(gcloud config get-value account 2>/dev/null)
  if [[ -z "$account" ]]; then
    print_warning "You are not logged in to Google Cloud. Let's authenticate first."
    gcloud auth login
  else
    print_success "Logged in as $account"
  fi
}

# Select or create Google Cloud project
setup_project() {
  print_message "Listing your available GCP projects..."
  gcloud projects list
  
  echo ""
  read -p "Enter the project ID to use (leave blank to create a new project): " PROJECT_ID
  
  if [[ -z "$PROJECT_ID" ]]; then
    read -p "Enter a name for your new project: " PROJECT_NAME
    PROJECT_ID=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')-$(date +%s | cut -c 6-10)
    print_message "Creating new project: $PROJECT_NAME ($PROJECT_ID)..."
    gcloud projects create $PROJECT_ID --name="$PROJECT_NAME"
  fi
  
  print_message "Setting $PROJECT_ID as the active project..."
  gcloud config set project $PROJECT_ID
  
  # Enable required APIs
  print_message "Enabling required Google Cloud APIs..."
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
  
  print_success "Project setup complete!"
  return 0
}

# Setup billing for the project
setup_billing() {
  print_message "Cloud Run requires billing to be enabled for your project."
  print_message "Checking if billing is already enabled..."
  
  # Check if billing is already enabled
  if gcloud billing projects describe $PROJECT_ID &>/dev/null; then
    print_success "Billing is already enabled for this project."
    return 0
  fi
  
  print_message "Listing available billing accounts..."
  gcloud billing accounts list
  
  read -p "Enter the billing account ID to use (required for Cloud Run): " BILLING_ACCOUNT_ID
  
  if [[ -z "$BILLING_ACCOUNT_ID" ]]; then
    print_error "Billing account ID is required. Please visit https://console.cloud.google.com/billing to create one."
    exit 1
  fi
  
  # Link the billing account to the project
  print_message "Linking billing account to project..."
  gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID
  
  print_success "Billing setup complete!"
  return 0
}

# Deploy Ollama to Cloud Run
deploy_ollama() {
  print_message "Now setting up Ollama on Cloud Run..."
  
  # Ask which region to deploy to
  echo "Available regions for Cloud Run CPU-only deployment:"
  echo "1. us-central1 (Iowa) - Recommended"
  echo "2. us-east1 (South Carolina)"
  echo "3. us-west1 (Oregon)"
  echo "4. europe-west1 (Belgium)"
  echo "5. asia-east1 (Taiwan)"
  read -p "Select region (1-5, default: 1): " REGION_CHOICE
  
  case $REGION_CHOICE in
    2) REGION="us-east1";;
    3) REGION="us-west1";;
    4) REGION="europe-west1";;
    5) REGION="asia-east1";;
    *) REGION="us-central1";;
  esac
  
  print_message "Using region: $REGION"
  
  # Ask which Ollama model to use
  echo "Which Ollama model would you like to deploy?"
  echo "1. mistral (Recommended - good balance of performance and quality)"
  echo "2. llama2 (Meta's model)"
  echo "3. gemma2:2b (Google's smaller model)"
  read -p "Select model (1-3, default: 1): " MODEL_CHOICE
  
  case $MODEL_CHOICE in
    2) MODEL="llama2";;
    3) MODEL="gemma2:2b";;
    *) MODEL="mistral";;
  esac
  
  print_message "Using model: $MODEL"
  
  # Ask about CPU and memory
  echo "Choose a configuration for your service:"
  echo "1. Standard (4 CPU, 16 GiB RAM) - Recommended for most use cases"
  echo "2. Performance (8 CPU, 32 GiB RAM) - Better performance, higher cost"
  read -p "Select configuration (1-2, default: 1): " CONFIG_CHOICE
  
  if [[ "$CONFIG_CHOICE" == "2" ]]; then
    CPU="8"
    MEMORY="32Gi"
  else
    CPU="4"
    MEMORY="16Gi"
  fi
  
  print_message "Using CPU: $CPU, Memory: $MEMORY"
  
  # Choose a service name
  read -p "Enter a name for your Cloud Run service (default: ollama-service): " SERVICE_NAME
  if [[ -z "$SERVICE_NAME" ]]; then
    SERVICE_NAME="ollama-service"
  fi
  
  # Create a Cloud Storage bucket for models (if it doesn't exist)
  BUCKET_NAME="${PROJECT_ID}-ollama-models"
  if ! gsutil ls -b gs://${BUCKET_NAME} &>/dev/null; then
    print_message "Creating Cloud Storage bucket for Ollama models..."
    gsutil mb -l ${REGION} gs://${BUCKET_NAME}
  fi
  
  # Deploy the service
  print_message "Deploying Ollama to Cloud Run..."
  print_message "This may take several minutes..."
  
  # Run the gcloud command to deploy Ollama
  gcloud run deploy ${SERVICE_NAME} \
    --image ollama/ollama:0.6.0 \
    --cpu ${CPU} \
    --memory ${MEMORY} \
    --concurrency 4 \
    --max-instances 2 \
    --set-env-vars OLLAMA_NUM_PARALLEL=4 \
    --set-env-vars OLLAMA_MODEL=${MODEL} \
    --port 8080 \
    --set-env-vars OLLAMA_HOST=0.0.0.0:8080 \
    --add-volume name=models,type=cloud-storage,bucket=${BUCKET_NAME} \
    --add-volume-mount volume=models,mount-path=/root/.ollama \
    --set-env-vars OLLAMA_MODELS=/root/.ollama/models \
    --set-env-vars OLLAMA_KEEP_ALIVE=300 \
    --timeout 3600 \
    --region ${REGION} \
    --allow-unauthenticated
  
  # Get the URL of the deployed service
  SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')
  
  print_success "Ollama has been deployed to Cloud Run!"
  print_success "Service URL: ${SERVICE_URL}"
  
  # Return the service URL for use in updating the Apollo app
  OLLAMA_URL="${SERVICE_URL}/api/generate"
  return 0
}

# Update Apollo app configuration
update_apollo_config() {
  print_message "Updating Apollo app configuration to use Cloud Run Ollama..."
  
  # Update .env.production file
  ENV_FILE="$(dirname "$0")/../.env.production"
  
  # Check if file exists
  if [[ ! -f "$ENV_FILE" ]]; then
    print_error "Could not find .env.production file at: $ENV_FILE"
    return 1
  }
  
  # Replace the API endpoint
  sed -i.bak "s|VITE_AI_API_ENDPOINT=.*|VITE_AI_API_ENDPOINT=${OLLAMA_URL}|" "$ENV_FILE"
  
  # Add a note about the Cloud Run service
  echo "" >> "$ENV_FILE"
  echo "# Cloud Run Ollama service deployed on: $(date)" >> "$ENV_FILE"
  echo "# Region: ${REGION}" >> "$ENV_FILE"
  echo "# Model: ${MODEL}" >> "$ENV_FILE"
  
  print_success "Updated .env.production with Cloud Run Ollama URL: ${OLLAMA_URL}"
  
  # Ask if the user wants to update the firebase function
  read -p "Do you want to update the Firebase function to connect to the Cloud Run Ollama service? (y/n): " UPDATE_FUNCTION
  
  if [[ "$UPDATE_FUNCTION" == "y" || "$UPDATE_FUNCTION" == "Y" ]]; then
    update_firebase_function
  fi
  
  return 0
}

# Update Firebase function
update_firebase_function() {
  print_message "Updating Firebase function to connect to Cloud Run Ollama..."
  
  # Update functions/index.js file
  FUNCTION_FILE="$(dirname "$0")/../functions/index.js"
  
  # Check if file exists
  if [[ ! -f "$FUNCTION_FILE" ]]; then
    print_error "Could not find functions/index.js file at: $FUNCTION_FILE"
    return 1
  }
  
  # Create a backup
  cp "$FUNCTION_FILE" "${FUNCTION_FILE}.bak"
  
  # Replace the Ollama server address in the function
  sed -i.bak "s|const OLLAMA_SERVER = .*|const OLLAMA_SERVER = '${OLLAMA_URL}';  // Cloud Run Ollama service|" "$FUNCTION_FILE"
  
  print_success "Updated Firebase function to use Cloud Run Ollama service"
  
  # Ask if user wants to deploy the updated function
  read -p "Do you want to deploy the updated Firebase function now? (y/n): " DEPLOY_FUNCTION
  
  if [[ "$DEPLOY_FUNCTION" == "y" || "$DEPLOY_FUNCTION" == "Y" ]]; then
    print_message "Deploying updated Firebase function..."
    cd "$(dirname "$0")/../functions" && firebase deploy --only functions
    print_success "Firebase function deployed!"
  else
    print_message "You can deploy the function later using: cd functions && firebase deploy --only functions"
  fi
  
  return 0
}

# Main function to run the script
main() {
  echo "=========================================================="
  echo "           OLLAMA CLOUD RUN DEPLOYMENT SETUP              "
  echo "=========================================================="
  echo "This script will help you deploy Ollama to Google Cloud Run"
  echo "with pay-as-you-go pricing."
  echo ""
  
  # Check prerequisites
  check_gcloud
  check_gcloud_auth
  
  # Setup project and billing
  setup_project
  setup_billing
  
  # Deploy Ollama to Cloud Run
  deploy_ollama
  
  # Update Apollo app configuration
  update_apollo_config
  
  echo ""
  echo "=========================================================="
  echo "                  DEPLOYMENT COMPLETE!                    "
  echo "=========================================================="
  echo "Your Ollama AI service is now running on Cloud Run at:"
  echo "${OLLAMA_URL}"
  echo ""
  echo "Monthly cost estimate (pay-as-you-go):"
  echo "- When idle: $0 (scales to zero after 15 minutes)"
  echo "- Light usage: ~$10-20/month"
  echo "- Medium usage: ~$30-50/month"
  echo ""
  echo "To deploy your updated Apollo app to Firebase Hosting, run:"
  echo "cd $(dirname "$0")/../ && ./deploy.sh"
  echo ""
  echo "Enjoy your pay-as-you-go Ollama service!"
  echo "=========================================================="
  
  return 0
}

# Run the script
main "$@" 