@echo off
REM Build script with resource limits for 8GB RAM systems
REM This limits Docker to 4GB RAM and 2 CPU cores

echo Building with resource limits...

docker buildx build ^
  --platform linux/amd64 ^
  --file Dockerfile.lowram ^
  --memory 4g ^
  --memory-swap 6g ^
  --cpus="2.0" ^
  --progress=plain ^
  -t clickveed:latest ^
  .

if %ERRORLEVEL% EQU 0 (
    echo Build successful!
) else (
    echo Build failed with error code %ERRORLEVEL%
)
