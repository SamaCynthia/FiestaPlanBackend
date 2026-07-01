import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import {
  ArcoStrategy,
  RectificacionStrategy,
  CancelacionStrategy,
} from './interfaces/strategy.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
  ) {}

  async findByEmail(correo: string): Promise<Usuario | null> {
    return await this.usuarioRepository.findOne({ where: { correo } });
  }

  async findById(id: number): Promise<Usuario> {
    const user = await this.usuarioRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByUuid(uuid: string): Promise<Usuario> {
    const user = await this.usuarioRepository.findOne({ where: { uuid } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(userData: Partial<Usuario>): Promise<Usuario> {
  const newUser = this.usuarioRepository.create(userData);
  const saved = await this.usuarioRepository.save(newUser);

  return await this.usuarioRepository.findOneOrFail({ where: { id: saved.id } });
}

  async actualizarCuenta(uuid: string, datosNuevos: any) {
    const estrategia = new RectificacionStrategy();
    return this.procesarArco(estrategia, uuid, datosNuevos);
  }

  async anonimizarCuenta(uuid: string) {
    const estrategia = new CancelacionStrategy();
    return this.procesarArco(estrategia, uuid);
  }

  private async procesarArco(strategy: ArcoStrategy, uuid: string, datos?: any) {
    const usuario = await this.findByUuid(uuid);
    return await strategy.ejecutar(usuario, this.usuarioRepository, datos);
  }

  async obtenerUsuariosSegunRol(rolSolicitante: string): Promise<any[]> {
    const usuarios = await this.usuarioRepository.find();

    if (rolSolicitante === 'admin') {
      return usuarios.map((u) => {
        const { password_hash, id, ...resto } = u;
        return resto;
      });
    }

    if (rolSolicitante === 'moderador') {
      return usuarios.map((u) => ({
        uuid: u.uuid,
        nombres: u.nombres,
        apellidos: u.apellidos,
        correo: u.correo,
        activo: u.activo,
        rol: u.rol?.nombre,
      }));
    }

    return [];
  }

  async obtenerDetalleUsuario(uuid: string): Promise<any> {
    const usuario = await this.findByUuid(uuid);
    const { password_hash, id, ...resto } = usuario;
    return resto;
  }
}