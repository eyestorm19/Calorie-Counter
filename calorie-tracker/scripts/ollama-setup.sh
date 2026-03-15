#!/bin/bash
# ollama-setup.sh
# Purpose: Download and set up all supported Ollama models for Apollo development

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

# Check if Ollama is installed
check_ollama() {
  if ! command -v ollama &> /dev/null; then
    print_error "Ollama is not installed. Please install it first from https://ollama.com/download"
    exit 1
  fi
  print_success "Ollama is installed."
}

# Check if Ollama is running
check_ollama_running() {
  if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
    print_warning "Ollama is not running or not responding."
    print_message "Starting Ollama..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      open -a Ollama
      sleep 5
    else
      # Linux
      ollama serve &
      sleep 5
    fi
    
    # Check again
    if ! curl -s http://localhost:11434/api/tags &> /dev/null; then
      print_error "Failed to start Ollama. Please start it manually with 'ollama serve' and run this script again."
      exit 1
    fi
  fi
  print_success "Ollama is running."
}

# Download a model
download_model() {
  local model=$1
  print_message "Checking if model '$model' is already downloaded..."
  
  if ollama list | grep -q "$model"; then
    print_success "Model '$model' is already downloaded."
    return 0
  else
    print_message "Downloading model '$model'..."
    ollama pull $model
    if [ $? -eq 0 ]; then
      print_success "Successfully downloaded model '$model'."
    else
      print_error "Failed to download model '$model'."
      return 1
    fi
  fi
}

# Main function
main() {
  echo "=========================================================="
  echo "           OLLAMA MODEL SETUP FOR APOLLO APP              "
  echo "=========================================================="
  echo "This script will download all supported models for"
  echo "development use with the Apollo Calorie Tracker."
  echo ""
  
  # Check prerequisites
  check_ollama
  check_ollama_running
  
  # Download models
  print_message "Setting up Apollo's supported Ollama models..."
  
  # Mistral - our default model
  download_model "mistral"
  
  # Ask about downloading additional models
  read -p "Download Llama2 model? This is larger (~4GB) and may take some time (y/n): " DOWNLOAD_LLAMA
  if [[ "$DOWNLOAD_LLAMA" == "y" || "$DOWNLOAD_LLAMA" == "Y" ]]; then
    download_model "llama2"
  fi
  
  read -p "Download DistilBERT model? (y/n): " DOWNLOAD_DISTILBERT
  if [[ "$DOWNLOAD_DISTILBERT" == "y" || "$DOWNLOAD_DISTILBERT" == "Y" ]]; then
    download_model "distilbert"
  fi
  
  echo ""
  echo "=========================================================="
  echo "                  SETUP COMPLETE!                         "
  echo "=========================================================="
  echo "You can now use the Apollo app with the following models:"
  ollama list
  echo ""
  echo "To start developing with Apollo and toggle between models:"
  echo "1. Run 'npm run dev' in the calorie-tracker directory"
  echo "2. Use the model selector at the top of the chat interface"
  echo "=========================================================="
  
  return 0
}

# Run the script
main "$@" 