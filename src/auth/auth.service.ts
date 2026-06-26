import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private dataSource: DataSource, // Inyectamos la conexión directa para buscar el rol
  ) {}

  // Issue 3: Registro Seguro (Hashing)
  async registrar(userDto: any) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userDto.password, saltRounds);

    // Mapeamos los campos que envían en el Postman a las columnas de tu tabla
    const newUser = await this.usersService.create({
      nombres: userDto.nombres,
      apellidos: userDto.apellidos,
      correo: userDto.correo,
      fecha_nacimiento: userDto.fecha_nacimiento,
      password_hash: passwordHash,
    });

    return { message: 'Usuario registrado con éxito' };
  }

  // Issue 4: Login y JWT (RBAC consultando evento_participantes)
  async login(user: any) {
    const usuarioBD = await this.usersService.findByEmail(user.correo);

    if (!usuarioBD || !usuarioBD.activo) {
      throw new UnauthorizedException(
        'Credenciales inválidas o cuenta inactiva',
      );
    }

    const isMatch = await bcrypt.compare(
      user.password,
      usuarioBD.password_hash,
    );
    if (!isMatch) throw new UnauthorizedException('Credenciales inválidas');

    // Buscamos si el usuario tiene el rol 'anfitrion' en algún evento
    const participante = await this.dataSource.query(
      `SELECT rol FROM evento_participantes WHERE usuario_id = $1 AND rol = 'anfitrion' LIMIT 1`,
      [usuarioBD.id],
    );

    // Si tiene un evento como anfitrión se le da ese rol, de lo contrario es invitado
    const rolAsignado = participante.length > 0 ? 'anfitrion' : 'invitado';

    const payload = {
      email: usuarioBD.correo,
      sub: usuarioBD.id,
      rol: rolAsignado,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
