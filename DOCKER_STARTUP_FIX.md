# Docker Startup Script Fix

## Problem

The Docker container was failing to start with the error:
```
/usr/local/bin/docker-entrypoint.sh: exec: line 11: ./startup.sh: not found
```

This error occurs because the container was unable to find or execute the `startup.sh` script that should handle database migrations and start the application.

## Root Causes

1. The Dockerfile was using a CMD command that directly executed the commands instead of using the startup.sh script.
2. The startup.sh script was using `#!/bin/bash` shebang which may not be available in Alpine Linux (which uses BusyBox and has `/bin/sh` instead).

## Changes Made

### 1. Updated Dockerfile

Changed the CMD instruction to use the startup.sh script:

```dockerfile
# Before
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node server.js"]

# After
CMD ["./startup.sh"]
```

### 2. Updated startup.sh

Modified the startup script to be compatible with Alpine Linux:

```sh
# Changed shebang from #!/bin/bash to #!/bin/sh
# Simplified the script by removing bash-specific syntax
# Removed conditional tsx installation which is not needed in the container
```

## Verification

After these changes, the Docker container should start properly, with:
1. Prisma migrations being deployed
2. Database seeding running
3. The Next.js application starting correctly

## Additional Notes

- The Alpine Linux image uses BusyBox which provides a minimal `/bin/sh` shell
- Executable permissions for the startup.sh script are set in the Dockerfile with `RUN chmod +x ./startup.sh`
- All commands are run under the non-root `nextjs` user as set in the Dockerfile
