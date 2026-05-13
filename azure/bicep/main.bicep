// Azure Bicep Template for Patient Scheduler
// HIPAA-compliant infrastructure with PostgreSQL, App Service, ACR, and Key Vault

@description('Azure Container Registry name')
param acrName string = 'acrpatientscheduler'

@description('App Service name')
param appName string = 'app-patient-scheduler'

@description('PostgreSQL Flexible Server name')
param postgresName string = 'psql-patient-scheduler'

@description('Key Vault name')
param keyVaultName string = 'kv-patient-scheduler'

@description('Location for all resources')
param location string = resourceGroup().location

@description('PostgreSQL administrator login')
param postgresAdminLogin string = 'psqladmin'

@description('PostgreSQL administrator password')
@secure()
param postgresAdminPassword string = newGuid()

@description('Database name')
param databaseName string = 'scheduler'

// Tags for HIPAA compliance tracking
var tags = {
  Environment: 'Production'
  Application: 'PatientScheduler'
  HIPAA: 'true'
  DataClassification: 'PHI'
}

// === Azure Container Registry ===
resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// === Azure Database for PostgreSQL Flexible Server ===
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: postgresName
  location: location
  tags: tags
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: postgresAdminLogin
    administratorLoginPassword: postgresAdminPassword
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
    }
    backup: {
      backupRetentionDays: 35  // HIPAA: 35-day backup retention
      geoRedundantBackup: 'Disabled'  // Enable for production
    }
    highAvailability: {
      mode: 'Disabled'  // Enable for production
    }
  }
}

// PostgreSQL database
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgres
  name: databaseName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// PostgreSQL firewall rule - Allow Azure services
resource postgresFirewall 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-03-01-preview' = {
  parent: postgres
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// PostgreSQL SSL enforcement
resource postgresSSL 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2023-03-01-preview' = {
  parent: postgres
  name: 'require_secure_transport'
  properties: {
    value: 'ON'
    source: 'user-override'
  }
}

// === App Service Plan ===
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${appName}-plan'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: 'B1'  // Basic tier for testing (~$13/mo)
    tier: 'Basic'
  }
  properties: {
    reserved: true  // Required for Linux
  }
}

// === App Service (Web App) ===
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: appName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true  // HIPAA: Enforce HTTPS
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/patient-scheduler:latest'
      alwaysOn: false  // Enable for production
      ftpsState: 'Disabled'  // HIPAA: Disable FTP
      minTlsVersion: '1.2'  // HIPAA: TLS 1.2 minimum
      http20Enabled: true
      healthCheckPath: '/health'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
        {
          name: 'WEBSITE_PORT'
          value: '3000'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'AZURE_POSTGRESQL'
          value: 'true'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${acr.properties.loginServer}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acr.listCredentials().username
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
  }
}

// === Key Vault ===
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true  // HIPAA: Soft delete for key protection
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true  // HIPAA: Prevent permanent deletion
  }
}

// Grant App Service access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, webApp.id, 'Key Vault Secrets User')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6') // Key Vault Secrets User
    principalId: webApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Store PostgreSQL password in Key Vault
resource postgresPasswordSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'postgres-admin-password'
  properties: {
    value: postgresAdminPassword
  }
}

// Store DATABASE_URL in Key Vault
resource databaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: keyVault
  name: 'DATABASE-URL'
  properties: {
    value: 'postgresql://${postgresAdminLogin}:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'
  }
}

// === Outputs ===
output acrLoginServer string = acr.properties.loginServer
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppPrincipalId string = webApp.identity.principalId
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output keyVaultUri string = keyVault.properties.vaultUri

// Instructions output
output nextSteps string = '''
Next steps:
1. Sign Microsoft BAA in Azure Portal
2. Add secrets to Key Vault: JWT_SECRET, ANTHROPIC_API_KEY, OAUTH credentials
3. Migrate database: pg_dump from Neon, pg_restore to Azure
4. Update App Service configuration with Key Vault references
5. Deploy container: docker push ${acrLoginServer}/patient-scheduler:latest
6. Update OAuth callback URLs
'''
