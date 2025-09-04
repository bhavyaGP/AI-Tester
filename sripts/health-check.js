const http = require('http');
const fs = require('fs');
const path = require('path');

class HealthCheck {
  constructor() {
    this.port = process.env.HEALTH_CHECK_PORT || 8080;
    this.path = process.env.HEALTH_CHECK_PATH || '/health';
    this.checks = {
      fileSystem: this.checkFileSystem.bind(this),
      memory: this.checkMemory.bind(this),
      environment: this.checkEnvironment.bind(this),
      git: this.checkGit.bind(this),
      dependencies: this.checkDependencies.bind(this)
    };
  }

  async runHealthCheck() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.getVersion(),
      checks: {}
    };

    let hasErrors = false;

    for (const [checkName, checkFunction] of Object.entries(this.checks)) {
      try {
        const checkResult = await checkFunction();
        results.checks[checkName] = {
          status: 'pass',
          ...checkResult
        };
      } catch (error) {
        hasErrors = true;
        results.checks[checkName] = {
          status: 'fail',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    if (hasErrors) {
      results.status = 'unhealthy';
    }

    return results;
  }

  async checkFileSystem() {
    const requiredDirs = ['logs', 'reports', 'coverage'];
    const results = { directories: {} };

    for (const dir of requiredDirs) {
      try {
        await fs.promises.access(dir, fs.constants.W_OK);
        results.directories[dir] = 'writable';
      } catch (error) {
        if (error.code === 'ENOENT') {
          // Try to create the directory
          try {
            await fs.promises.mkdir(dir, { recursive: true });
            results.directories[dir] = 'created';
          } catch (createError) {
            throw new Error(`Cannot create directory ${dir}: ${createError.message}`);
          }
        } else {
          throw new Error(`Directory ${dir} not writable: ${error.message}`);
        }
      }
    }

    return results;
  }

  async checkMemory() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

    const memoryLimit = parseInt(process.env.MEMORY_LIMIT) || 512;

    if (totalMB > memoryLimit) {
      throw new Error(`Memory usage (${totalMB}MB) exceeds limit (${memoryLimit}MB)`);
    }

    return {
      rss: `${totalMB}MB`,
      heapUsed: `${heapUsedMB}MB`,
      heapTotal: `${heapTotalMB}MB`,
      limit: `${memoryLimit}MB`,
      usage: `${Math.round((totalMB / memoryLimit) * 100)}%`
    };
  }

  async checkEnvironment() {
    const required = ['GEMINI_API'];
    const optional = ['LOG_LEVEL', 'MAX_CONCURRENT_FILES', 'COVERAGE_STATEMENTS'];
    const results = { required: {}, optional: {} };

    for (const envVar of required) {
      if (process.env[envVar]) {
        results.required[envVar] = 'set';
      } else {
        throw new Error(`Required environment variable ${envVar} not set`);
      }
    }

    for (const envVar of optional) {
      results.optional[envVar] = process.env[envVar] || 'default';
    }

    return results;
  }

  async checkGit() {
    const { execSync } = require('child_process');
    
    try {
      // Check if it's a git repository
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      
      // Get current branch
      const branch = execSync('git branch --show-current', { stdio: 'pipe' }).toString().trim();
      
      // Get last commit
      const lastCommit = execSync('git rev-parse --short HEAD', { stdio: 'pipe' }).toString().trim();
      
      // Check for uncommitted changes
      const status = execSync('git status --porcelain', { stdio: 'pipe' }).toString().trim();
      
      return {
        branch: branch,
        lastCommit: lastCommit,
        hasUncommittedChanges: status.length > 0,
        status: status.length > 0 ? 'dirty' : 'clean'
      };
    } catch (error) {
      throw new Error(`Git check failed: ${error.message}`);
    }
  }

  async checkDependencies() {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['@google/generative-ai', 'jest', 'winston'];
    const results = { dependencies: {} };

    for (const dep of requiredDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        results.dependencies[dep] = packageJson.dependencies[dep];
      } else {
        throw new Error(`Required dependency ${dep} not found in package.json`);
      }
    }

    // Check if node_modules exists
    try {
      await fs.promises.access('node_modules', fs.constants.R_OK);
      results.nodeModules = 'exists';
    } catch {
      throw new Error('node_modules directory not found');
    }

    return results;
  }

  getVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return 'unknown';
    }
  }

  startServer() {
    const server = http.createServer(async (req, res) => {
      if (req.url === this.path && req.method === 'GET') {
        try {
          const healthData = await this.runHealthCheck();
          const statusCode = healthData.status === 'healthy' ? 200 : 503;
          
          res.writeHead(statusCode, {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          });
          
          res.end(JSON.stringify(healthData, null, 2));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          }));
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(this.port, () => {
      console.log(`Health check server running on port ${this.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('Shutting down health check server...');
      server.close(() => {
        process.exit(0);
      });
    });

    return server;
  }
}

// CLI usage
async function runHealthCheckCLI() {
  const healthCheck = new HealthCheck();
  
  try {
    const results = await healthCheck.runHealthCheck();
    console.log(JSON.stringify(results, null, 2));
    
    const exitCode = results.status === 'healthy' ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

// Server mode
function runHealthCheckServer() {
  const healthCheck = new HealthCheck();
  healthCheck.startServer();
}

// Auto-detect usage mode
if (require.main === module) {
  if (process.env.HEALTH_CHECK_SERVER === 'true') {
    runHealthCheckServer();
  } else {
    runHealthCheckCLI();
  }
}

module.exports = HealthCheck;
