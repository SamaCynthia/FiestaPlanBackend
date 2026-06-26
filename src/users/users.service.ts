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

  async findByEmail(correo: string) {
    return await this.usuarioRepository.findOne({ where: { correo } });
  }
  // // Obligamos a TypeScript a saber que esto devuelve UN SOLO usuario (o nulo)
  // async findByEmail(correo: string): Promise<Usuario | null> {
  //   return await this.usuarioRepository.findOne({ where: { correo } });
  // }

  async findById(id: number) {
    const user = await this.usuarioRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(userData: any) {
    const newUser = this.usuarioRepository.create(userData);
    return this.usuarioRepository.save(newUser);
  }

  async actualizarCuenta(id: number, datosNuevos: any) {
    const estrategia = new RectificacionStrategy();
    return this.procesarArco(estrategia, id, datosNuevos);
  }

  async anonimizarCuenta(id: number) {
    const estrategia = new CancelacionStrategy();
    return this.procesarArco(estrategia, id);
  }

  private async procesarArco(strategy: ArcoStrategy, id: number, datos?: any) {
    const usuario = await this.findById(id);
    return await strategy.ejecutar(usuario, this.usuarioRepository, datos);
  }

  async obtenerTodosLosUsuarios() {
    return await this.usuarioRepository.find();
  }
}
