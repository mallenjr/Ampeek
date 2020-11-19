module.exports = {
  apps : [{
    name: "scraper",
    script: './dist/index.js',
  }, {
    name: 'scheduler',
    script: './dist/scheduler.js',
  }],
};
