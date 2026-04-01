module.exports = {
  apps: [
    {
      name: "kosttilskudsvalg",
      script: "npm",
      args: "start",
      cwd: "/var/www/kosttilskudsvalg",
      user: "webapp",
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
      exp_backoff_restart_delay: 100,
      kill_timeout: 10000,
      listen_timeout: 15000,
      env: {
        NODE_ENV: "production",
        PORT: "3001",
      },
    },
  ],
}
