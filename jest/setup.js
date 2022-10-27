/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
const child_process = require('child_process');
const { promisify } = require('util');

const exec = promisify(child_process.exec);

const isContainerHealthy = async (containerName) => {
  const { stdout } = await exec(
    `docker inspect --format "{{.State.Health.Status}}" ${containerName}`,
  );
  return stdout === 'healthy\n';
};

const waitForContainer = async (containerName) => {
  let isHealthy;
  do {
    await promisify(setTimeout)(1000);
    process.stdout.write('.');
    isHealthy = await isContainerHealthy(containerName);
  } while (!isHealthy);
};

const startContainers = async () => {
  await exec('docker-compose up -d');
};

const setupEnvironment = async () => {
  process.stdout.write('\nSetting up containers for tests.\n');
  await startContainers();
  process.stdout.write('Waiting...');
  await waitForContainer('test_rabbitmq');
  process.stdout.write('Done!\n');
};

module.exports = async () => {
  if (!process.env.CI) {
    await setupEnvironment();
  }
};
