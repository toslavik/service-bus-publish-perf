import { ServiceBusClient } from '@azure/service-bus';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { ServiceBus } from './bus.service';
import { ServiceBusSession } from './bus.service.session';
import { Message } from './dto/servicebus';

const connectionString = process.env.SB_CONN_STR || "<connection string>";
const sbClient = new ServiceBusClient(connectionString);
const sessionId = "session-1";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private serviceBus: ServiceBus, private ServiceBusSession: ServiceBusSession) { }

  @Get()
  getHello(): string {
    console.log("Hello");
    return this.appService.getHello();
  }

  @Get('getmessage/:maxConcCalls/:receiverCount/:receivedMessages/:queueName')
  async getMessage(@Param('maxConcCalls') maxConcCalls: number, @Param('receiverCount') receiverCount: number, 
                    @Param('receivedMessages') receivedMessages: number, @Param('queueName')queueName: string): Promise<string> {

    await this.serviceBus.receiveMessages(maxConcCalls, receiverCount,receivedMessages,queueName);
    return "ok";
  }

  @Get('getmessagesession/:maxConcCalls')
  async getMessageSession(@Param('maxConcCalls') maxConcCalls: number): Promise<string> {

    await this.ServiceBusSession.receiveMessagesSession(maxConcCalls);
    return "ok";
  }

  @Post('message')
  postMessage(@Body() msg: any): string {

    const body: Message[] = msg.body
    // console.log(body);
    if (msg.useSession) {
      this.ServiceBusSession.sendMessageSession(sbClient, body, msg.count, sessionId);
    } else {
      this.serviceBus.sendMessage(sbClient, body, msg.count, msg.maxInflight, msg.isBatch, msg.queueName,msg.batchSize);
    }
    return "ok";
  }

}
