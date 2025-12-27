# Application Testing Plan

This document outlines a manual testing plan to verify the core functionality of the ClickVid Pro application after deployment or significant changes.

---

## 1. User Role: Standard User

**Objective:** Ensure the core application is functional and secure for regular users.

### 1.1. Authentication
-   [ ] **Signup:** Navigate to `/signup`. Successfully create a new user account.
-   [ ] **Onboarding:** After signup, verify you are redirected to the `/dashboard/onboarding` page. Fill out and submit the form.
-   [ ] **Login:** After onboarding, log out and log back in at `/login`. Verify you are redirected to `/dashboard`.
-   [ ] **Google Auth:** Log out and sign in using the "Continue with Google" button.

### 1.2. Core Features (Dashboard)
-   [ ] **Projects:** Go to `/dashboard/projects`. Create a new project. Verify it appears in the list.
-   [ ] **Video Suite:** Navigate to `/dashboard/video-suite`. Click on at least two tools (e.g., Script Generator, Voice Over) and verify their pages load.
-   [ ] **Script Generator:** Generate a script. Verify the output appears correctly.
-   [ ] **Image Editing:** Navigate to `/dashboard/image-editing/background-remover`. Upload an image and verify the background removal process initiates.
-   [ ] **AI Agents:** Navigate to `/dashboard/ai-agents`. Generate a workflow and verify the JSON output appears. Save the agent and verify it appears in the "Deployed Agents" table. Delete it.
-   [ ] **Social Suite:** Navigate through the "Analytics", "Scheduler", and "Integrations" tabs. Verify each page loads without error.
-   [ ] **Media Management:** Navigate to `/dashboard/media/library` and `/dashboard/media/download`. Verify they load.
-   [ ] **Settings:** Navigate to `/dashboard/settings`. Update your name. Log out and log back in to see if the name change is reflected in the user dropdown.
-   [ ] **Brand Kit:** Navigate to `/dashboard/settings/brand-kit`. Upload a logo and set a primary color. Save the changes.

---

## 2. User Role: Super Admin

**Objective:** Ensure the super admin panel is fully functional for platform management.

### 2.1. Initial Super Admin Creation
-   [ ] **First Signup:** On a fresh deployment with an empty database, sign up at `/signup`.
-   [ ] **Redirection:** Verify you are automatically redirected to the Super Admin Dashboard at `/chin/dashboard`.
-   [ ] **Second Signup:** Log out, and create a second user at `/signup`. Verify this new user is a regular user and is redirected to the `/dashboard/onboarding` page.

### 2.2. Admin Panel Functionality
-   [ ] **User Management:** Go to `/chin/dashboard/users`.
    -   [ ] Create a new user with the `Admin` (Support) role.
    -   [ ] Verify the new user receives an email to set their password.
    -   [ ] Follow the email link, set the password, and log in as the new support agent. Verify they are redirected to `/kanri/dashboard`.
-   [ ] **Plans & Promotions:**
    -   [ ] Go to `/chin/dashboard/plans`. Edit an existing plan and save.
    -   [ ] Go to `/chin/dashboard/promotions`. Create a new promotion and apply it to a plan. Verify it saves.
-   [ ] **API Integrations:** Go to `/chin/dashboard/api-integrations`. Enter a value into an API key field and save. Refresh the page and verify the value is still there (it will be hidden).
-   [ ] **Email Templates:** Go to `/chin/dashboard/email-templates`. Modify the "Welcome & Verification" email subject line and save.
-   [ ] **Settings:** Go to `/chin/dashboard/settings`. Change the "Application Name" and save. Verify the name updates in the sidebar.

---

## 3. User Role: Admin (Support Agent)

**Objective:** Ensure the support panel is functional for managing user tickets.

### 3.1. Authentication
-   [ ] Log in as the support agent created in step 2.2.
-   [ ] Verify you are automatically redirected to `/kanri/dashboard`.

### 3.2. Support Panel Functionality
-   [ ] **Dashboard:** Verify the dashboard loads and shows "Open Tickets".
-   [ ] **Support Tickets:**
    -   [ ] Go to `/kanri/support`.
    -   [ ] View a ticket from the list.
    -   [ ] Send a reply.
    -   [ ] Change the ticket status to "Pending" and then "Resolved". Verify the changes are reflected.
-   [ ] **View Users:** Go to `/kanri/users`. Verify you can see the list of users but cannot create or delete them.
-   [ ] **View Subscriptions:** Go to `/kanri/subscriptions`. Verify you can view user subscriptions.
