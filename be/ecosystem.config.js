module.exports = {
  apps: [
    {
      name: 'd-k-api',
      cwd: __dirname,
      script: 'app.js',
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: 5000
      }
    }
  ]
};
