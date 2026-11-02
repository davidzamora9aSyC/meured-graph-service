import {
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { GraphService } from '../graph.service';
import { getMeuredContext } from '../graph.types';

@Controller('friends')
export class FriendsController {
  constructor(private readonly graphService: GraphService) {}

  @Get('me')
  listFriends(@Headers() headers: Record<string, string | undefined>) {
    return this.graphService.listFriends(this.context(headers));
  }

  @Post('requests/:toAuthUserId')
  requestFriend(
    @Headers() headers: Record<string, string | undefined>,
    @Param('toAuthUserId') toAuthUserId: string,
  ) {
    return this.graphService.requestFriend(this.context(headers), toAuthUserId);
  }

  @Post('requests/:requestId/accept')
  acceptFriendRequest(
    @Headers() headers: Record<string, string | undefined>,
    @Param('requestId') requestId: string,
  ) {
    return this.graphService.acceptFriendRequest(this.context(headers), requestId);
  }

  @Post('requests/:requestId/reject')
  rejectFriendRequest(
    @Headers() headers: Record<string, string | undefined>,
    @Param('requestId') requestId: string,
  ) {
    return this.graphService.rejectFriendRequest(this.context(headers), requestId);
  }

  @Delete(':authUserId')
  removeFriend(
    @Headers() headers: Record<string, string | undefined>,
    @Param('authUserId') authUserId: string,
  ) {
    return this.graphService.removeFriend(this.context(headers), authUserId);
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

