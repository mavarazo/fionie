# Fionie

![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-success)
![Hugo](https://img.shields.io/badge/Hugo-static%20site-blue)
![Strapi](https://img.shields.io/badge/Strapi-headless%20CMS-purple)
![License](https://img.shields.io/badge/license-MIT-green)
![Automation](https://img.shields.io/badge/deployment-fully%20automated-brightgreen)

[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/mavarazo/fionie/pages.yaml?branch=main)](https://github.com/mavarazo/fionie/actions)
![Last Commit](https://img.shields.io/github/last-commit/mavarazo/fionie)

Fionie is a fully automated headless CMS setup built with **Strapi**, **Hugo**, **GitHub Pages**, and **Cloudflare Workers**.

It enables seamless content publishing: once content is published in Strapi, the frontend is automatically rebuilt and deployed — no manual steps required.

---

## ✨ Features

- Headless CMS powered by **Strapi**
- Static frontend built with **Hugo**
- Custom Hugo theme
- Fully automated deployment via **GitHub Actions**
- Hosting on **GitHub Pages**
- Custom domains for backend and frontend
- Webhook-triggered rebuilds
- Configurable content & frontmatter sync from Strapi

---

## 🏗 Architecture Overview

```plain
Strapi (Backend)
│
│ Webhook (publish)
▼
Cloudflare Worker (due reduced Webhook functionality of Strapi v5)
│
│ Triggers
▼
GitHub Actions
│
│ sync.js + Hugo build
▼
GitHub Pages (Frontend)
```

---

## 📂 Project Structure

```plain
.
├── backend/ # Strapi backend
├── frontend/ # Hugo frontend
│ ├── themes/ # Custom Hugo theme
│ ├── sync.js # Strapi → Hugo sync script
│ ├── content/ # Generated content
│ ├── data/ # Raw Strapi JSON
│ └── static/images/ # Downloaded assets
├── .github/workflows/
│ └── pages.yaml # GitHub Pages deployment
└── README.md
```

---

## 🔧 Backend – Strapi

- Located in `./backend`
- Acts as the headless CMS
- Manages all content and media
- Exposes content via REST API
- Uses a **publish webhook** to trigger frontend rebuilds

---

## 🚀 Strapi Deployment (Docker)

Strapi is deployed using **Docker** and **docker-compose**, backed by **PostgreSQL**.

### docker-compose.yml (Production)

- Strapi runs in production mode
- PostgreSQL used as database
- Persistent volumes for uploads & database
- Designed to work behind a reverse proxy (e.g. Traefik)

```yaml
services:
  strapi:
    container_name: strapi
    build:
      context: ${CONTEXT_PATH}
      dockerfile: Dockerfile.prod
    image: strapi:latest
    env_file: .env
    depends_on:
      - database
    networks:
      - internal
    volumes:
      - "${DATA}/uploads:/opt/app/public/uploads"
    restart: unless-stopped

  database:
    image: postgres:16.0-alpine
    env_file: .env
    volumes:
      - "${DATA}/database:/var/lib/postgresql/data"
    restart: unless-stopped
```

### 🔐 Environment Variables (Strapi)

All sensitive values are provided via .env.

Example .env

```plain
# Server
CONTEXT_PATH=
DATA=
DOMAIN=
STRAPI_TELEMETRY_DISABLED=true

# Secrets
ADMIN_JWT_SECRET=
APP_KEYS=
API_TOKEN_SALT=
ENCRYPTION_KEY=
JWT_SECRET=
TRANSFER_TOKEN_SALT=

# Database
DATABASE_CLIENT=postgres
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_SSL=false
```

⚠️ Never commit .env files to GitHub.

## 🎨 Frontend – Hugo

- Located in ./frontend
- Uses Hugo for static generation
- Includes a custom-built theme
- Content is fully generated from Strapi data

### 🔄 Content Synchronization (sync.js)

The heart of the automation is the configurable Strapi → Hugo sync script:

👉 frontend/sync.js

What the Script Does

- Fetches content from Strapi
- Downloads media assets locally
- Generates Hugo-compatible frontmatter
- Writes collection & single pages
- Keeps Hugo content fully in sync with the CMS

#### ⚙️ Sync Script Configuration

Environment-Based Setup

```js
NODE_ENV=production
STRAPI_URL=https://your-strapi-domain
STRAPI_API_TOKEN=***
```

- development defaults to http://localhost:1337
- production uses STRAPI_URL

#### Collection Content Mapping

Collections are defined via COLLECTION_CONTENT_MAP:

```js
const COLLECTION_CONTENT_MAP = {
  clutches: {
    dataUrlPath: "/products?...",
    contentTitle: "Clutches",
    contentType: "products",
    additionalContentProperties: [
      { key: "price" },
      { key: "isReserved" },
      { key: "isSold" },
      { key: "cover", transform: downloadImage },
      { key: "images", transform: downloadImages }
    ]
  }
};
````

Each collection defines:

- API endpoint
- Hugo content type
- Frontmatter properties
- Optional transform functions

Single Content Mapping

```js
const SINGLE_CONTENT_MAP = {
  about: {
    dataUrlPath: "/about?populate=*",
    additionalContentProperties: [
      { key: "image", transform: downloadImage }
    ]
  }
};
````

Used for pages like:

- About
- Imprint
- Privacy
- Landing page (_index.md supported)

#### Media Handling

- Images are downloaded automatically
- Stored in static/images
- Frontmatter references local paths
- Falls back to Strapi URLs if download fails

## 🔁 GitHub Actions Deployment

- Workflow: `.github/workflows/pages.yaml`
- Triggered by:
  - Cloudflare Worker (via webhook)
  - Manual runs
- Steps:
  1. Fetch Strapi data
  1. Run sync.js
  1. Build Hugo site
  1. Deploy to GitHub Pages

## 🌍 Domains & Hosting

- Frontend: GitHub Pages + custom domain
- Backend: Strapi with custom domain
- DNS:
  - Frontend domain points to GitHub Pages
  - Backend domain points to Strapi server
- Cloudflare:
  - Handles webhook & workflow triggering

## 🧠 Why This Setup?

- ⚡ Ultra-fast frontend
- 🔐 Secure CMS separation
- 🔁 Zero-click publishing
- 🧩 Clean architecture
- 🛠 Easy to extend

## 📄 License

This project is licensed under the MIT License.

## 🙌 Author

Built with pride by mavarazo.