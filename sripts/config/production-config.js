// Production configuration for AI Test Generator
const path = require('path');

const ProductionConfig = {
  // Environment Settings
  environment: {
    nodeEnv: process.env.NODE_ENV || 'production',
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    enableTracing: process.env.ENABLE_TRACING === 'true'
  },

  // API Configuration
  api: {
    gemini: {
      apiKey: process.env.GEMINI_API,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      maxRetries: parseInt(process.env.API_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.API_RETRY_DELAY) || 1000,
      timeout: parseInt(process.env.API_TIMEOUT) || 30000,
      requestsPerMinute: parseInt(process.env.API_REQUESTS_PER_MINUTE) || 60
    }
  },

  // Performance Settings
  performance: {
    maxConcurrentFiles: parseInt(process.env.MAX_CONCURRENT_FILES) || 3,
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 2,
    batchSize: parseInt(process.env.BATCH_SIZE) || 5,
    memoryLimit: process.env.MEMORY_LIMIT || '512MB',
    cpuThreshold: parseFloat(process.env.CPU_THRESHOLD) || 80,
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    cacheTimeout: parseInt(process.env.CACHE_TIMEOUT) || 3600000 // 1 hour
  },

  // Coverage Thresholds
  coverage: {
    global: {
      statements: parseInt(process.env.COVERAGE_STATEMENTS) || 80,
      branches: parseInt(process.env.COVERAGE_BRANCHES) || 75,
      functions: parseInt(process.env.COVERAGE_FUNCTIONS) || 85,
      lines: parseInt(process.env.COVERAGE_LINES) || 80
    },
    
    // File-specific thresholds
    fileThresholds: {
      critical: { // Critical files require higher coverage
        statements: 90,
        branches: 85,
        functions: 95,
        lines: 90
      },
      
      standard: { // Standard files
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80
      },
      
      experimental: { // Experimental/new features
        statements: 70,
        branches: 60,
        functions: 75,
        lines: 70
      }
    },

    // Coverage reporting
    reporting: {
      formats: (process.env.COVERAGE_FORMATS || 'html,json,lcov,clover').split(','),
      outputDir: process.env.COVERAGE_OUTPUT_DIR || 'coverage',
      storeHistory: process.env.STORE_COVERAGE_HISTORY !== 'false',
      historyRetention: parseInt(process.env.HISTORY_RETENTION_DAYS) || 30,
      generateTrends: process.env.GENERATE_TRENDS !== 'false'
    }
  },

  // File Processing
  fileProcessing: {
    // Directories to include
    includeDirectories: (process.env.INCLUDE_DIRECTORIES || 'server,src').split(','),
    
    // Directories to exclude
    excludeDirectories: [
      'node_modules',
      'coverage',
      'tests',
      'test',
      '__tests__',
      '.git',
      'dist',
      'build',
      'logs',
      'reports',
      'sripts',
      'tmp',
      'temp'
    ],
    
    // File patterns to include
    includePatterns: [
      '**/*.js'
    ],
    
    // File patterns to exclude
    excludePatterns: [
      '**/*.test.js',
      '**/*.spec.js',
      '**/*_test.js',
      '**/*_spec.js',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**'
    ],
    
    // File size limits (in bytes)
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 1024 * 1024, // 1MB
    minFileSize: parseInt(process.env.MIN_FILE_SIZE) || 10, // 10 bytes
    
    // Backup settings
    createBackups: process.env.CREATE_BACKUPS !== 'false',
    backupRetention: parseInt(process.env.BACKUP_RETENTION_DAYS) || 7
  },

  // Git Integration
  git: {
    enabled: process.env.GIT_ENABLED !== 'false',
    remoteName: process.env.GIT_REMOTE_NAME || 'origin',
    mainBranch: process.env.GIT_MAIN_BRANCH || 'main',
    requireCleanWorkingDirectory: process.env.REQUIRE_CLEAN_WD === 'true',
    autoCommit: process.env.AUTO_COMMIT_TESTS === 'true',
    commitMessage: process.env.COMMIT_MESSAGE || 'chore: update generated tests [automated]',
    tagReleases: process.env.TAG_RELEASES === 'true'
  },

  // Security Settings
  security: {
    // Sanitize logs to remove sensitive information
    sanitizeLogs: process.env.SANITIZE_LOGS !== 'false',
    
    // API key rotation
    apiKeyRotation: {
      enabled: process.env.API_KEY_ROTATION === 'true',
      rotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL) || 7, // days
      keyVersions: parseInt(process.env.KEY_VERSIONS) || 2
    },
    
    // Report encryption
    encryptReports: {
      enabled: process.env.ENCRYPT_REPORTS === 'true',
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      keyPath: process.env.ENCRYPTION_KEY_PATH
    },
    
    // Rate limiting
    rateLimiting: {
      enabled: process.env.RATE_LIMITING !== 'false',
      windowMs: parseInt(process.env.RATE_WINDOW_MS) || 60000, // 1 minute
      maxRequests: parseInt(process.env.RATE_MAX_REQUESTS) || 100
    }
  },

  // Monitoring and Alerting
  monitoring: {
    // Health checks
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      port: parseInt(process.env.HEALTH_CHECK_PORT) || 8080,
      path: process.env.HEALTH_CHECK_PATH || '/health'
    },
    
    // Metrics collection
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      collectInterval: parseInt(process.env.METRICS_INTERVAL) || 60000, // 1 minute
      endpoint: process.env.METRICS_ENDPOINT,
      exportFormat: process.env.METRICS_FORMAT || 'prometheus'
    },
    
    // Error tracking
    errorTracking: {
      enabled: process.env.ERROR_TRACKING !== 'false',
      sentryDsn: process.env.SENTRY_DSN,
      bugsnagApiKey: process.env.BUGSNAG_API_KEY
    },
    
    // Alerting
    alerts: {
      enabled: process.env.ALERTS_ENABLED === 'true',
      
      // Coverage alerts
      coverage: {
        thresholdAlert: process.env.COVERAGE_ALERT_THRESHOLD || 75,
        significantDropAlert: process.env.COVERAGE_DROP_THRESHOLD || 5 // percentage points
      },
      
      // Performance alerts
      performance: {
        maxExecutionTime: parseInt(process.env.MAX_EXECUTION_TIME) || 1800000, // 30 minutes
        maxMemoryUsage: process.env.MAX_MEMORY_USAGE || '1GB',
        maxErrorRate: parseFloat(process.env.MAX_ERROR_RATE) || 5 // percentage
      }
    }
  },

  // Notifications
  notifications: {
    // Slack integration
    slack: {
      enabled: process.env.SLACK_NOTIFICATIONS === 'true',
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL || '#test-automation',
      username: process.env.SLACK_USERNAME || 'AI Test Generator',
      successEmoji: process.env.SLACK_SUCCESS_EMOJI || ':white_check_mark:',
      failureEmoji: process.env.SLACK_FAILURE_EMOJI || ':x:',
      warningEmoji: process.env.SLACK_WARNING_EMOJI || ':warning:'
    },
    
    // Email notifications
    email: {
      enabled: process.env.EMAIL_NOTIFICATIONS === 'true',
      smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      },
      from: process.env.EMAIL_FROM || 'ai-test-generator@company.com',
      to: process.env.EMAIL_TO ? process.env.EMAIL_TO.split(',') : [],
      templates: {
        success: process.env.EMAIL_SUCCESS_TEMPLATE,
        failure: process.env.EMAIL_FAILURE_TEMPLATE,
        warning: process.env.EMAIL_WARNING_TEMPLATE
      }
    },
    
    // Teams integration
    teams: {
      enabled: process.env.TEAMS_NOTIFICATIONS === 'true',
      webhookUrl: process.env.TEAMS_WEBHOOK_URL,
      theme: process.env.TEAMS_THEME || '#0078D4'
    }
  },

  // CI/CD Integration
  cicd: {
    // General CI/CD settings
    enabled: process.env.CI === 'true',
    provider: process.env.CI_PROVIDER, // github, gitlab, jenkins, etc.
    
    // Fail conditions
    failOnCoverageThreshold: process.env.FAIL_ON_COVERAGE !== 'false',
    failOnTestFailures: process.env.FAIL_ON_TEST_FAILURES !== 'false',
    failOnGenerationErrors: process.env.FAIL_ON_GENERATION_ERRORS === 'true',
    
    // Artifacts
    generateArtifacts: process.env.GENERATE_ARTIFACTS !== 'false',
    artifactsPath: process.env.ARTIFACTS_PATH || 'artifacts',
    artifactRetention: parseInt(process.env.ARTIFACT_RETENTION_DAYS) || 30,
    
    // GitHub Actions specific
    github: {
      outputSummary: process.env.GITHUB_OUTPUT_SUMMARY !== 'false',
      createAnnotations: process.env.GITHUB_CREATE_ANNOTATIONS !== 'false',
      updatePullRequest: process.env.GITHUB_UPDATE_PR === 'true',
      botToken: process.env.GITHUB_BOT_TOKEN
    },
    
    // GitLab CI specific
    gitlab: {
      createMergeRequestNote: process.env.GITLAB_CREATE_MR_NOTE === 'true',
      updateCoverageBadge: process.env.GITLAB_UPDATE_BADGE === 'true',
      accessToken: process.env.GITLAB_ACCESS_TOKEN
    },
    
    // Jenkins specific
    jenkins: {
      publishHtmlReports: process.env.JENKINS_PUBLISH_HTML !== 'false',
      archiveArtifacts: process.env.JENKINS_ARCHIVE_ARTIFACTS !== 'false',
      buildUrl: process.env.BUILD_URL,
      jobName: process.env.JOB_NAME
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    
    // File logging
    file: {
      enabled: process.env.FILE_LOGGING !== 'false',
      path: process.env.LOG_PATH || 'logs',
      maxSize: process.env.LOG_MAX_SIZE || '10MB',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
      rotationInterval: process.env.LOG_ROTATION || 'daily'
    },
    
    // Console logging
    console: {
      enabled: process.env.CONSOLE_LOGGING !== 'false',
      colorize: process.env.COLORIZE_LOGS !== 'false',
      timestamp: process.env.LOG_TIMESTAMP !== 'false'
    },
    
    // Remote logging
    remote: {
      enabled: process.env.REMOTE_LOGGING === 'true',
      endpoint: process.env.REMOTE_LOG_ENDPOINT,
      apiKey: process.env.REMOTE_LOG_API_KEY,
      bufferSize: parseInt(process.env.LOG_BUFFER_SIZE) || 100,
      flushInterval: parseInt(process.env.LOG_FLUSH_INTERVAL) || 5000
    }
  },

  // Storage Configuration
  storage: {
    // Local storage
    local: {
      enabled: true,
      basePath: process.env.STORAGE_PATH || process.cwd(),
      createDirectories: true
    },
    
    // Cloud storage (optional)
    cloud: {
      enabled: process.env.CLOUD_STORAGE_ENABLED === 'true',
      provider: process.env.CLOUD_PROVIDER, // aws, gcp, azure
      bucket: process.env.STORAGE_BUCKET,
      region: process.env.STORAGE_REGION,
      credentials: {
        accessKeyId: process.env.CLOUD_ACCESS_KEY,
        secretAccessKey: process.env.CLOUD_SECRET_KEY
      }
    }
  },

  // Feature Flags
  features: {
    enableMutationTesting: process.env.ENABLE_MUTATION_TESTING !== 'false',
    enableIncrementalTesting: process.env.ENABLE_INCREMENTAL_TESTING !== 'false',
    enableTestOptimization: process.env.ENABLE_TEST_OPTIMIZATION === 'true',
    enableParallelProcessing: process.env.ENABLE_PARALLEL_PROCESSING !== 'false',
    enableAdvancedAnalysis: process.env.ENABLE_ADVANCED_ANALYSIS === 'true',
    enableMachineLearning: process.env.ENABLE_ML === 'true',
    experimentalFeatures: process.env.ENABLE_EXPERIMENTAL === 'true'
  },

  // Development overrides (only in dev/test environments)
  development: {
    enabled: process.env.NODE_ENV !== 'production',
    mockExternalAPIs: process.env.MOCK_EXTERNAL_APIS === 'true',
    skipSlowTests: process.env.SKIP_SLOW_TESTS === 'true',
    verboseLogging: process.env.VERBOSE_DEV_LOGGING === 'true',
    hotReload: process.env.HOT_RELOAD === 'true'
  }
};

