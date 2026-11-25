// PM2 process file: three independent processes (master spec §14).
module.exports = {
  apps: [
    { name: 'origin-admin', script: 'admin/index.js', env: { NODE_ENV: 'production' } },
    { name: 'origin-api', script: 'app/index.js', env: { NODE_ENV: 'production' } },
    { name: 'origin-worker', script: 'worker/index.js', env: { NODE_ENV: 'production' } },
  ],
};
