import { ServiceBusClient } from '@azure/service-bus';
import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { ServiceBus } from './bus.service';
import { ServiceBusSession} from './bus.service.session';
import { v4 as uuidv4 } from 'uuid';
import { Post } from '@nestjs/common';
import { Body } from '@nestjs/common';
import { Message } from './dto/servicebus';

const connectionString = process.env.SB_CONN_STR || "<connection string>";
const sbClient = new ServiceBusClient(connectionString);
const sessionId = "session-1";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private serviceBus: ServiceBus, private ServiceBusSession: ServiceBusSession) {}

  @Get()
  getHello(): string {
    console.log("Hello");
    return this.appService.getHello();
  }

  @Get('getmessage/:maxConcCalls')
  async getMessage(@Param('maxConcCalls') maxConcCalls:number): Promise<string> {
    
    await this.serviceBus.receiveMessages(maxConcCalls);
    return "ok";
  }

  @Get('getmessagesession/:maxConcCalls')
  async getMessageSession(@Param('maxConcCalls') maxConcCalls:number): Promise<string> {
    
    await this.ServiceBusSession.receiveMessagesSession(maxConcCalls);
    return "ok";
  }

  @Post('message')
  postMessage(@Body() msg: any) : string {
    console.log(msg);

    // let obj = msg.body;
    // let ret = [];
    // // Potential DoS if obj.length is large.
    // for (let i = 0; i < obj.length; i++) {
    //     ret.push(obj[i]);
    // }
    const body:Message[] = msg.body
    console.log(body);
    if(msg.session){
      this.ServiceBusSession.sendMessageSession(sbClient,body,msg.count,sessionId);
    }else {
      this.serviceBus.sendMessage(sbClient,body,msg.count,sessionId);
    }
    return "ok";
  }

}
