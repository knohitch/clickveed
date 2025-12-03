# Production Deployment Guide: ClickVid Pro

This guide provides the definitive, step-by-step process for deploying the ClickVid Pro application to a production Linux server. It covers both manual server setup and deployment via modern platforms like Coolify.

## Table of Contents
1. [Server Specifications](#1-server-specifications)
2. [Prerequisites](#2-prerequisites)
3. [Obtaining Required Credentials](#3-obtaining-required-credentials)
    *   [3.1. Google OAuth 2.0 Client ID](#31-google-oauth-20-client-id)
    *   [3.2. Generating Secure Secrets (`AUTH_SECRET`, `CRON_SECRET`)](#32-generating-secure-secrets-auth_secret-cron_secret)
4. [Method 1: Deployment via Coolify (Recommended)](#4-method-1-deployment-via-coolify-recommended)
    *   [4.1. Phase 1: Database Setup](#41-phase-1-database-setup)
    *   [4.2. Phase 2: Connecting GitHub to Coolify](#42-phase-2-connecting-github-to-coolify)
    *   [4.3. Phase 3: Application Deployment](#43-phase-3-application-deployment)
5. [Method 2: Manual Linux Server Deployment](#5-method-2-manual-linux-server-deployment)
    *   [5.1. Understanding the Deployment Scripts](#51-understanding-the-deployment-scripts)
    *   [5.2. Phase 1: Initial Server Setup](#52-phase-1-initial-server-setup)
    *   [5.3. Phase 2: Ongoing Application Updates](#53-phase-2-ongoing-application-updates)
6. [Setting Up Cron Jobs (Post-Deployment)](#6-setting-up-cron-jobs-post-deployment)

---

### 1. Server Specifications

Choosing the right server is about finding a balance between cost and performance, with a clear path to scale as your user base grows.

#### **1.1. Starting Point (For Launch & Initial Users)**
This is a solid, cost-effective configuration that will handle the application's needs comfortably for your initial launch and first few hundred users.
*   **CPU:** 2-4 vCPUs (Virtual CPUs)
*   **RAM:** 4-8 GB
*   **Storage:** 100 GB NVMe SSD
*   **Provider Examples:** DigitalOcean "Droplets" (Premium CPU), Vultr "High Frequency Compute," Hetzner "Cloud," or a similar offering from Linode/Akamai.

**Why these specs?**
*   The **NVMe SSD** is the most critical part. It provides the high-speed disk I/O (input/output) that your PostgreSQL database needs to perform well.
*   **4-8 GB of RAM** is sufficient to run the Node.js application, the database, and handle a moderate number of concurrent users and background AI tasks.
*   **4 vCPUs** gives you enough processing power to handle concurrent API requests and the computational demands of AI video processing without creating a major bottleneck.

---

### 2. Prerequisites

-   A Linux server (if using manual deployment).
-   A domain name pointed to your server's IP address (e.g., `dashboard.clickvid.site`).
-   Your application code pushed to a private GitHub repository.
-   A Coolify instance running and accessible.

---

### 3. Obtaining Required Credentials

Before you deploy, you need to generate a few essential secrets.

#### **3.1. Google OAuth 2.0 Client ID**
These credentials are required for the "Sign in with Google" functionality.

1.  **Go to the Google Cloud Console:** [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Create a New Project:** If you don't have one already, create a new project (e.g., "ClickVid Pro").
3.  **Navigate to APIs & Services:** From your project dashboard, click on **"APIs & Services"** in the main navigation or Quick access panel.
4.  **Configure OAuth Consent Screen (One-Time Setup):**
    *   In the "APIs & Services" section, go to the **"OAuth consent screen"** tab from the left-hand menu.
    *   Choose **"External"** for the User Type and click **Create**.
    *   **App name:** Enter `ClickVid Pro` (or your white-label name).
    *   **User support email:** Enter your email address.
    *   **App Logo / Branding:** You can add your logo and other branding information here.
    *   **Authorized domains:** Click "+ ADD DOMAIN" and enter your **full application domain including subdomain** (e.g., `dashboard.clickvid.site`). Do **not** use the root domain.
    *   **Application Privacy Policy / Terms of Service:** Enter the URLs to your policies. You can use your main application domain (e.g., `https://dashboard.clickvid.site`) as a placeholder if you don't have these pages yet.
    *   **Developer contact information:** Enter your email address.
    *   Click **"Save and Continue"** through the "Scopes" and "Test Users" sections. You do not need to add any scopes or test users.
    *   On the "Summary" page, click **"Back to Dashboard"**.
5.  **Publish the Application (Critical Step):**
    *   On the "OAuth consent screen" page, you will see a button labeled **"PUBLISH APP"**. Click it and confirm. This moves your app from "Testing" to "Production", allowing any Google user to sign in.
6.  **Answer the Verification Questionnaire:**
    *   Before you can publish, Google may ask you to complete a "Verification Questionnaire."
    *   For a public SaaS application like ClickVid Pro, you should answer **"No"** to all questions on this form.
    *   This confirms that your app is not for personal, internal, or testing-only use.
7.  **A Note on Verification Timelines:**
    *   After you submit, you may see a notice that verification can take "4-6 weeks." **Do not be alarmed.** This long review is for apps that access sensitive data (like Gmail or Google Drive).
    *   Because your app only requests basic profile information for login, the verification is usually **automatic and very fast**. For a short time, users might see an "unverified app" screen, but they can click through it. This warning will disappear once Google's automated checks are complete. You can proceed with your launch.
8.  **Create the OAuth Client ID:**
    *   Now, go to the **"Credentials"** tab (still in "APIs & Services").
    *   At the top of the Credentials page, click **"+ CREATE CREDENTIALS"** and select **"OAuth client ID"**.
    *   **Application type:** Select **"Web application"**.
    *   **Name:** Give it a name, like "ClickVid Pro Web Client".
    *   **Authorized JavaScript origins:**
        *   Click **"+ ADD URI"**.
        *   Enter your final application domain, including the subdomain (e.g., `https://dashboard.clickvid.site`).
    *   **Authorized redirect URIs:**
        *   Click **"+ ADD URI"**.
        *   Enter the exact callback URL: `https://dashboard.clickvid.site/api/auth/callback/google`.
    *   Click **"Create"**.
9.  **Copy Your Credentials (IMPORTANT):**
    *   A popup will appear showing your **Client ID** and **Client Secret**.
    *   **CRITICAL:** You must copy the **Client Secret** now. Due to Google security policy, you will not be able to view the secret again after closing this dialog.
    *   The best practice is to click **"DOWNLOAD JSON"** and save the file somewhere secure. This file contains both your Client ID and Client Secret.
    *   These are the values you will use for the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables.
10. **How to Confirm Verification:**
    *   You will know verification is complete when users no longer see the "unverified app" warning screen during login.
    *   You can also check the "OAuth consent screen" page in the Google Cloud Console. The status at the top will change from "Verification in progress" to **"Published"**.

#### **3.2. Generating Secure Secrets (`AUTH_SECRET`, `CRON_SECRET`)**
Your application needs secure, random strings for session encryption and protecting scheduled tasks. You must generate these yourself.

1.  **Open a terminal** on your local machine (e.g., macOS, Linux, or Windows with WSL).
2.  **To generate the `AUTH_SECRET`**, run the following command and copy the output:
    ```bash
    openssl rand -base64 32
    ```
3.  **To generate the `CRON_SECRET`**, run the same command again and copy the new, unique output. These two secret values **must be different** from each other.
    ```bash
    openssl rand -base64 32
    ```
    These are the values you will paste into your environment variables in the next steps.

---

### 4. Method 1: Deployment via Coolify (Recommended)

This method automates the entire deployment pipeline. You will **not** use the `install.sh` or `deploy.sh` scripts with this method.

#### **4.1. Phase 1: Database Setup**
First, create a managed PostgreSQL database within your Coolify project. It is highly recommended to keep the database and the application in the same project for secure, internal networking.

1.  **Add New Service:** In your Coolify project, go to **"Add New Service"** -> **"Databases"** and select **"PostgreSQL"**.
2.  **Configure & Deploy:** Give it a name (e.g., `clickvid-pro-db`) and deploy it.
3.  **Get the Connection URL:** Once it's running, click on the database service. In its "Connection Info" or "Environment Variables" section, find and copy the **`DATABASE_URL`**. You will need this for your application.

#### **4.2. Phase 2: Connecting GitHub to Coolify**
This is a one-time setup to allow Coolify to access your private code. Follow these steps precisely to avoid errors.

1.  **Initiate Connection:** In Coolify, go to **"Sources"** -> **"GitHub Apps"** and click **"Private Repository (with GitHub App)"**.
2.  **Register GitHub App:** Click **"Register Now"**. This will open a new browser tab to GitHub.
3.  **Create GitHub App:** You are now on the "Register a new GitHub App" page on GitHub.com.
    *   **GitHub App name:** Leave the auto-generated name (e.g., `witty-walrus...`).
    *   **Homepage URL, Callback URL, Webhook URL:** **DO NOT CHANGE THESE.** The `http://localhost:8000` URLs are correct for this setup step, as they point back to your local Coolify management dashboard.
    *   **Webhook Secret:** Go back to your Coolify browser tab. Find the field labeled **"Webhook Secret"** and copy the long, random string. Paste this value into the "Webhook Secret" field on the GitHub page.
    *   Scroll down and click the green **"Create GitHub App"** button.
4.  **Transfer Credentials back to Coolify:** After creating the app, GitHub will take you to its settings page.
    *   **App ID:** Find the "App ID" near the top of the page. Copy it, go back to your Coolify tab, and paste it into the **"App ID"** field.
    *   **Client Secret:** Click the **"Generate a new client secret"** button. Copy the new secret *immediately* (it will only be shown once). Paste this into the **"Client Secret"** field in Coolify.
    *   **Private Key:** On the GitHub page, scroll to the bottom to the "Private keys" section and click **"Generate a private key"**. This will download a `.pem` file to your computer. Open this file with a text editor, copy its **entire contents**, and paste it into the **"Private Key"** field in Coolify.
5.  **Log In:** In Coolify, click the **"Login with GitHub"** button. You will be redirected to GitHub again.
6.  **Install & Authorize:** On the GitHub page, you must now **install** the app. Select the option for **"Only select repositories"** and choose your `finalclickvid` repository. Click **"Install & Authorize"**.

This completes the connection. You can now proceed to deploy your application.

#### **4.3. Phase 3: Application Deployment**
1.  **Add Application Service:** In your Coolify project, add a new "Application" service and select your `finalclickvid` GitHub repository from the source list.
2.  **Configure Build & Start:**
    *   **Build Pack:** Select **Nixpacks**.
    *   **Build Command:** `npm run build`
    *   **Start Command:** `npm start`
3.  **Add Environment Variables (Critical Pre-Deploy Step):**
    *   **CRITICAL STEP:** Before your first deployment, navigate to your new application's **"Environment Variables"** section. You must add the following core variables for the application to start and function correctly. Add them to both the **Production** and **Preview** sections. Do not use the "Is Build Variable?" or "Is Multiline?" switches.
    *   `DATABASE_URL`: Paste the connection URL you copied from your Coolify database service. (e.g., `postgresql://...`)
    *   `AUTH_SECRET`: The secret you generated in step 3.2.
    *   `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID from step 3.1.
    *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret from step 3.1.
    *   `NEXTAUTH_URL`: Your final public domain (e.g., `https://dashboard.clickvid.site`).
    *   `CRON_SECRET`: The secret you generated in step 3.2.
    *   **NOTE:** All other API keys (Gemini, Stripe, Wasabi, etc.) are managed within the Super Admin panel **after** deployment and are **not** required here for the initial launch.
4.  **Configure Domain:**
    *   Go to the **"FQDN (Domains)"** section of your application service.
    *   Enter your public domain (e.g., `https://dashboard.clickvid.site`). Coolify will handle SSL certificates.
5.  **Deploy:** Once the required environment variables are saved, trigger a new deployment. Coolify will now build and launch your application.

---

### 5. Method 2: Manual Linux Server Deployment

#### **5.1. Understanding the Deployment Scripts**
This project contains two key shell scripts designed for a **manual Linux server setup only**.

-   `install.sh`: **FOR INITIAL SETUP ONLY.** This script is used just once on a new, empty server to install dependencies and build the application for the first time.
-   `deploy.sh`: **FOR ONGOING UPDATES.** After you push new code to GitHub, you will run this script on your server to update the live application safely and with zero downtime.

#### **5.2. Phase 1: Initial Server Setup**
Follow these steps on a fresh server to prepare it for hosting the application.

1.  **Install System Dependencies:**
    ```bash
    # Update system packages
    sudo apt update && sudo apt upgrade -y
    # Install git, nginx, and certbot
    sudo apt install -y curl wget git nginx python3-certbot-nginx build-essential
    # Install Node Version Manager (NVM)
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    # Load NVM and install Node.js
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts
    nvm use --lts
    nvm alias default 'lts/*'
    ```
2.  **Setup PostgreSQL Database:**
    ```bash
    # Install PostgreSQL
    sudo apt install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    # Log in to the postgres user to run commands
    sudo -i -u postgres psql
    ```
    Inside the PostgreSQL prompt, execute:
    ```sql
    CREATE DATABASE clickvidpro;
    CREATE USER clickvidprouser WITH ENCRYPTED PASSWORD 'your_strong_password';
    GRANT ALL PRIVILEGES ON DATABASE clickvidpro TO clickvidprouser;
    \q
    ```
    Type `exit` to return to your normal user shell.
3.  **Clone Repository and Configure Environment:**
    ```bash
    git clone https://github.com/nohitchweb/finalclickvid.git
    cd finalclickvid
    nano .env
    ```
    Add the following content to the `.env` file, replacing placeholders with your actual secrets:
    ```env
    DATABASE_URL="postgresql://clickvidprouser:your_strong_password@localhost:5432/clickvidpro?sslmode=disable"
    NEXTAUTH_URL="https://dashboard.clickvid.site"
    AUTH_SECRET="your_secure_random_string_here"
    # ... add ALL other required secrets
    ```
4.  **Run the Initial Installation Script:**
    ```bash
    chmod +x install.sh
    ./install.sh
    ```
5.  **Start the Application with PM2:**
    ```bash
    sudo npm install pm2 -g
    pm2 start npm --name "clickvid-pro" -- start
    pm2 startup
    # PM2 will give you a command to run here. Copy and paste it.
    pm2 save
    ```
6.  **Configure Nginx Reverse Proxy & SSL:**
    ```bash
    # First, replace all instances of "dashboard.clickvid.site" in nginx.conf with your actual domain.
    sed -i 's/dashboard.clickvid.site/your-domain.com/g' nginx.conf
    sudo cp nginx.conf /etc/nginx/sites-available/your-domain.com
    sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
    sudo certbot --nginx -d your-domain.com
    # (Follow prompts)
    sudo systemctl restart nginx
    ```
Your site is now live!

#### **5.3. Phase 2: Ongoing Application Updates**
After you've made changes to your code and pushed them to GitHub, follow this simple process to update your live application.
1.  Log into your server via SSH.
2.  Navigate to your project's directory: `cd finalclickvid`
3.  Run the single deployment script: `./deploy.sh`

---

### 6. Setting Up Cron Jobs (Post-Deployment)

The application provides secure API endpoints for scheduled tasks. **These should be set up *after* your application is successfully deployed and running.** You can find the commands for these jobs in your Super Admin panel under "Cron Jobs".

#### **6.1. Setup on Coolify**
1.  **Generate a Secure Cron Secret:** Ensure you have added the `CRON_SECRET` to your application's **Environment Variables** in Coolify, as described in section 4.3.
2.  **Add a Scheduled Task:** In your app's settings, go to the **"Scheduled Tasks"** tab.
    *   Click **"Add New Task"**.
    *   **Name:** Give it a descriptive name (e.g., `API Health Check`).
    *   **Frequency:** Enter the cron expression for the job (e.g., `*/30 * * * *` for every 30 minutes).
    *   **Command:** Paste the command from your admin panel, but with two important changes:
        *   Replace your public domain (e.g., `https://dashboard.clickvid.site`) with `http://localhost:3000`.
        *   Replace your actual secret value with the special Coolify variable `$CRON_SECRET`. You should **not** paste your actual secret into this field.
    *   **Example Command for Coolify:**
        ```bash
        curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/autorotation-health-check
        ```
    *   Save the task. Coolify runs this command inside its internal network, which is why `localhost:3000` is correct and secure.

#### **6.2. Setup on a Manual Linux Server**
1.  **Set the `CRON_SECRET`:** Add the `CRON_SECRET` to your `.env` file on the server and restart your application (`pm2 reload clickvid-pro`).
2.  **Open the Crontab Editor:** `crontab -e`
3.  **Add the Cron Job:** Add a new line for each job. For example:
    ```
    */30 * * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET_VALUE" https://dashboard.clickvid.site/api/cron/autorotation-health-check
    ```
    *Note: For a manual setup, you must use your public domain name and the actual secret value.*
4.  Save and close the file.
