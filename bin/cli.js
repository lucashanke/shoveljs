#! /usr/bin/env node
const yargs = require("yargs");
const { hideBin } = require('yargs/helpers')
const amqplib = require('amqplib/callback_api');


yargs(hideBin(process.argv))
  .command(
      'move <originQueue> <destinationQueue>',
      'move messages from origin queue to destination queue', 
      (yargs) => {
    return yargs
    .positional('originQueue', { describe: 'queue to get messages from' })
    .positional('destinationQueue', { describe: 'exchange to which the messages should be published' })
    .option("h", { alias:"host", describe: "RabbitMQ server host", type: "string", default: 'localhost' })     
    .option("P", { alias:"port", describe: "RabbitMQ server port", type: "number", default: 5672 })
    .option("u", { alias:"user", describe: "RabbitMQ server user", type: "string", demandOption: true })   
    .option("p", { alias:"password", describe: "RabbitMQ server user", type: "string", demandOption: true })   
  }, (argv) => {
    const { host, port, user, password, originQueue, destinationQueue } = argv;
    amqplib.connect(`amqps://${user}:${password}@${host}:${port}`, (err, conn) => {
        if (err) throw err;

        conn.createConfirmChannel((err, channel) => {
            if (err) throw err;
            
            channel.checkQueue(destinationQueue);
            channel.checkQueue(originQueue, (err, ok) => {
              console.log(ok);
              const { messageCount } = ok;

              let counter = 0;

              if (messageCount === 0 ){
                console.log('No messages to shovel.');
                process.exit(0);
              }

              channel.consume(originQueue, (msg) => {
                if (msg !== null) {
                    channel.ack(msg);
                    channel.sendToQueue(destinationQueue, msg.content, msg.properties, (err, ok) => {
                      counter++;
                      
                      if (counter === messageCount) {
                        channel.close();
                        console.log(`${counter} messages shoveled from ${originQueue} to ${destinationQueue}`);
                        process.exit(0);
                      }
                    });
                } else {
                  process.exit(0);
                }
              });
            });
        });
    });
  })
  .parse()
  

