import { Module } from '@nestjs/common';
import { RabbitPublisher } from './rabbitmq.publisher';

@Module({
  providers: [RabbitPublisher],
  exports: [RabbitPublisher],
})
export class RabbitmqModule {}

