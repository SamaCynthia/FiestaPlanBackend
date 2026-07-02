import { Controller, Post, Body } from '@nestjs/common';
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
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
