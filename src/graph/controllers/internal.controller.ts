import { Controller, Get, Headers, Param, UnauthorizedException } from '@nestjs/common';
import { GraphService } from '../graph.service';

@Controller('internal')
export class InternalController {
  constructor(private readonly graphService: GraphService) {}

  @Get('audience/:authUserId')
  audience(
    @Headers() headers: Record<string, string | undefined>,
    @Param('authUserId') authUserId: string,
  ) {
    const apiKey = headers['x-internal-api-key'];
    if (!apiKey || apiKey !== (process.env.INTERNAL_API_KEY ?? '')) {
      throw new UnauthorizedException('Internal API key required');
    }
    return this.graphService.getAudienceForActor(authUserId);
  }
}

