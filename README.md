# ClickVid Pro - Production-Ready Next.js & Prisma

This guide provides the definitive instructions for setting up and running this application locally. For deploying to a live production server, please refer to the `DEPLOYMENT_GUIDE.md` document, which contains comprehensive, step-by-step instructions.

## Table of Contents
1. [Required Local Setup](#1-required-local-setup)
2. [Local Development Workflow](#2-local-development-workflow)
3. [Managing Your Code with Git & GitHub](#3-managing-your-code-with-git--github)
    - [3.1. One-Time Setup: Connecting Your Repository](#31-one-time-setup-connecting-your-repository)
    - [3.2. Ongoing Workflow: Saving and Pushing Changes](#32-ongoing-workflow-saving-and-pushing-changes)
4. [Production Deployment Workflow](#4-production-deployment-workflow)
5. [Application Access Points](#5-application-access-points)
6. [Testing the Application](#6-testing-the-application)

---

### 1. Required Local Setup

- **Node.js**: Ensure you have Node.js (v18 or higher) installed.
- **Docker Desktop**: You **must** have Docker running to use the local PostgreSQL database.

---

### 2. Local Development Workflow

This is the process for running the application on your local machine for development and testing.

#### Step 1: Configure Environment Variables
Create a `.env` file in the root of your project by copying the example:
```bash
cp .env.example .env
```
You **must** fill in this file with your credentials, especially your Google OAuth keys and a secure `AUTH_SECRET`. The `DATABASE_URL` is pre-configured for the local Docker setup and should not be changed for local development.

#### Step 2: Start the Local Database
This command starts the PostgreSQL container using Docker.
```bash
docker-compose up -d
```

#### Step 3: Install Dependencies
This installs all the necessary packages for the application to run.
```bash
npm install
```

#### Step 4: Run Database Migrations
This command reads your `prisma/schema.prisma` file and sets up the tables in your local Docker database.
```bash
npx prisma migrate dev
```
You will be prompted to give your migration a descriptive name (e.g., "initial-schema").

#### Step 5: Seed the Database (Optional but Recommended)
This populates your database with initial data like subscription plans.
```bash
npx prisma db seed
```

#### Step 6: Run the Development Server
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

---

### 3. Managing Your Code with Git & GitHub

To properly manage your application's source code, you must store it in a private GitHub repository. Each project folder on your computer will connect to its own separate repository.

#### 3.1. One-Time Setup: Connecting Your Repository

If you haven't done so already, you need to connect your local project folder to your private repository on GitHub. **This only needs to be done once per project.**

1.  **Create a Repository on GitHub:** Go to [GitHub.com](https://github.com), create a new **private** repository, and copy its URL (e.g., `https://github.com/your-username/your-repo-name.git`).
2.  **Run these commands in your project's terminal:**
    ```bash
    # Initialize Git in your project folder
    git init -b main

    # Add all your files to be tracked by Git
    git add .

    # Create your first commit (a snapshot of your code)
    git commit -m "Initial commit of ClickVid Pro application"

    # Connect your local project to your new GitHub repository
    git remote add origin https://github.com/nohitchweb/finalclickvid.git

    # Push your code up to GitHub and set the main branch as the default
    git push -u origin main
    ```

#### 3.2. Ongoing Workflow: Saving and Pushing Changes

Once your repository is connected, this is the simple, three-step process you will use every time you want to save your changes and deploy them.

**Step 1: Stage Changes**
This command prepares all the modified files to be saved.
```bash
git add .
```

**Step 2: Commit Changes**
This saves a snapshot of your staged files with a descriptive message.
```bash
git commit -m "Add new feature X"
```

**Step 3: Push to GitHub**
This sends your saved commits up to GitHub, which will automatically trigger your Coolify deployment.
```bash
git push
```

---

### 4. Production Deployment Workflow

The deployment workflow is now managed by Git. Once your application is deployed on a host like Coolify, every `git push` to your `main` branch will automatically trigger a new build and deployment.

For manual server setups, refer to the detailed instructions in the **`DEPLOYMENT_GUIDE.md`**.

---

### 5. Application Access Points

- **Super Admin Panel**: `/chin/dashboard`
- **Support Agent Panel**: `/kanri/dashboard`
- **Main User Application**: `/`

The **first user** to sign up at `/signup` will automatically become the **Super Admin**.

---

### 6. Testing the Application

After any deployment, it is highly recommended to perform a full system check. Please follow the instructions in **`TESTING_PLAN.md`** to verify all critical functionality.
