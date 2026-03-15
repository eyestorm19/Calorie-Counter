# Use Ubuntu as base image
FROM ubuntu:22.04

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Create startup script that runs both Ollama and Node.js server
RUN echo '#!/bin/bash\nOLLAMA_HOST=0.0.0.0 ollama serve & sleep 5 && ollama pull mistral:7b && node server.js' > /app/start.sh && chmod +x /app/start.sh

# Start the application
CMD ["/app/start.sh"] 