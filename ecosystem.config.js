module.exports = {
  apps: [
    {
      name: "safescan-backend",
      script: "index.js",
      cwd: "/var/www/myapp", // change if your backend lives in a different folder
      instances: 1, // keep at 1: Socket.IO online-count is stored in memory
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      kill_timeout: 10000, // gives server.js time to shut down gracefully
      time: true, // timestamps in logs
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};