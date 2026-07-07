import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiAdapterService } from './api-adapter.service';
import { CrearConsentimientoDto } from './dto/consentimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api-adapter')
@UseGuards(JwtAuthGuard)
export class ApiAdapterController {
  constructor(private readonly apiAdapterService: ApiAdapterService) {}

  @Post('consentimientos')
  async otorgarConsentimiento(
    @Request() req,
    @Body() dto: CrearConsentimientoDto,
  ) {
    return await this.apiAdapterService.otorgarConsentimiento(req.user.id, dto);
  }

  @Get('consentimientos')
  async obtenerConsentimientos(@Request() req) {
    return await this.apiAdapterService.obtenerConsentimientos(req.user.id);
  }

  @Post('transferir')
  async realizarTransferencia(
    @Request() req,
    @Body()
    body: {
      servicio: string;
      url: string;
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      data?: any;
      headers?: Record<string, string>;
      excepcionLey?: boolean;
      excepcionDocumentada?: string;
    },
  ) {
    return await this.apiAdapterService.transferirDatos({
      usuarioId: req.user.id,
      servicio: body.servicio,
      url: body.url,
      method: body.method || 'POST',
      data: body.data,
      headers: body.headers,
      excepcionLey: body.excepcionLey,
      excepcionDocumentada: body.excepcionDocumentada,
    });
  }
}
