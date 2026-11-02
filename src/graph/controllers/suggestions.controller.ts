import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { GraphService } from '../graph.service';
import { getMeuredContext } from '../graph.types';

@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly graphService: GraphService) {}

  @Get('me')
  listSuggestions(@Headers() headers: Record<string, string | undefined>) {
    return this.graphService.listSuggestions(this.context(headers));
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

