module.exports = {
  apps: [
    {
      name: "safescan-backend",
      script: "index.js",
      cwd: "/var/www/myapp",
      instances: 1, // keep at 1: Socket.IO online-count is stored in memory
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      kill_timeout: 10000,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "127.0.0.1",
      },
    },
  ],
};