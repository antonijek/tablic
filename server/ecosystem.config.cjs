module.exports = {
  apps: [{ name: 'tablic-server', script: 'dist/index.js', cwd: __dirname, env: { PORT: 3004 } }],
};
