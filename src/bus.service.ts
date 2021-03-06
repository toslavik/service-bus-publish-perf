import { delay, isServiceBusError, ProcessErrorArgs, ServiceBusClient, ServiceBusReceivedMessage, ServiceBusSender, ServiceBusSessionReceiverOptions, SubscribeOptions } from "@azure/service-bus";
import { Injectable } from '@nestjs/common';
// Load the .env file if it exists
import * as dotenv from "dotenv";
import * as moment from 'moment';
import { Message } from './dto/servicebus';

dotenv.config();

const _start = moment();
let _messages = 0;
@Injectable()
export class ServiceBus {


  async sendMessage(sbClient: ServiceBusClient, msg: Message[], count: number,maxInflight:number, 
                        isBatch: true,queueName:string, batchSize?: number) {
    const writeResultsPromise = this.WriteResults(count);

    await this.RunTestSend(sbClient, msg, maxInflight, count,isBatch, queueName,batchSize);
  
    await writeResultsPromise;

  }
  async RunTestSend(
    sbClient: ServiceBusClient,
    msgBody: Message[],
    maxInflight: number,
    messages: number,
    batchAPI: boolean,
    queueName:string,
    batchSize?: number
  ): Promise<void> {
  
    const sender = sbClient.createSender(queueName);
    const promises: Promise<void>[] = [];
  
    for (let i = 0; i < maxInflight; i++) {
      const promise = this.ExecuteSendsAsync(sender, messages,msgBody, batchAPI, batchSize);
      promises[i] = promise;
    }
  
    await Promise.all(promises);
    await sbClient.close();
  }
  
  async ExecuteSendsAsync(
    sender: ServiceBusSender,
    messages: number,
    msg: any,
    batchAPI: boolean,
    batchSize?: number
  ): Promise<void> {
    while (_messages <= messages) {
      if (batchAPI) {
        // console.log("batchSize:" + batchSize)
        const currentBatch = await sender.createMessageBatch({maxSizeInBytes: batchSize});
        while (
          currentBatch.tryAddMessage({body: msg}) &&
          _messages + currentBatch.count <= messages         
        );
        await sender.sendMessages(currentBatch);
        _messages = _messages + currentBatch.count;
      } else {
        await sender.sendMessages({body: msg});
        _messages++;
      }
    }
  }

  async receiveMessages(maxConcurrentCalls: number,receiverCount: number, receivedMessages: number,queueName:string) {
  

    const receivers = receiverCount;
    console.log("count of messages to be received: " + receivedMessages);
    console.log("count of receivers: " + receiverCount);
    console.log("count of concurrent calls: " + maxConcurrentCalls);

    const writeResultsPromise = this.WriteResults(receivedMessages);
    const promises: Promise<void>[] = [];
    for (let x=0; x < receivers; x++){
      const promise = this.RunTest(maxConcurrentCalls, receivedMessages,queueName);
      promises[x] = promise;
    }
    await Promise.all(promises);
    await writeResultsPromise;
  }


  async RunTest(
    maxConcurrentCalls: number,
    messages: number,
    queueName:string
  ): Promise<void> {
    const connectionString = process.env.SB_CONN_STR || "<connection string>";
    const sbClientLocal = new ServiceBusClient(connectionString);

    const options:ServiceBusSessionReceiverOptions = {receiveMode:"receiveAndDelete"};
    const receiver = await sbClientLocal.createReceiver(queueName,options);
    const subscribeOptions:SubscribeOptions = {maxConcurrentCalls:maxConcurrentCalls,autoCompleteMessages:false};

     const subscription = receiver.subscribe({
          
          processMessage: async (brokeredMessage: ServiceBusReceivedMessage) => {
            _messages++;
            if (_messages === messages){
              await receiver.close();
              await sbClientLocal.close();
            }
            
          },
          processError: async (args: ProcessErrorArgs) => {
            console.log(`Error from source ${args.errorSource} occurred: `, args.error);
            if (isServiceBusError(args.error)) {
              switch (args.error.code) {
                case "MessagingEntityDisabled":
                case "MessagingEntityNotFound":
                case "UnauthorizedAccess":
                  console.log(
                    `An unrecoverable error occurred. Stopping processing. ${args.error.code}`,
                    args.error
                  );
                  await subscription.close();
                  break;
                case "MessageLockLost":
                  console.log(`Message lock lost for message`, args.error);
                  break;
                case "ServiceBusy":
                  // choosing an arbitrary amount of time to wait.
                  await delay(1000);
                  break;
              }
            }
          }
        },subscribeOptions);
  }
  
  async WriteResults(messages: number): Promise<void> {
    let lastMessages = 0;
    let lastElapsed = 0;
    let maxMessages = 0;
    let maxElapsed = Number.MAX_SAFE_INTEGER;
  
    do {
      await delay(1000);
  
      const receivedMessages = _messages;
      const currentMessages = receivedMessages - lastMessages;
      lastMessages = receivedMessages;
  
      const elapsed = moment().diff(_start);
      const currentElapsed = elapsed - lastElapsed;
      lastElapsed = elapsed;
  
      if (currentMessages / currentElapsed > maxMessages / maxElapsed) {
        maxMessages = currentMessages;
        maxElapsed = currentElapsed;
      }
  
      this.WriteResult(
        receivedMessages,
        elapsed,
        currentMessages,
        currentElapsed,
        maxMessages,
        maxElapsed
      );
    } while (_messages < messages);
  }
  
  WriteResult(
    totalMessages: number,
    totalElapsed: number,
    currentMessages: number,
    currentElapsed: number,
    maxMessages: number,
    maxElapsed: number
  ): void {
    this.Log(
      `\tTot Msg\t${totalMessages}` +
        `\tCur MPS\t${Math.round((currentMessages * 1000) / currentElapsed)}` +
        `\tAvg MPS\t${Math.round((totalMessages * 1000) / totalElapsed)}` +
        `\tMax MPS\t${Math.round((maxMessages * 1000) / maxElapsed)}`
    );
  }
  
  Log(message: string): void {
    console.log(`[${moment().format("hh:mm:ss.SSS")}] ${message}`);
  }
  

}

