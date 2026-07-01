import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async registrar(registerDto: RegisterDto) {
    const existente = await this.usersService.findByEmail(registerDto.correo);
    if (existente) {
      throw new UnauthorizedException('Ya existe una cuenta con ese correo');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    const newUser = await this.usersService.create({
      nombres: registerDto.nombres,
      apellidos: registerDto.apellidos,
      correo: registerDto.correo,
      fecha_nacimiento: registerDto.fecha_nacimiento,
      password_hash: passwordHash,
    });

    return {
      message: 'Usuario registrado con éxito',
      rol: newUser.rol.nombre,
    };
  }

  async login(loginDto: LoginDto) {
    const usuarioBD = await this.usersService.findByEmail(loginDto.correo);
    if (!usuarioBD || !usuarioBD.activo) {
      throw new UnauthorizedException('Credenciales inválidas o cuenta inactiva');
    }

    const isMatch = await bcrypt.compare(loginDto.password, usuarioBD.password_hash);
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    const rolAsignado = usuarioBD.rol.nombre;

    // El "sub" del token ahora es el UUID, no el id secuencial
    const payload = {
      id: usuarioBD.id,
      correo: usuarioBD.correo,
      sub: usuarioBD.uuid,
      rol: rolAsignado,
    };

    return {
      access_token: this.jwtService.sign(payload),
      rol: rolAsignado,
    };
  }
}