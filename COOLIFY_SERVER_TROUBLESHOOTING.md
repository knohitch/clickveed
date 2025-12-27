# Coolify Server Configuration Red Alert Troubleshooting Guide

## Issue Description
- **Symptom**: Generic red status indicator in Coolify's server configurations tab
- **Additional Issue**: dev.clickvid.site shows "no any server" (likely indicating the domain isn't resolving to an active server)
- **Context**: This appears after a successful code push but before/after deployment attempts

## Common Causes for Generic Red Status in Coolify
Coolify shows a generic red alert when it can't communicate with the server. This is typically not a code issue but a server connectivity or configuration problem. Possible causes:

1. **SSH Connectivity Issues**: Coolify can't connect to the server via SSH
2. **Server Offline/Unreachable**: The server is down, firewalled, or network issues
3. **Authentication Problems**: SSH keys or credentials are invalid/expired
4. **Resource Exhaustion**: Server out of disk space, memory, or CPU
5. **Coolify Agent Issues**: The Coolify agent on the server isn't running
6. **Domain/DNS Configuration**: Domain not properly pointed to the server IP
7. **Firewall/Port Blocking**: Required ports (SSH:22, HTTP:80, HTTPS:443) blocked

## Step-by-Step Troubleshooting

### Step 1: Verify Server Accessibility
1. **Ping the Server**: From your local machine, ping the server's IP address
   ```bash
   ping YOUR_SERVER_IP
   ```
2. **SSH Test**: Try SSHing into the server manually
   ```bash
   ssh root@YOUR_SERVER_IP  # or your username
   ```
   - If this fails, the issue is basic connectivity (network/firewall)

### Step 2: Check Coolify Server Configuration
1. **In Coolify Dashboard**:
   - Go to **Servers** > Select your server
   - Click **Test Connection** or **Reconnect**
   - Check the **Server Status** section for any specific error hints

2. **Review Server Details**:
   - Verify the **IP Address** is correct
   - Confirm **SSH Port** (default 22) matches your server setup
   - Ensure **SSH User** (usually `root` or `ubuntu`) is correct

### Step 3: Validate SSH Configuration
1. **Check SSH Keys**:
   - In Coolify: Servers > Your Server > **SSH Keys** tab
   - Ensure the public key is added to the server's `~/.ssh/authorized_keys`
   - Regenerate keys if needed and update Coolify

2. **Server-Side SSH Check**:
   - SSH into server manually
   - Run: `sudo systemctl status ssh` (or `sshd`)
   - Ensure SSH service is running: `sudo systemctl start ssh` if stopped

### Step 4: Check Server Resources
1. **SSH into Server** (if possible):
   ```bash
   # Check disk space
   df -h
   
   # Check memory usage
   free -h
   
   # Check CPU load
   top  # or htop if installed
   ```

2. **Coolify Agent Status**:
   ```bash
   # Check if Coolify agent is running
   sudo systemctl status coolify
   
   # Restart if needed
   sudo systemctl restart coolify
   ```

### Step 5: Domain and DNS Configuration
1. **Verify DNS Records**:
   - Check if `dev.clickvid.site` A record points to your server IP
   - Use: `dig dev.clickvid.site` or online DNS checker
   - TTL might need time to propagate (up to 48 hours)

2. **In Coolify**:
   - Go to **Applications** > Your App > **Domains** tab
   - Ensure `dev.clickvid.site` is added and SSL is configured
   - Click **Provision SSL** if not already done

3. **Test Domain Resolution**:
   ```bash
   # From local machine
   nslookup dev.clickvid.site
   curl -I http://dev.clickvid.site
   ```

### Step 6: Review Logs
1. **Coolify Logs**:
   - Servers > Your Server > **Logs** tab
   - Look for connection errors, timeouts, or authentication failures

2. **Application Logs** (if deployment partially succeeded):
   - Applications > Your App > **Logs** tab
   - Check for runtime errors post-deployment

3. **Server Logs**:
   ```bash
   # SSH into server
   sudo journalctl -u coolify -f  # Coolify service logs
   sudo tail -f /var/log/syslog   # General system logs
   ```

### Step 7: Restart and Reconfigure
1. **Restart Coolify Services** (on server):
   ```bash
   sudo systemctl restart coolify
   sudo systemctl restart docker  # If using Docker
   ```

2. **Re-add Server in Coolify**:
   - If all else fails, remove the server from Coolify and re-add it
   - This refreshes the connection

3. **Redeploy Application**:
   - Once server status is green, trigger a new deployment
   - Monitor the build and runtime logs closely

## Quick Fixes to Try First
1. **Reconnect Server**: In Coolify, click the reconnect button for your server
2. **Check Firewall**: Ensure ports 22 (SSH), 80 (HTTP), 443 (HTTPS) are open
3. **Verify IP**: Confirm the server's public IP hasn't changed
4. **Coolify Version**: Ensure you're using the latest Coolify version

## When to Contact Support
- If SSH connectivity works but Coolify still shows red
- Persistent authentication errors despite correct keys
- Server resources are fine but agent won't start
- Contact Coolify support or check their Discord/community

## Expected Resolution Time
- Basic connectivity: 5-10 minutes
- SSH key issues: 10-15 minutes
- DNS propagation: Up to 48 hours (but usually faster)

---

**Last Updated**: 2025-09-27  
**Status**: Generic red alert - likely connectivity issue  
**Next Action**: Follow Step 1-2 to verify basic server access