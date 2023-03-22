const amqplib = require('amqplib');
const { faker } = require('@faker-js/faker');

const user = 'root';
const password = 'root_password';
const host = 'localhost';
const port = 5672;

const origin = 'origin.queue';
const destination = 'destination.queue';
const limit = 35;
const delay = 1;

let connection;
let channel;

const generateMessages = (length) => {
  const messages = [];
  Array.from({ length }).forEach(() => {
    const message = faker.datatype.uuid();
    messages.push(message);
    channel.sendToQueue(origin, Buffer.from(message), {
      correlationId: message,
    });
  });
  return messages;
};

const assertMessagesInQueue = async (expectedMessages, queue) => {
  await new Promise((resolve) => {
    channel.consume(queue, (msg) => {
      const { properties, content } = msg;

      const index = expectedMessages.indexOf(content.toString());
      if (index !== -1) {
        expect(expectedMessages[index]).toEqual(content.toString());
        expect(expectedMessages[index]).toEqual(properties.correlationId);
        expectedMessages.splice(index, 1);
      }

      if (expectedMessages.length === 0) resolve();
    }, { noAck: true });
  });
};

const runCommand = async (...args) => {
  process.argv = ['node', 'cli.js', ...args];
  // eslint-disable-next-line global-require
  require('../cli');

  // eslint-disable-next-line no-promise-executor-return
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

describe('cli', () => {
  let originalArgv;

  beforeEach(async () => {
    connection = await amqplib.connect(
      `amqp://${user}:${password}@${host}:${port}`,
    );
    channel = await connection.createConfirmChannel();
    await channel.assertQueue(destination);
    await channel.assertQueue(origin);
  });

  beforeEach(() => {
    jest.resetModules();
    originalArgv = process.argv;
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.argv = originalArgv;
  });

  describe('move', () => {
    it('only logs message when origin queue is empty', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await runCommand('move', origin, destination, '-u', user, '-p', password, '--ssl', 'false');

      expect(consoleSpy).toBeCalledWith('No messages to shovel.');
    });

    it('moves messages with their properties from origin queue to destination queue', async () => {
      const messages = generateMessages(100);

      const consoleSpy = jest.spyOn(console, 'log');

      await runCommand('move', origin, destination, '-u', user, '-p', password, '--ssl', 'false');

      await assertMessagesInQueue(messages, destination);
      expect(consoleSpy).toBeCalledWith(
        '100 messages shoveled from origin.queue to destination.queue',
      );

      expect(consoleSpy).not.toBeCalledWith('waiting for break...');
    });

    it('moves messages with their properties from origin queue to destination queue with delay between messages', async () => {
      const messages = generateMessages(2);

      const consoleSpy = jest.spyOn(console, 'log');

      await runCommand('move', origin, destination, '-u', user, '-p', password, '-d', delay, '--ssl', 'false');

      await assertMessagesInQueue(messages, destination);
      expect(consoleSpy).toBeCalledWith(
        '2 messages shoveled from origin.queue to destination.queue',
      );
      expect(consoleSpy).toHaveBeenNthCalledWith(2, 'waiting for break...');
    });

    it('moves messages with their properties from origin queue to destination queue with message limit', async () => {
      const messages = generateMessages(100);

      const consoleSpy = jest.spyOn(console, 'log');

      await runCommand('move', origin, destination, '-u', user, '-p', password, '-l', limit, '--ssl', 'false');

      await assertMessagesInQueue(messages.slice(0, limit), destination);
      expect(consoleSpy).toBeCalledWith(
        '35 messages shoveled from origin.queue to destination.queue',
      );
      expect(consoleSpy).not.toBeCalledWith('waiting for break...');
    });
  });

  afterEach(async () => {
    await connection.close();
  });
});
