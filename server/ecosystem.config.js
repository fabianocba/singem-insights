module.exports = {
  apps: [
    {
      name: 'singem-server',
      script: 'index.js',
      cwd: '/root/SINGEM/server',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
