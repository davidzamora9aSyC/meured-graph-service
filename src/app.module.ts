import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { GraphModule } from './graph/graph.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, GraphModule],
  controllers: [HealthController],
})
export class AppModule {}

