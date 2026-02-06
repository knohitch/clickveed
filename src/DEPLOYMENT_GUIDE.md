
# Production Deployment Guide for Next.js, Prisma, and PostgreSQL on Linux

This guide provides a comprehensive walkthrough for deploying your Next.js application on a Linux-based Virtual Private Server (VPS) or dedicated server (e.g., Ubuntu 22.04). It focuses on security, reliability, and performance.

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Phase 1: Getting Your Code on GitHub (One-Time Setup)](#phase-1-getting-your-code-on-github-one-time-setup)
3. [Phase 2: Initial Server Setup (One-Time Setup)](#phase-2-initial-server-setup-one-time-setup)
4. [Phase 3: Deploying Updates (Ongoing Workflow)](#phase-3-deploying-updates-ongoing-workflow)
5. [Data Safety & Zero Downtime](#5-data-safety--zero-downtime)

---

### 1. Prerequisites

- A Linux server (Ubuntu 22.04 is assumed for this guide).
- A domain name pointing to your server's IP address.
- SSH access to your server.
- A GitHub account.

---

### Phase 1: Getting Your Code on GitHub (One-Time Setup)

This process copies your local application code into a private, secure repository on GitHub. You only need to do this once.

#### Step 1: Create a New Private Repository on GitHub

1.  Go to [GitHub.com](https://github.com) and log in.
2.  In the top-right corner, click the **+** icon and select **New repository**.
3.  Give your repository a name (e.g., `clickvid-pro-app`).
4.  Select the **Private** option. This is very important to keep your code secure.
5.  **Do not** initialize the repository with a README, .gitignore, or license. Your project already has these files.
6.  Click **Create repository**.

#### Step 2: Push Your Local Code to the New GitHub Repository

On the next page, GitHub will show you a URL for your new repository. It will look something like `https://github.com/your-username/your-repo-name.git`.

Now, open your terminal (like VS Code's integrated terminal) in your project folder and run the following commands one by one.

```bash
# 1. Initialize Git in your project folder
git init -b main

# 2. Add all your files to be tracked by Git
git add .

# 3. Save a snapshot of your files
git commit -m "Initial commit"

# 4. Connect your local project to the empty GitHub repository
#    Replace the URL with the one you copied from GitHub.
git remote add origin https://github.com/your-username/your-repo-name.git

# 5. Push your code up to GitHub
git push -u origin main
```

After these commands complete, refresh your GitHub page. You will see all of your project files in your private repository.

---

### Phase 2: Initial Server Setup (One-Time Setup)

This phase prepares your fresh Ubuntu server to host your application.

#### Step 2.1: System Dependencies

First, update your package list and install essential tools.

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git nginx python3-certbot-nginx build-essential
```

**Install Node.js & npm using NVM (Node Version Manager)**

This is the recommended way to manage Node.js versions. **Installing Node.js will also automatically install npm (Node Package Manager)**, which is required to manage your application's dependencies.

```bash
# Download and run the NVM installation script
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM into your current session
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Verify installation (should show 'nvm')
command -v nvm

# Install the latest LTS version of Node.js (e.g., 20.x)
nvm install --lts

# Set the installed version as default
nvm use --lts
nvm alias default 'lts/*'
```

#### Step 2.2: PostgreSQL Setup

Install PostgreSQL and create a database and user for your application.

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable the PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Log in to the postgres user to create the database
sudo -i -u postgres psql
```

Inside the PostgreSQL prompt, run the following commands. **Replace `your_strong_password` with a secure password and save it.**

```sql
-- Create a new database for your app
CREATE DATABASE clickvidpro;

-- Create a new user for your app (avoiding superuser for security)
CREATE USER clickvidprouser WITH ENCRYPTED PASSWORD 'your_strong_password';

-- Grant all privileges on the new database to the new user
GRANT ALL PRIVILEGES ON DATABASE clickvidpro TO clickvidprouser;

-- Exit the PostgreSQL prompt
\q
```
Log out of the `postgres` user shell by typing `exit`.

#### Step 2.3: Clone Your Repository and Configure

Now, you'll bring your code from your private GitHub repository onto the server.

```bash
# Clone your private repository (it will ask for your GitHub username and password/token)
git clone https://github.com/your-username/your-repo-name.git

# Go into the new directory
cd your-repo-name

# Create and edit the .env file to store your secrets
nano .env
```

Add the following content to the `.env` file, replacing `your_strong_password` with the one you created earlier. This file must also contain all other required secrets from your local `.env` file (e.g., Google OAuth keys, AUTH_SECRET, etc.).

```env
# .env file content
DATABASE_URL="postgresql://clickvidprouser:your_strong_password@localhost:5432/clickvidpro?sslmode=disable"
NEXTAUTH_URL="https://your-domain.com"
AUTH_SECRET="your_secure_random_string_here"
# ... add all other required secrets
```

#### Step 2.4: Initial Application Installation

Run the provided installation script. This will install dependencies, set up the database schema, and build the app.

```bash
# Make the script executable
chmod +x install.sh

# Run the installation
./install.sh
```

#### Step 2.5: Start the Application with PM2

PM2 is a production process manager that will keep your app running.

```bash
# Install PM2 globally
sudo npm install pm2 -g

# Start your app and give it a name
pm2 start npm --name "clickvid-pro" -- start

# Tell PM2 to automatically restart on server reboots
pm2 startup
# Follow the instructions PM2 gives you, then run:
pm2 save
```

#### Step 2.6: Configure Nginx Reverse Proxy & SSL

These steps expose your app to the internet securely on your domain.

1.  **Edit the Nginx Config:**
    *   Open the `nginx.conf` file: `nano nginx.conf`
    *   Replace all instances of `cloud.clickvid.site` with your actual domain name.
    *   Confirm the port in the `upstream` block is `3000`.
2.  **Copy the Nginx Config:**
    ```bash
    sudo cp nginx.conf /etc/nginx/sites-available/your-domain.com
    ```
3.  **Enable the Config:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/your-domain.com /etc/nginx/sites-enabled/
    ```
4.  **Get SSL Certificate:**
    ```bash
    sudo certbot --nginx -d your-domain.com
    ```
    (Follow the prompts, including providing an email and agreeing to the terms).
5.  **Restart Nginx:**
    ```bash
    sudo systemctl restart nginx
    ```
Your site should now be live!

---

### Phase 3: Deploying Updates (Ongoing Workflow)

After you've made changes to your code and pushed them to GitHub, follow this simple process to update your live application.

1.  **Log into your server** via SSH.
2.  Navigate to your project's directory: `cd your-repo-name`
3.  Run the deployment script:
    ```bash
    ./deploy.sh
    ```

This single command pulls your latest code, updates dependencies, runs database migrations, and restarts the application with zero downtime.

---

### 5. Data Safety & Zero Downtime

**It is critical to understand that this deployment process is non-destructive and designed to be safe for a live application with active users.**

*   **Code vs. Data:** The deployment script (`deploy.sh`) updates the **application code**, but it **does not delete or "flush" your PostgreSQL database.** Your user data, projects, and all other records are stored in the database, which is completely separate from the application code.
*   **Safe Database Migrations:** The `npx prisma migrate deploy` command is the standard for production. It safely applies new schema changes (like adding a column) without deleting existing data. It is a non-destructive operation.
*   **Zero-Downtime Reloads:** The `pm2 reload` command ensures that there is no service interruption for your users during a deployment. It keeps the old version of the app running until the new version is ready, then seamlessly switches over.

You can run the `./deploy.sh` script with confidence, knowing that it will not cause data loss or extended downtime.
