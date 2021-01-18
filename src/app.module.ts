import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServiceBus } from './bus.service';

@Module({
  imports: [],
  
controllers: [AppController],
  providers: [AppService,ServiceBus],
})
export class AppModule {}
