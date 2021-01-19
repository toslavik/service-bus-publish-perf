import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServiceBus } from './bus.service';
import { ServiceBusSession } from './bus.service.session';

@Module({
  imports: [],
  

controllers: [AppController],
  providers: [AppService,ServiceBus,ServiceBusSession],
})
export class AppModule {}
