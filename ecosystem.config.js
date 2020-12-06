module.exports = {
  apps : [{
    name: "task_manager",
    script: './dist/lib/task_manager.js',
  }, {
    name: 'proxy_manager',
    script: './dist/lib/proxy_manager.js',
  }, {
    name: 'session_manager',
    script: './dist/lib/session_manager.js'
  }],
};
