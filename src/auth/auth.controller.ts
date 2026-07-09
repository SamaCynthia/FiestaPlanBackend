import { Controller, Post, Body, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuditLog } from '../audit-logs/decorators/audit-log.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registro')
  @AuditLog({ accion: 'registro', modulo: 'autenticacion' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.registrar(registerDto);
  }

  @Post('login')
  @AuditLog({ accion: 'login', modulo: 'autenticacion' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, rol } = await this.authService.login(loginDto);

    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000, // 8h, igual que JWT_EXPIRATION
    });

    // El body ya NO lleva el token, solo el rol (para que la UI reaccione)
    return { rol };
  }

  @Post('logout')
  @AuditLog({ accion: 'logout', modulo: 'autenticacion' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
    return { message: 'Sesión cerrada correctamente' };
  }
}
