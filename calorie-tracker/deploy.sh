#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Apollo Calorie Tracker Deployment Script${NC}"
echo -e "-------------------------------------------"

# Check if git status is clean
if [[ $(git status --porcelain) ]]; then
  echo -e "${YELLOW}You have uncommitted changes. Recommended to commit before deploying.${NC}"
  read -p "Do you want to continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Deployment canceled.${NC}"
    exit 1
  fi
fi

# Build the application
echo -e "${GREEN}Building the application...${NC}"
npm run build

if [ $? -ne 0 ]; then
  echo -e "${RED}Build failed. See errors above.${NC}"
  exit 1
fi

# Ask which deployment type to use
echo -e "${YELLOW}Choose deployment type:${NC}"
echo "1) Frontend only (hosting)"
echo "2) Firestore rules only"
echo "3) Full deployment (hosting, firestore rules, indexes)"
read -p "Enter your choice (1-3): " deployment_choice

case $deployment_choice in
  1)
    echo -e "${GREEN}Deploying frontend to Firebase Hosting...${NC}"
    firebase deploy --only hosting
    ;;
  2)
    echo -e "${GREEN}Deploying Firestore rules...${NC}"
    firebase deploy --only firestore:rules
    ;;
  3)
    echo -e "${GREEN}Performing full deployment...${NC}"
    firebase deploy
    ;;
  *)
    echo -e "${RED}Invalid choice. Deployment canceled.${NC}"
    exit 1
    ;;
esac

if [ $? -eq 0 ]; then
  echo -e "${GREEN}Deployment successful!${NC}"
  echo -e "Your application is live at: ${YELLOW}https://apollo-7e76b.web.app${NC}"
else
  echo -e "${RED}Deployment failed. See errors above.${NC}"
  exit 1
fi 