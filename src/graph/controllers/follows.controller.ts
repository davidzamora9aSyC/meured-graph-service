import { Controller, Delete, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { GraphService } from '../graph.service';
import { getMeuredContext } from '../graph.types';

@Controller('follows')
export class FollowsController {
  constructor(private readonly graphService: GraphService) {}

  @Get('me/following')
  listFollowing(@Headers() headers: Record<string, string | undefined>) {
    return this.graphService.listFollowing(this.context(headers));
  }

  @Get('me/followers')
  listFollowers(@Headers() headers: Record<string, string | undefined>) {
    return this.graphService.listFollowers(this.context(headers));
  }

  @Post(':targetAuthUserId')
  follow(
    @Headers() headers: Record<string, string | undefined>,
    @Param('targetAuthUserId') targetAuthUserId: string,
  ) {
    return this.graphService.follow(this.context(headers), targetAuthUserId);
  }

  @Delete(':targetAuthUserId')
  unfollow(
    @Headers() headers: Record<string, string | undefined>,
    @Param('targetAuthUserId') targetAuthUserId: string,
  ) {
    return this.graphService.unfollow(this.context(headers), targetAuthUserId);
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

