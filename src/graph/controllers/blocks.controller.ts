import { Controller, Delete, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { GraphService } from '../graph.service';
import { getMeuredContext } from '../graph.types';

@Controller('blocks')
export class BlocksController {
  constructor(private readonly graphService: GraphService) {}

  @Get('me')
  listBlocks(@Headers() headers: Record<string, string | undefined>) {
    return this.graphService.listBlocks(this.context(headers));
  }

  @Post(':blockedAuthUserId')
  block(
    @Headers() headers: Record<string, string | undefined>,
    @Param('blockedAuthUserId') blockedAuthUserId: string,
  ) {
    return this.graphService.block(this.context(headers), blockedAuthUserId);
  }

  @Delete(':blockedAuthUserId')
  unblock(
    @Headers() headers: Record<string, string | undefined>,
    @Param('blockedAuthUserId') blockedAuthUserId: string,
  ) {
    return this.graphService.unblock(this.context(headers), blockedAuthUserId);
  }

  private context(headers: Record<string, string | undefined>) {
    try {
      const context = getMeuredContext(headers);
      if (context.activeProduct !== 'MEURED') {
        throw new Error('Acceso MeuRed requerido');
      }
      return context;
    } catch {
      throw new UnauthorizedException('Contexto MeuRed requerido');
    }
  }
}

