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

  @UseGuards(JwtAuthGuard)
  @Get()
  async getPerfil(@Request() req) {
    return this.usersService.findById(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('actualizar')
  async actualizarCuenta(@Request() req, @Body() body: any) {
    return this.usersService.actualizarCuenta(req.user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cancelar')
  async cancelarCuenta(@Request() req) {
    return this.usersService.anonimizarCuenta(req.user.sub);
  }
}
