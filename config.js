const process = require('process');

module.exports = {
  token: process.env['TOKEN'],
  githubOrg: '18f',
  valuedDeps: [
    'backbone',
    'angular',
    'react',
    'ember',
    'meteor',
    'jquery',
    'd3',
    'uswds'
  ]
}
