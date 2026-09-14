module.exports = {
  apps: [
    {
      name: "vaultx-bot",
      script: "src/index.js",
      watch: false,
      autorestart: true,
      max_restarts: 50,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
