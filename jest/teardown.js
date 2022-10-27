/* eslint-disable camelcase */
const child_process = require('child_process');
const { promisify } = require('util');

const exec = promisify(child_process.exec);

const stopContainers = async () => {
  process.stdout.write('Stopping containers...');
  await exec('docker-compose down');
};

module.exports = async () => {
  if (!process.env.CI) {
    await stopContainers();
  }
};
