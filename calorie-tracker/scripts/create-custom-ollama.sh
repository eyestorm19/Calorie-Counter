#!/bin/bash
# create-custom-ollama.sh
# Purpose: Build and deploy a custom Ollama container with CORS support

# Set text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print messages
print_message() { echo -e "${BLUE}[SETUP]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check prerequisites
if ! command -v docker &> /dev/null; then
  print_error "Docker is not installed. Please install it first."
  exit 1
fi
print_success "Docker is installed."

if ! command -v gcloud &> /dev/null; then
  print_warning "Google Cloud SDK is not installed. You'll need it for deployment."
  read -p "Continue without gcloud? (y/n): " CONTINUE
  if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
    exit 1
  fi
  HAVE_GCLOUD=false
else
  HAVE_GCLOUD=true
  print_success "Google Cloud SDK is installed."
fi

# Create Dockerfile
DOCKERFILE="$(dirname "$0")/Dockerfile.ollama-custom"
NGINX_CONF="$(dirname "$0")/nginx-cors.conf"

print_message "Creating custom Dockerfile with Nginx for CORS..."
cat > "$DOCKERFILE" << 'EOF'
FROM ollama/ollama:0.6.0 as ollama
FROM nginx:alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy Ollama binary and dependencies
COPY --from=ollama /bin/ollama /bin/ollama
COPY --from=ollama /usr/local/lib /usr/local/lib

# Set environment variables
ENV OLLAMA_HOST=127.0.0.1:11434
ENV OLLAMA_KEEP_ALIVE=300
ENV OLLAMA_NUM_PARALLEL=4
ENV OLLAMA_MODEL=mistral

# Create directories for models
RUN mkdir -p /root/.ollama/models && chmod -R 755 /root/.ollama

# Copy Nginx configuration with CORS support
COPY nginx-cors.conf /etc/nginx/conf.d/default.conf

# Expose the HTTP port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start Ollama and Nginx
CMD sh -c "ollama serve & nginx -g 'daemon off;'"
EOF
print_success "Created custom Dockerfile"

# Build the container
read -p "Enter a name/tag for your container (default: custom-ollama:latest): " CONTAINER_TAG
if [[ -z "$CONTAINER_TAG" ]]; then
  CONTAINER_TAG="custom-ollama:latest"
fi

print_message "Building custom Ollama container..."
docker build -f "$DOCKERFILE" -t "$CONTAINER_TAG" "$(dirname "$0")"

if [ $? -eq 0 ]; then
  print_success "Successfully built container: $CONTAINER_TAG"
else
  print_error "Failed to build container"
  exit 1
fi

# Push to registry if possible
if [[ "$HAVE_GCLOUD" == "true" ]]; then
  read -p "Push this container to Google Container Registry? (y/n): " PUSH_TO_GCR
  if [[ "$PUSH_TO_GCR" == "y" || "$PUSH_TO_GCR" == "Y" ]]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [[ -z "$PROJECT_ID" ]]; then
      print_message "Listing available GCP projects..."
      gcloud projects list
      read -p "Enter the project ID to use: " PROJECT_ID
      gcloud config set project "$PROJECT_ID"
    fi
    
    print_message "Enabling required APIs..."
    gcloud services enable artifactregistry.googleapis.com containerregistry.googleapis.com
    
    GCR_TAG="gcr.io/$PROJECT_ID/ollama-custom:latest"
    print_message "Tagging and pushing container as: $GCR_TAG"
    docker tag "$CONTAINER_TAG" "$GCR_TAG"
    gcloud auth configure-docker
    docker push "$GCR_TAG"
    
    if [ $? -eq 0 ]; then
      print_success "Successfully pushed container to GCR: $GCR_TAG"
      print_message "To use this container with Cloud Run, update the --image parameter in setup-ollama-cloud-run.sh"
    fi
  fi
fi

# Test locally
read -p "Run the container locally for testing? (y/n): " RUN_LOCAL
if [[ "$RUN_LOCAL" == "y" || "$RUN_LOCAL" == "Y" ]]; then
  print_message "Running container locally at http://localhost:8080..."
  docker run -p 8080:8080 "$CONTAINER_TAG"
fi

print_success "Custom Ollama container setup complete!" 