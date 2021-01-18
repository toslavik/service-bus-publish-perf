import { Injectable } from '@nestjs/common';
import { delay, isServiceBusError, ProcessErrorArgs, ServiceBusClient, ServiceBusMessage, ServiceBusReceivedMessage, ServiceBusSender, ServiceBusSessionReceiverOptions, SubscribeOptions } from "@azure/service-bus";
import { DefaultAzureCredential } from "@azure/identity";

import { v4 as uuidv4 } from 'uuid';
// Load the .env file if it exists
import * as dotenv from "dotenv";
import { Message } from './dto/servicebus';
import * as moment from 'moment';
dotenv.config();


const queueName = "test";
const maxInflight = 100;
let messageBody;

const _start = moment();
let _messages = 0;
let _countMsg = 0;
@Injectable()
export class ServiceBus {


  async sendMessage(sbClient: ServiceBusClient, msg: Message[], count: Number, sessionId: string) {
    // createSender() also works with topics
    const sender = sbClient.createSender(queueName);
    messageBody = msg;
    let msgc = 0;

    const promises: Promise<void>[] = [];

    for (let i = 0; i < maxInflight; i++) {
      const promise = this.executeSendsAsync(sender, msgc,"session-1");
      promises[i] = promise;
    }
  
    await Promise.all(promises);
    await sender.close();
    console.log("sender closed");

  }

  async executeSendsAsync(sender: ServiceBusSender, msgc: number, sessionId: string): Promise<void> {
    while (++msgc <= msgc) {
      const message = {
        body: messageBody,
        label: "Message",
        sessionId: sessionId
      };

      console.log(`Sending message: "${msgc}" to "${sessionId}"`);
      await sender.sendMessages(message);
    }
  
    // Undo last increment, since a message was never sent on the final loop iteration
    msgc--;
  }

  async receiveMsg(sbClient: ServiceBusClient, sessionId: string) {

    // - If receiving from a subscription you can use the createReceiver(topicName, subscriptionName) overload
    // instead.
    // - See session.ts for how to receive using sessions.
    // const receiver = sbClient.createReceiver(queueName);
    const options:ServiceBusSessionReceiverOptions = {receiveMode:"receiveAndDelete"};
    const receiver = await sbClient.acceptSession(queueName, sessionId, options);
    const subscribeOptions:SubscribeOptions = {maxConcurrentCalls:100,autoCompleteMessages:false};
    let msgc = 0;
    try {
      const subscription = receiver.subscribe({
        // After executing this callback you provide, the receiver will remove the message from the queue if you
        // have not already settled the message in your callback.
        // You can disable this by passing `false` to the `autoCompleteMessages` option in the `subscribe()` method.
        // If your callback _does_ throw an error before the message is settled, then it will be abandoned.
        
        processMessage: async (brokeredMessage: ServiceBusReceivedMessage) => {
          msgc++;
          console.log(`${msgc}`);
        },
        
        // This callback will be called for any error that occurs when either in the receiver when receiving the message
        // or when executing your `processMessage` callback or when the receiver automatically completes or abandons the message.
        processError: async (args: ProcessErrorArgs) => {
          console.log(`Error from source ${args.errorSource} occurred: `, args.error);
  
          // the `subscribe() call will not stop trying to receive messages without explicit intervention from you.
          if (isServiceBusError(args.error)) {
            switch (args.error.code) {
              case "MessagingEntityDisabled":
              case "MessagingEntityNotFound":
              case "UnauthorizedAccess":
                // It's possible you have a temporary infrastructure change (for instance, the entity being
                // temporarily disabled). The handler will continue to retry if `close()` is not called on the subscription - it is completely up to you
                // what is considered fatal for your program.
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
  
      // Waiting long enough before closing the receiver to receive messages
      console.log(`Receiving messages for 60 seconds before exiting...`);
      await delay(60000);
  
      console.log(`Closing...`);
      await receiver.close();
    } finally {
      await sbClient.close();
    }
  }

  async receiveMessages() {
  
    const maxConcurrentCalls = 100;
    const allMessages = 100000;
  
    const writeResultsPromise = this.WriteResults(allMessages);
    await this.RunTest("session-1",maxConcurrentCalls, allMessages);
    await writeResultsPromise;
  }
  
  async createReceiver(maxConcurrentCalls:number){
    _countMsg = 0;
    const allMessages = 100000;
    await this.RunTest("session-1",maxConcurrentCalls, allMessages);
  }

  async RunTest(
    sessionId: string,
    maxConcurrentCalls: number,
    messages: number
  ): Promise<void> {
    const connectionString = process.env.SB_CONN_STR || "<connection string>";
    const sbClientLocal = new ServiceBusClient(connectionString);
    const options:ServiceBusSessionReceiverOptions = {receiveMode:"receiveAndDelete"};
    const receiver = await sbClientLocal.acceptSession(queueName, sessionId, options);
    const subscribeOptions:SubscribeOptions = {maxConcurrentCalls:maxConcurrentCalls,autoCompleteMessages:false};

     const subscription = receiver.subscribe({
          // After executing this callback you provide, the receiver will remove the message from the queue if you
          // have not already settled the message in your callback.
          // You can disable this by passing `false` to the `autoCompleteMessages` option in the `subscribe()` method.
          // If your callback _does_ throw an error before the message is settled, then it will be abandoned.
          
          processMessage: async (brokeredMessage: ServiceBusReceivedMessage) => {
            _messages++;
            _countMsg++;
            if (_countMsg == 2000) {
              await receiver.close();
              await sbClientLocal.close();
              await this.createReceiver(maxConcurrentCalls);
            }
            if (_messages === messages){
              await receiver.close();
              await sbClientLocal.close();
            }
            
          },
          
          // This callback will be called for any error that occurs when either in the receiver when receiving the message
          // or when executing your `processMessage` callback or when the receiver automatically completes or abandons the message.
          processError: async (args: ProcessErrorArgs) => {
            console.log(`Error from source ${args.errorSource} occurred: `, args.error);
    
            // the `subscribe() call will not stop trying to receive messages without explicit intervention from you.
            if (isServiceBusError(args.error)) {
              switch (args.error.code) {
                case "MessagingEntityDisabled":
                case "MessagingEntityNotFound":
                case "UnauthorizedAccess":
                  // It's possible you have a temporary infrastructure change (for instance, the entity being
                  // what is considered fatal for your program.
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

