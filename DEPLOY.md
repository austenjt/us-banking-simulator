# Deployment Guide

## Overview

The app is an Angular 21 SPA located in `angular-app/`. It is deployed to **Azure Static Web Apps** (free tier) using the Azure SWA CLI.

- **Live URL:** https://kind-beach-06ba7921e.2.azurestaticapps.net
- **Azure resource:** `us-banking-simulator` in resource group `us-banking-sim-rg` (West US 2)
- **Subscription:** jtahome

---

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js + npm | https://nodejs.org |
| Azure CLI | `brew install azure-cli` |
| Azure SWA CLI | `npm install -g @azure/static-web-apps-cli` |

Log in to Azure before deploying:
```bash
az login
```

---

## Build

```bash
cd angular-app
npm install        # first time only
npm run build
```

Output is written to `angular-app/dist/angular-app/browser/`.

---

## Deploy

Get the deployment token from Azure:
```bash
az staticwebapp secrets list \
  --name us-banking-simulator \
  --resource-group us-banking-sim-rg \
  --query "properties.apiKey" \
  --output tsv
```

Then deploy:
```bash
cd angular-app
swa deploy dist/angular-app/browser \
  --deployment-token "<token from above>" \
  --env production
```

---

## One-liner (build + deploy)

```bash
cd angular-app && npm run build && swa deploy dist/angular-app/browser \
  --deployment-token "<token>" \
  --env production
```

---

## Re-creating the Azure resources from scratch

If the Static Web App needs to be recreated:

```bash
# Create resource group (skip if it already exists)
az group create --name us-banking-sim-rg --location westus2

# Create the Static Web App
az staticwebapp create \
  --name us-banking-simulator \
  --resource-group us-banking-sim-rg \
  --location westus2 \
  --sku Free
```

Then follow the deploy steps above.

---

## Notes

- `angular-app/public/staticwebapp.config.json` configures Azure to serve `index.html` for all routes (required for SPAs).
- The deployment token is a secret — do not commit it to source control.
- To set up automatic deploys on `git push`, link the GitHub repo under **Azure Portal → Static Web App → Deployment → GitHub Actions**.
