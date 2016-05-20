const process = require('process');

module.exports = {
  token: process.env['TOKEN'],
  githubOrg: '18f',
  depFiles: [
    'bower.json',
    'package.json'
  ],
  valuedDeps: [
    'angular',
    'angularjs',
    'backbone',
    'bootstrap',
    'd3',
    'ember',
    'jquery',
    'meteor',
    'react',
    'uswds'
  ]
}
