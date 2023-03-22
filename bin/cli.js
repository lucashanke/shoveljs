#! /usr/bin/env node
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');
const amqplib = require('amqplib');

const setDelay = (time) => {
  console.log('waiting for break...');
  return new Promise((resolve) => setTimeout(resolve, time));
}

// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  .command(
    'move <originQueue> <destinationQueue>',
    'move messages from origin queue to destination queue',
    // eslint-disable-next-line no-shadow
    (yargs) => yargs
      .positional('originQueue', { describe: 'queue to get messages from' })
      .positional('destinationQueue', { describe: 'exchange the messages should be published to' })
      .option('ssl', { describe: 'RabbitMQ connection over ssl', type: 'boolean', default: true })
      .option('h', { alias: 'host', describe: 'RabbitMQ host', type: 'string', default: 'localhost' })
      .option('P', { alias: 'port', describe: 'RabbitMQ port', type: 'number', default: 5672 })
      .option('u', { alias: 'user', describe: 'RabbitMQ user', type: 'string', demandOption: true })
      .option('p', { alias: 'password', describe: 'RabbitMQ user', type: 'string', demandOption: true })
      .option('d', { alias: 'delay', describe: 'Delay interval between messages (milliseconds)', type: 'number' })
      .option('l', { alias: 'limit', describe: 'Limit of messages to be processed', type: 'number' }),

    async (argv) => {
      const { host, port, user, password, ssl, originQueue, destinationQueue, delay, limit } = argv;
      const conn = await amqplib.connect(
        `amqp${ssl ? 's' : ''}://${user}:${password}@${host}:${port}`,
      );
      const channel = await conn.createConfirmChannel();

      await channel.checkQueue(destinationQueue);
      const originStatus = await channel.checkQueue(originQueue);

      console.log(originStatus);
      const { messageCount } = originStatus;

      let counter = 0;
      if (messageCount === 0) {
        console.log('No messages to shovel.');
      } else {
        await new Promise(async (resolve) => {
          const perform = async () => {
            if (counter === limit) {
              resolve();
              return;
            }

            const msg = await channel.get(originQueue);

            if (msg !== null) {
              channel.ack(msg);
              channel.sendToQueue(destinationQueue, msg.content, msg.properties,
                async (err, ok) => {
                  counter += 1;
                  if (counter === messageCount) resolve();
                  delay && await setDelay(delay);
                  perform();
                },
              );
            } else {
              console.error('Consumer channel was closed.');
              resolve();
            }
          }

          perform();
        });
        console.log(
          `${counter} messages shoveled from ${originQueue} to ${destinationQueue}`,
        );
      }
      await conn.close();
    },
  )
  .help().argv;
