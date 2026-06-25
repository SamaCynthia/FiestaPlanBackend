import {
  Controller,
  Get,
  Delete,
  Patch,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('perfil')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('anfitrion')
  @Get('todos')
  async verTodosLosUsuarios() {
    return this.usersService.obtenerTodosLosUsuarios();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('anfitrion')
  @Get()
  async getPerfil(@Request() req) {
    return this.usersService.findById(req.user.sub);
  }

  // 2. DERECHO DE RECTIFICACIÓN (Actualizar perfil)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('anfitrion')
  @Patch('actualizar')
  async actualizarCuenta(@Request() req, @Body() body: any) {
    return this.usersService.actualizarCuenta(req.user.sub, body);
  }

  // 3. DERECHO DE CANCELACIÓN Y OPOSICIÓN (Anonimizar)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('anfitrion')
  @Delete('cancelar')
  async cancelarCuenta(@Request() req) {
    return this.usersService.anonimizarCuenta(req.user.sub);
  }
}