// Validation functions
function validateConfig() {
  const errors = [];
  
  // Required environment variables
  if (!ProductionConfig.api.gemini.apiKey) {
    errors.push('GEMINI_API environment variable is required');
  }
  
  // Validate coverage thresholds
  const { global } = ProductionConfig.coverage;
  if (global.statements < 0 || global.statements > 100) {
    errors.push('Coverage statements threshold must be between 0 and 100');
  }
  
  // Validate performance settings
  if (ProductionConfig.performance.maxConcurrentFiles < 1) {
    errors.push('maxConcurrentFiles must be at least 1');
  }
  
  // Validate file size limits
  if (ProductionConfig.fileProcessing.maxFileSize < ProductionConfig.fileProcessing.minFileSize) {
    errors.push('maxFileSize must be greater than minFileSize');
  }
  
  // Validate notification settings
  if (ProductionConfig.notifications.slack.enabled && !ProductionConfig.notifications.slack.webhookUrl) {
    errors.push('SLACK_WEBHOOK_URL is required when Slack notifications are enabled');
  }
  
  if (ProductionConfig.notifications.email.enabled && !ProductionConfig.notifications.email.smtp.host) {
    errors.push('SMTP_HOST is required when email notifications are enabled');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}

function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const configs = {
    development: {
      ...ProductionConfig,
      logging: {
        ...ProductionConfig.logging,
        level: 'debug'
      },
      performance: {
        ...ProductionConfig.performance,
        maxConcurrentFiles: 1 // Reduce concurrency in dev
      }
    },
    
    test: {
      ...ProductionConfig,
      api: {
        ...ProductionConfig.api,
        gemini: {
          ...ProductionConfig.api.gemini,
          timeout: 5000 // Shorter timeout in tests
        }
      },
      fileProcessing: {
        ...ProductionConfig.fileProcessing,
        createBackups: false // Don't create backups in tests
      }
    },
    
    staging: {
      ...ProductionConfig,
      notifications: {
        ...ProductionConfig.notifications,
        // Reduce notifications in staging
        slack: { ...ProductionConfig.notifications.slack, enabled: false },
        email: { ...ProductionConfig.notifications.email, enabled: false }
      }
    },
    
    production: ProductionConfig
  };
  
  return configs[env] || ProductionConfig;
}

module.exports = {
  ProductionConfig,
  validateConfig,
  getEnvironmentConfig
};
