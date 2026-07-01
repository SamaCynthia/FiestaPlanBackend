import {
  Controller,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditLog } from '../audit-logs/decorators/audit-log.decorator';

@Controller('perfil')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderador')
  @Get('todos')
  @AuditLog({ accion: 'consultar_usuarios', modulo: 'usuarios' })
  async verUsuarios(@Request() req) {
    return this.usersService.obtenerUsuariosSegunRol(req.user.rol);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':uuid')
  @AuditLog({ accion: 'consultar_perfil', modulo: 'usuarios', entidadTipo: 'usuario' })
  async verUsuarioPorUuid(@Param('uuid') uuid: string) {
    return this.usersService.obtenerDetalleUsuario(uuid);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @AuditLog({ accion: 'consultar_perfil', modulo: 'usuarios', entidadTipo: 'usuario' })
  async getPerfil(@Request() req) {
    return this.usersService.findByUuid(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('actualizar')
  @AuditLog({ accion: 'editar_perfil', modulo: 'usuarios', entidadTipo: 'usuario' })
  async actualizarCuenta(@Request() req, @Body() body: any) {
    return this.usersService.actualizarCuenta(req.user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('cancelar')
  @AuditLog({ accion: 'eliminar_perfil', modulo: 'usuarios', entidadTipo: 'usuario' })
  async cancelarCuenta(@Request() req) {
    return this.usersService.anonimizarCuenta(req.user.sub);
  }
}