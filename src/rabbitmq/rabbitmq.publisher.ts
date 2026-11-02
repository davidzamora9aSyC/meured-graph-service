import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, Connection, connect } from 'amqplib';

@Injectable()
export class RabbitPublisher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitPublisher.name);
  private readonly reconnectDelayMs = 5000;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connecting = false;
  private shuttingDown = false;
  private rabbitmqUrl: string | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('RABBITMQ_URL');
    if (!url) {
      this.logger.warn('RABBITMQ_URL no configurado, publisher deshabilitado');
      return;
    }

    this.rabbitmqUrl = url;
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    this.clearReconnectTimer();
    await this.closeRabbitmqResources();
  }

  async publish(routingKey: string, payload: unknown) {
    if (!(await this.ensureChannel())) {
      this.logger.warn(
        `No se pudo publicar ${routingKey}: canal RabbitMQ no disponible`,
      );
      return;
    }
    const body = Buffer.from(JSON.stringify(payload));
    try {
      this.channel!.publish(this.getExchange(), routingKey, body, {
        contentType: 'application/json',
        persistent: true,
      });
    } catch {
      this.logger.warn(
        `No se pudo publicar ${routingKey}; se reintentará conexión RabbitMQ`,
      );
      this.resetRabbitmqResources();
      this.scheduleReconnect();
    }
  }

  private async ensureChannel(): Promise<boolean> {
    if (this.channel) {
      return true;
    }
    await this.connectWithRetry();
    return Boolean(this.channel);
  }

  private async connectWithRetry() {
    if (!this.rabbitmqUrl || this.connecting || this.shuttingDown) {
      return;
    }
    this.connecting = true;
    this.clearReconnectTimer();
    try {
      const connection = await connect(this.rabbitmqUrl);
      const channel = await connection.createChannel();
      await channel.assertExchange(this.getExchange(), 'topic', { durable: true });

      this.connection = connection;
      this.channel = channel;
      this.registerConnectionHandlers(connection, channel);
      this.logger.log(`Rabbit publisher listo (exchange=${this.getExchange()})`);
    } catch (error) {
      this.logger.error('No se pudo conectar a RabbitMQ', error as Error);
      this.resetRabbitmqResources();
      this.scheduleReconnect();
    } finally {
      this.connecting = false;
    }
  }

  private registerConnectionHandlers(connection: Connection, channel: Channel) {
    connection.on('error', (error) => {
      this.logger.warn(`Conexión RabbitMQ con error: ${error.message}`);
    });
    connection.on('close', () => {
      if (!this.shuttingDown) {
        this.logger.warn('Conexión RabbitMQ cerrada; reintentando conexión');
        this.resetRabbitmqResources();
        this.scheduleReconnect();
      }
    });
    channel.on('error', (error) => {
      this.logger.warn(`Canal RabbitMQ con error: ${error.message}`);
    });
    channel.on('close', () => {
      if (!this.shuttingDown) {
        this.logger.warn('Canal RabbitMQ cerrado; reintentando conexión');
        this.channel = null;
        this.scheduleReconnect();
      }
    });
  }

  private scheduleReconnect() {
    if (this.shuttingDown || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectWithRetry();
    }, this.reconnectDelayMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resetRabbitmqResources() {
    this.channel = null;
    this.connection = null;
  }

  private async closeRabbitmqResources() {
    const channel = this.channel;
    const connection = this.connection;
    this.resetRabbitmqResources();
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  }

  private getExchange() {
    return this.config.get<string>('RABBITMQ_EXCHANGE_MEURED') ?? 'meured.events';
  }
}
