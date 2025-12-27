# ClickVid Coolify Docker Settings Guide

## Overview

This guide provides specific configuration for the Docker settings in Coolify when deploying the ClickVid application. These settings ensure proper build and deployment of your application.

## Docker Settings Configuration

### Docker Registry
- **Setting**: Docker Registry
- **Value**: Leave empty (default)
- **Explanation**: 
  - This is for private registries like Docker Hub, AWS ECR, or Google Container Registry
  - Since you're building from a GitHub repository, no registry is needed
  - Coolify will build the image directly from your code

### Docker Image
- **Setting**: Docker Image
- **Value**: Leave empty (default)
- **Explanation**:
  - This field is for when you're pulling an existing image from a registry
  - Since you're building from source, Coolify will generate the image name automatically
  - The image will be named based on your application name in Coolify

### Docker Image Tag
- **Setting**: Docker Image Tag
- **Value**: Leave empty (default)
- **Explanation**:
  - This specifies the tag/version of the image to use
  - When building from source, Coolify automatically tags the image
  - Default behavior is to use "latest" or a commit hash for versioning

### Build Settings

#### Base Directory
- **Setting**: Base Directory
- **Value**: `/`
- **Explanation**:
  - This is the root directory for the build context
  - Your Dockerfile is in the root of the repository
  - All files needed for the build are in the root directory
  - **Do not change this value**

#### Dockerfile Location
- **Setting**: Dockerfile Location
- **Value**: `/Dockerfile`
- **Explanation**:
  - This tells Coolify where to find your Dockerfile
  - The leading `/` indicates it's in the root of the repository
  - This is the correct location for your setup
  - **Do not change this value**

#### Docker Build Stage Target
- **Setting**: Docker Build Stage Target
- **Value**: Leave empty (default)
- **Explanation**:
  - This is used to specify a specific stage in a multi-stage Dockerfile
  - Your Dockerfile has multiple stages (base, deps, builder, runner)
  - By leaving this empty, Coolify will use the final stage (runner) by default
  - This is the correct behavior for your application

#### Watch Paths
- **Setting**: Watch Paths
- **Value**: Leave empty (default)
- **Explanation**:
  - This is for automatic rebuilds when specific files change
  - For production deployments, automatic rebuilds are typically not desired
  - You want to control when deployments happen
  - **Leave this empty** for production stability

#### Custom Docker Options
- **Setting**: Custom Docker Options
- **Value**: Leave empty (default)
- **Explanation**:
  - This allows adding custom Docker build arguments
  - Your Dockerfile already includes `ARG CACHE_BUST=1` for cache invalidation
  - No additional options are needed for your setup
  - **Leave this empty** unless you have specific advanced requirements

#### Use a Build Server?
- **Setting**: Use a Build Server?
- **Value**: No (default)
- **Explanation**:
  - This is for offloading builds to a separate server
  - For most deployments, building on the same server is sufficient
  - Unless you have specific performance or resource constraints
  - **Select "No"** for your deployment

## Complete Configuration Summary

Here's how your Docker settings should look in Coolify:

```
Docker Registry
Docker Image: [leave empty]
Docker Image Tag: [leave empty]

Build
Base Directory: /
Dockerfile Location: /Dockerfile
Docker Build Stage Target: [leave empty]
Watch Paths: [leave empty]
Custom Docker Options: [leave empty]
Use a Build Server? No
```

## Why These Settings Are Correct for ClickVid

1. **Repository Structure**:
   - Your Dockerfile is in the root directory
   - All necessary files (package.json, startup.sh, etc.) are in the root
   - The base directory of `/` ensures Coolify can find everything

2. **Multi-Stage Build**:
   - Your Dockerfile uses multiple stages for optimization
   - By not specifying a build stage target, Coolify uses the final stage
   - This ensures the production-ready image is used

3. **Cache Management**:
   - Your Dockerfile includes `ARG CACHE_BUST=1` for cache invalidation
   - No additional custom options are needed
   - This ensures fresh builds when needed

4. **Build Process**:
   - Coolify will build the image directly from your GitHub repository
   - No registry is needed for this workflow
   - The build happens on the same server where the application will run

## What Happens During Build

With these settings, Coolify will:

1. **Clone your repository** from GitHub
2. **Navigate to the base directory** (`/`)
3. **Find the Dockerfile** at `/Dockerfile`
4. **Execute the Docker build** using all stages
5. **Use the final stage** (runner) for the production image
6. **Tag the image** automatically
7. **Deploy the container** with your configured environment variables

## Troubleshooting

If you encounter issues with these settings:

1. **Build Fails**:
   - Verify the Dockerfile exists at the root of your repository
   - Check that all referenced files in the Dockerfile exist
   - Review the build logs for specific error messages

2. **File Not Found Errors**:
   - Ensure the Base Directory is set to `/`
   - Verify Dockerfile Location is `/Dockerfile`
   - Check that all files are in the correct locations in your repository

3. **Cache Issues**:
   - The `ARG CACHE_BUST=1` in your Dockerfile should handle cache invalidation
   - If you still have cache issues, you can increment the value (e.g., `ARG CACHE_BUST=2`)

4. **Permission Issues**:
   - Ensure the Dockerfile has proper permissions in your repository
   - Verify that the startup.sh script is executable (chmod +x)

## Best Practices

1. **Keep These Settings Default**:
   - The default values work perfectly for your setup
   - Only modify them if you have specific advanced requirements

2. **Version Control**:
   - Ensure your Dockerfile and all referenced files are committed to Git
   - The build process depends on files being in the repository

3. **Monitor Builds**:
   - Watch the build logs during deployment
   - Verify all stages complete successfully
   - Check for any warnings or errors

4. **Test Changes**:
   - If you modify any Docker settings, test in a non-production environment first
   - Ensure the application still functions correctly after changes

## Conclusion

The default Docker settings in Coolify are correct for your ClickVid application. The only fields that need specific values are:

- **Base Directory**: `/`
- **Dockerfile Location**: `/Dockerfile`

All other fields should be left empty or set to their default values. This configuration ensures that Coolify can properly build and deploy your application using the custom Dockerfile and startup script.