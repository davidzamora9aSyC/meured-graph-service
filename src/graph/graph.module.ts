import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { GraphService } from './graph.service';
import { FollowsController } from './controllers/follows.controller';
import { FriendsController } from './controllers/friends.controller';
import { BlocksController } from './controllers/blocks.controller';
import { SuggestionsController } from './controllers/suggestions.controller';
import { InternalController } from './controllers/internal.controller';

@Module({
  imports: [PrismaModule, RabbitmqModule],
  providers: [GraphService],
  controllers: [
    FollowsController,
    FriendsController,
    BlocksController,
    SuggestionsController,
    InternalController,
  ],
})
export class GraphModule {}
