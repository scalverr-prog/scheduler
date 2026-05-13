#!/bin/bash
# Azure Deployment Script for Patient Scheduler
# Prerequisites: Azure CLI installed and logged in (az login)

set -e

# Configuration - Update these values
RESOURCE_GROUP="rg-patient-scheduler-prod"
LOCATION="westus"  # User preference: West US
ACR_NAME="acrpatientscheduler"
APP_NAME="app-patient-scheduler"
POSTGRES_NAME="psql-patient-scheduler"
KEYVAULT_NAME="kv-patient-scheduler"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Patient Scheduler Azure Deployment ===${NC}"

# Check if logged in to Azure
if ! az account show &>/dev/null; then
    echo -e "${RED}Error: Not logged in to Azure. Run 'az login' first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Using subscription:${NC}"
az account show --query "{Name:name, ID:id}" -o table

# Step 1: Create Resource Group
echo -e "\n${GREEN}Step 1: Creating Resource Group...${NC}"
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --tags Environment=Production Application=PatientScheduler HIPAA=true

# Step 2: Deploy Bicep Infrastructure
echo -e "\n${GREEN}Step 2: Deploying Infrastructure (Bicep)...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file "$SCRIPT_DIR/bicep/main.bicep" \
    --parameters acrName=$ACR_NAME appName=$APP_NAME postgresName=$POSTGRES_NAME keyVaultName=$KEYVAULT_NAME

# Step 3: Get ACR credentials
echo -e "\n${GREEN}Step 3: Getting ACR credentials...${NC}"
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
az acr login --name $ACR_NAME

# Step 4: Build and push Docker image
echo -e "\n${GREEN}Step 4: Building and pushing Docker image...${NC}"
cd "$SCRIPT_DIR/.."
docker build -t $ACR_LOGIN_SERVER/patient-scheduler:latest .
docker push $ACR_LOGIN_SERVER/patient-scheduler:latest

# Or use ACR Build (builds in Azure, no local Docker needed):
# az acr build --registry $ACR_NAME --image patient-scheduler:latest .

# Step 5: Configure App Service to use ACR
echo -e "\n${GREEN}Step 5: Configuring App Service container...${NC}"
az webapp config container set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --container-image-name $ACR_LOGIN_SERVER/patient-scheduler:latest \
    --container-registry-url https://$ACR_LOGIN_SERVER

# Step 6: Get PostgreSQL connection string
echo -e "\n${GREEN}Step 6: Getting PostgreSQL connection info...${NC}"
POSTGRES_HOST=$(az postgres flexible-server show --name $POSTGRES_NAME --resource-group $RESOURCE_GROUP --query fullyQualifiedDomainName -o tsv)
echo -e "${YELLOW}PostgreSQL Host: $POSTGRES_HOST${NC}"

# Step 7: Print deployment summary
echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo -e "Resource Group: $RESOURCE_GROUP"
echo -e "App URL: https://$APP_NAME.azurewebsites.net"
echo -e "ACR: $ACR_LOGIN_SERVER"
echo -e "PostgreSQL: $POSTGRES_HOST"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Sign the Microsoft BAA in Azure Portal (Healthcare compliance)"
echo "2. Configure Key Vault secrets (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY)"
echo "3. Migrate database from Neon to Azure PostgreSQL"
echo "4. Update OAuth callback URLs to Azure domain"
echo "5. Test the application: curl https://$APP_NAME.azurewebsites.net/health"
