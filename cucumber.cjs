module.exports = {
  default: {
    import: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
    loader: ['ts-node/esm'],
    format: [
      'progress',
      'json:reports/cucumber_report.json',
      'html:reports/cucumber_report.html',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    publishQuiet: true,
    timeout: 30000,
  },
};
