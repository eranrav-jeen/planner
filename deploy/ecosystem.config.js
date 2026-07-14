module.exports = {
  apps: [
    {
      name: 'jeen-planner-api',
      cwd: '/var/www/jeen-project-planner/apps/api',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
