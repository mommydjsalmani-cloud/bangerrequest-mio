# Health Check Scripts

This directory contains health check scripts for monitoring the application status.

## Scripts Available

### 1. check_health.js (ES Module)
- **Format**: ES Module (import/export)
- **Usage**: `node scripts/check_health.js <url>`
- **Environment**: Local development, modern Node.js environments
- **Requirements**: Node.js with ES module support

### 2. check_health.cjs (CommonJS)
- **Format**: CommonJS (require/module.exports)  
- **Usage**: `node scripts/check_health.cjs <url>`
- **Environment**: GitHub Actions, CI environments, older Node.js
- **Requirements**: Any Node.js version

## Usage Examples

```bash
# Check production health (ES Module)
node scripts/check_health.js https://bangerrequest-8sasrdwae-mommys-projects-f4f4fbbb.vercel.app/api/health/supabase

# Check production health (CommonJS - more compatible)
node scripts/check_health.cjs https://bangerrequest-8sasrdwae-mommys-projects-f4f4fbbb.vercel.app/api/health/supabase

# Check local development
node scripts/check_health.cjs http://localhost:3000/api/health
```

## Output Format

```
STATUS 200
BODY {"ok":true,"mode":"supabase","tables":{"requests":true,"events":true}}
```

## Exit Codes

- `0`: Health check passed (status 200)
- `1`: Health check failed (non-200 status or error)

## Features

- ✅ Automatic HTTP/HTTPS protocol detection
- ✅ 10-second timeout protection
- ✅ Proper User-Agent headers
- ✅ Detailed error reporting
- ✅ Cross-platform compatibility