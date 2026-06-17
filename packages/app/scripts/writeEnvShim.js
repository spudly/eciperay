#!/usr/bin/env node
const path = require('node:path');

const {writeEnvShim} = require('./envShim');

const projectRoot = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(projectRoot, '../..');

writeEnvShim({monorepoRoot, outputPath: path.join(projectRoot, 'env-shim.js')});
