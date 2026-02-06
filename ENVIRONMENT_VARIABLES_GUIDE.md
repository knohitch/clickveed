# ClickVid Application Environment Variables Guide

## Overview
This guide provides a complete list of environment variables required for the ClickVid application to function properly in Coolify. These variables are essential for database connections, authentication, third-party integrations, and application configuration.

## Required Environment Variables

### Core Application Variables

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `NODE_ENV` | Yes | Node.js environment mode | `production` |
| `PORT` | Yes | Port for the application to run on | `3000` |
| `NEXTAUTH_SECRET` | Yes | Secret key for NextAuth.js | `your-nextauth-secret-here` |
| `NEXTAUTH_URL` | Yes | External URL for NextAuth.js callbacks | `https://dev.clickvid.site` |
| `NEXTAUTH_URL_INTERNAL` | Yes | Internal URL for NextAuth.js callbacks | `http://localhost:3000` |

### Database Variables

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://username:password@hostname:5432/database?schema=public` |
| `REDIS_URL` | Yes | Redis connection string for caching and sessions | `redis://username:password@hostname:6379` |

### Authentication Variables

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID | `your-google-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret | `your-google-client-secret` |
| `CRON_SECRET` | Yes | Secret for securing cron job endpoints | `your-cron-secret-here` |

### Admin Configuration

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `ADMIN_EMAILS` | Yes | Comma-separated list of admin email addresses | `admin1@example.com,admin2@example.com` |

## Optional Environment Variables

### Third-Party Service Integrations

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `STRIPE_SECRET_KEY` | No | Stripe API secret key for payment processing | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook secret for payment verification | `whsec_...` |
| `STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key for frontend integration | `pk_test_...` |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key for voice cloning | `your-elevenlabs-api-key` |
| `OPENAI_API_KEY` | No | OpenAI API key for AI features | `sk-...` |
| `PEXELS_API_KEY` | No | Pexels API key for stock media | `your-pexels-api-key` |
| `PIXABAY_API_KEY` | No | Pixabay API key for stock media | `your-pixabay-api-key` |
| `UNSPLASH_ACCESS_KEY` | No | Unsplash API key for stock media | `your-unsplash-access-key` |

### Email Configuration

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `SMTP_HOST` | No | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | No | SMTP server port | `587` |
| `SMTP_USER` | No | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | No | SMTP password | `your-email-password` |
| `FROM_ADMIN_EMAIL` | No | Default from email for admin notifications | `admin@dev.clickvid.site` |
| `FROM_SUPPORT_EMAIL` | No | Default from email for support tickets | `support@dev.clickvid.site` |

### File Storage

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `AWS_ACCESS_KEY_ID` | No | AWS access key for S3 storage | `your-aws-access-key` |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key for S3 storage | `your-aws-secret-key` |
| `AWS_REGION` | No | AWS region for S3 storage | `us-east-1` |
| `AWS_S3_BUCKET` | No | S3 bucket name for file storage | `your-bucket-name` |
| `WASABI_ENDPOINT_URL` | No | Wasabi endpoint URL (if using Wasabi) | `s3.us-east-1.wasabisys.com` |

### Monitoring and Analytics

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `SENTRY_DSN` | No | Sentry DSN for error tracking | `https://your-sentry-dsn.ingest.sentry.io` |
| `GOOGLE_ANALYTICS_ID` | No | Google Analytics tracking ID | `G-XXXXXXXXXX` |

### Firebase Configuration

| Variable | Required | Description | Example Value |
|----------|----------|-------------|---------------|
| `FIREBASE_PROJECT_ID` | No | Firebase project ID | `your-project-id` |
| `FIREBASE_PRIVATE_KEY` | No | Firebase private key (JSON format) | `-----BEGIN PRIVATE KEY-----\n...` |
| `FIREBASE_CLIENT_EMAIL` | No | Firebase client email | `firebase-adminsdk@your-project.iam.gserviceaccount.com` |

## Configuration Notes

### Database URL Format
The `DATABASE_URL` must be a properly formatted PostgreSQL connection string:
```
postgresql://username:password@hostname:5432/database?schema=public
```

### Redis URL Format
The `REDIS_URL` should include authentication if your Redis server requires it:
```
redis://username:password@hostname:6379
```

### NextAuth Configuration
- `NEXTAUTH_URL` should be the public-facing URL of your application
- `NEXTAUTH_URL_INTERNAL` should be the internal URL (usually `http://localhost:3000`)
- The `NEXTAUTH_SECRET` should be a long, random string for security

### Admin Emails Format
The `ADMIN_EMAILS` variable accepts a comma-separated list of email addresses:
```
admin1@example.com,admin2@example.com,admin3@example.com
```

## Security Considerations

1. **Secret Management**: All secret keys and passwords should be stored securely in Coolify's environment variables and not committed to version control.

2. **Strong Secrets**: Use strong, randomly generated secrets for:
   - `NEXTAUTH_SECRET`
   - `CRON_SECRET`
   - Any API keys

3. **HTTPS**: Ensure all URLs use HTTPS in production environments.

4. **Database Security**: The database should not be publicly accessible. Use Coolify's networking features to restrict access.

## Testing Environment Variables

To test your environment variables before deploying:

1. Create a `.env.local` file in your project root
2. Add all required variables with your test values
3. Run the application locally to verify everything works
4. Remove the `.env.local` file before committing

## Coolify Configuration

In Coolify, add these environment variables in the application's "Environment" tab:

1. Go to Applications > ClickVid Develops > Environment
2. Add each variable with its corresponding value
3. Ensure "Expose to Web" is unchecked for sensitive variables
4. Click "Save" and then "Deploy" to apply changes

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Verify `DATABASE_URL` format and that the database is accessible from the Coolify server.

2. **Authentication Failures**: Check that `NEXTAUTH_URL` matches your public domain and that all OAuth credentials are correct.

3. **Redis Connection Issues**: Verify `REDIS_URL` format and that Redis is running and accessible.

4. **Permission Errors**: Ensure all API keys and credentials have the necessary permissions.

### Debugging Steps

1. Check application logs in Coolify for specific error messages
2. Verify environment variables are correctly set in the Coolify dashboard
3. Test database connectivity using `npx prisma db push` in a local environment
4. Verify Redis connectivity using Redis CLI

## Minimum Required Variables

For a basic functional deployment, you must have at least these variables set:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=your-database-url
REDIS_URL=your-redis-url
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://dev.clickvid.site
NEXTAUTH_URL_INTERNAL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CRON_SECRET=your-cron-secret
ADMIN_EMAILS=your-admin-email@example.com
```

All other variables are optional but may be required for specific features to function properly.