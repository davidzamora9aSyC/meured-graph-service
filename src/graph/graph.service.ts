import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeuredContext } from './graph.types';
import { RabbitPublisher } from '../rabbitmq/rabbitmq.publisher';

@Injectable()
export class GraphService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: RabbitPublisher,
  ) {}

  async follow(context: MeuredContext, targetAuthUserId: string) {
    if (!targetAuthUserId || targetAuthUserId === context.authUserId) {
      throw new BadRequestException('targetAuthUserId invalido');
    }
    const follow = await this.prisma.meuredFollow.upsert({
      where: {
        followerAuthUserId_followeeAuthUserId: {
          followerAuthUserId: context.authUserId,
          followeeAuthUserId: targetAuthUserId,
        },
      },
      create: {
        followerAuthUserId: context.authUserId,
        followeeAuthUserId: targetAuthUserId,
      },
      update: {},
    });

    await this.publisher.publish('meured.graph.follow.created', {
      actorAuthUserId: context.authUserId,
      objectType: 'follow',
      objectId: follow.id,
      payload: { followerAuthUserId: follow.followerAuthUserId, followeeAuthUserId: follow.followeeAuthUserId },
      occurredAt: follow.createdAt.toISOString(),
    });
    return { ok: true, follow };
  }

  async unfollow(context: MeuredContext, targetAuthUserId: string) {
    const existing = await this.prisma.meuredFollow.findUnique({
      where: {
        followerAuthUserId_followeeAuthUserId: {
          followerAuthUserId: context.authUserId,
          followeeAuthUserId: targetAuthUserId,
        },
      },
      select: { id: true },
    });
    await this.prisma.meuredFollow.deleteMany({
      where: { followerAuthUserId: context.authUserId, followeeAuthUserId: targetAuthUserId },
    });

    await this.publisher.publish('meured.graph.follow.deleted', {
      actorAuthUserId: context.authUserId,
      objectType: 'follow',
      objectId: existing?.id ?? `${context.authUserId}:${targetAuthUserId}`,
      payload: { followerAuthUserId: context.authUserId, followeeAuthUserId: targetAuthUserId },
      occurredAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  listFollowing(context: MeuredContext) {
    return this.prisma.meuredFollow.findMany({
      where: { followerAuthUserId: context.authUserId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listFollowers(context: MeuredContext) {
    return this.prisma.meuredFollow.findMany({
      where: { followeeAuthUserId: context.authUserId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async requestFriend(context: MeuredContext, toAuthUserId: string) {
    if (!toAuthUserId || toAuthUserId === context.authUserId) {
      throw new BadRequestException('toAuthUserId invalido');
    }

    const existingFriendship = await this.prisma.meuredFriendship.findFirst({
      where: {
        OR: [
          { userAAuthUserId: context.authUserId, userBAuthUserId: toAuthUserId },
          { userAAuthUserId: toAuthUserId, userBAuthUserId: context.authUserId },
        ],
      },
    });
    if (existingFriendship) {
      return { ok: true, friendship: existingFriendship };
    }

    const request = await this.prisma.meuredFriendRequest.create({
      data: { fromAuthUserId: context.authUserId, toAuthUserId },
    });

    await this.publisher.publish('meured.graph.friend.requested', {
      actorAuthUserId: context.authUserId,
      objectType: 'friendRequest',
      objectId: request.id,
      payload: { fromAuthUserId: request.fromAuthUserId, toAuthUserId: request.toAuthUserId },
      occurredAt: request.createdAt.toISOString(),
    });
    return { ok: true, request };
  }

  async acceptFriendRequest(context: MeuredContext, requestId: string) {
    const request = await this.prisma.meuredFriendRequest.findUnique({ where: { id: requestId } });
    if (!request || request.toAuthUserId !== context.authUserId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solicitud ya resuelta');
    }

    const [userA, userB] = orderPair(request.fromAuthUserId, request.toAuthUserId);
    const friendship = await this.prisma.meuredFriendship.upsert({
      where: { userAAuthUserId_userBAuthUserId: { userAAuthUserId: userA, userBAuthUserId: userB } },
      create: { userAAuthUserId: userA, userBAuthUserId: userB },
      update: {},
    });
    await this.prisma.meuredFriendRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
    });

    await this.publisher.publish('meured.graph.friend.accepted', {
      actorAuthUserId: context.authUserId,
      objectType: 'friendship',
      objectId: friendship.id,
      payload: { userAAuthUserId: friendship.userAAuthUserId, userBAuthUserId: friendship.userBAuthUserId },
      occurredAt: friendship.createdAt.toISOString(),
    });
    return { ok: true, friendship };
  }

  async rejectFriendRequest(context: MeuredContext, requestId: string) {
    const request = await this.prisma.meuredFriendRequest.findUnique({ where: { id: requestId } });
    if (!request || request.toAuthUserId !== context.authUserId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Solicitud ya resuelta');
    }
    await this.prisma.meuredFriendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    await this.publisher.publish('meured.graph.friend.rejected', {
      actorAuthUserId: context.authUserId,
      objectType: 'friendRequest',
      objectId: requestId,
      payload: { toAuthUserId: context.authUserId },
      occurredAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  listFriends(context: MeuredContext) {
    return this.prisma.meuredFriendship.findMany({
      where: {
        OR: [{ userAAuthUserId: context.authUserId }, { userBAuthUserId: context.authUserId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async removeFriend(context: MeuredContext, authUserId: string) {
    const [userA, userB] = orderPair(context.authUserId, authUserId);
    const existing = await this.prisma.meuredFriendship.findUnique({
      where: { userAAuthUserId_userBAuthUserId: { userAAuthUserId: userA, userBAuthUserId: userB } },
      select: { id: true },
    });
    await this.prisma.meuredFriendship.deleteMany({
      where: { userAAuthUserId: userA, userBAuthUserId: userB },
    });

    await this.publisher.publish('meured.graph.friend.removed', {
      actorAuthUserId: context.authUserId,
      objectType: 'friendship',
      objectId: existing?.id ?? `${userA}:${userB}`,
      payload: { userAAuthUserId: userA, userBAuthUserId: userB },
      occurredAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  async block(context: MeuredContext, blockedAuthUserId: string) {
    if (!blockedAuthUserId || blockedAuthUserId === context.authUserId) {
      throw new BadRequestException('blockedAuthUserId invalido');
    }
    const block = await this.prisma.meuredBlock.upsert({
      where: {
        blockerAuthUserId_blockedAuthUserId: {
          blockerAuthUserId: context.authUserId,
          blockedAuthUserId,
        },
      },
      create: { blockerAuthUserId: context.authUserId, blockedAuthUserId },
      update: {},
    });

    await this.publisher.publish('meured.graph.block.created', {
      actorAuthUserId: context.authUserId,
      objectType: 'block',
      objectId: block.id,
      payload: { blockerAuthUserId: block.blockerAuthUserId, blockedAuthUserId: block.blockedAuthUserId },
      occurredAt: block.createdAt.toISOString(),
    });
    return { ok: true, block };
  }

  async unblock(context: MeuredContext, blockedAuthUserId: string) {
    const existing = await this.prisma.meuredBlock.findUnique({
      where: {
        blockerAuthUserId_blockedAuthUserId: {
          blockerAuthUserId: context.authUserId,
          blockedAuthUserId,
        },
      },
      select: { id: true },
    });
    await this.prisma.meuredBlock.deleteMany({
      where: { blockerAuthUserId: context.authUserId, blockedAuthUserId },
    });

    await this.publisher.publish('meured.graph.block.deleted', {
      actorAuthUserId: context.authUserId,
      objectType: 'block',
      objectId: existing?.id ?? `${context.authUserId}:${blockedAuthUserId}`,
      payload: { blockerAuthUserId: context.authUserId, blockedAuthUserId },
      occurredAt: new Date().toISOString(),
    });
    return { ok: true };
  }

  listBlocks(context: MeuredContext) {
    return this.prisma.meuredBlock.findMany({
      where: { blockerAuthUserId: context.authUserId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listSuggestions(context: MeuredContext) {
    return this.prisma.meuredGraphSuggestion.findMany({
      where: { authUserId: context.authUserId },
      orderBy: [{ score: 'desc' }, { computedAt: 'desc' }],
      take: 50,
    });
  }

  async getAudienceForActor(actorAuthUserId: string) {
    if (!actorAuthUserId) return { recipients: [] as string[] };

    const [followers, friendships, blocks] = await Promise.all([
      this.prisma.meuredFollow.findMany({
        where: { followeeAuthUserId: actorAuthUserId },
        select: { followerAuthUserId: true },
        take: 5000,
      }),
      this.prisma.meuredFriendship.findMany({
        where: {
          OR: [
            { userAAuthUserId: actorAuthUserId },
            { userBAuthUserId: actorAuthUserId },
          ],
        },
        select: { userAAuthUserId: true, userBAuthUserId: true },
        take: 5000,
      }),
      this.prisma.meuredBlock.findMany({
        where: {
          OR: [
            { blockerAuthUserId: actorAuthUserId },
            { blockedAuthUserId: actorAuthUserId },
          ],
        },
        select: { blockerAuthUserId: true, blockedAuthUserId: true },
        take: 5000,
      }),
    ]);

    const blockedPairs = new Set<string>();
    for (const block of blocks) {
      blockedPairs.add(`${block.blockerAuthUserId}:${block.blockedAuthUserId}`);
    }

    const recipients = new Set<string>();
    for (const row of followers) {
      recipients.add(row.followerAuthUserId);
    }
    for (const fr of friendships) {
      const other =
        fr.userAAuthUserId === actorAuthUserId ? fr.userBAuthUserId : fr.userAAuthUserId;
      recipients.add(other);
    }

    recipients.delete(actorAuthUserId);

    const filtered = Array.from(recipients).filter((recipientId) => {
      if (blockedPairs.has(`${actorAuthUserId}:${recipientId}`)) return false;
      if (blockedPairs.has(`${recipientId}:${actorAuthUserId}`)) return false;
      return true;
    });

    return { recipients: filtered };
  }
}

function orderPair(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}
