import { Injectable, NotFoundException } from '@nestjs/common';
import { ArcoStrategy, RectificacionStrategy, CancelacionStrategy } from './interfaces/strategy.interface';

@Injectable()
export class UsersService {
  private DB: any[] = [];

  async obtenerTodosLosUsuarios() {
    return this.DB;
  }

  async findByEmail(email: string) {
    return this.DB.find((user) => user.email === email);
  }

  async findById(id: number) {
    const user = this.DB.find((user) => user.id === id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(user: any) {
    const newUser = { id: Date.now(), ...user, rol: 'anfitrion' };
    this.DB.push(newUser);
    return newUser;
  }

  // Lógica ARCO: Cancelación / Anonimización delegada a Strategy
  async anonimizarCuenta(id: number) {
    const estrategia = new CancelacionStrategy();
    return this.procesarArco(estrategia, id);
  }

  // Lógica ARCO: Rectificación delegada a Strategy
  async actualizarCuenta(id: number, datosNuevos: any) {
    const estrategia = new RectificacionStrategy();
    return this.procesarArco(estrategia, id, datosNuevos);
  }

  // Procesador central del patrón Contexto
  private async procesarArco(strategy: ArcoStrategy, id: number, datos?: any) {
    const userIndex = this.DB.findIndex((u) => u.id === id);
    if (userIndex === -1) throw new NotFoundException('Usuario no encontrado');
    
    // Ejecutamos y esperamos la estrategia de manera asíncrona
    return await strategy.ejecutar(userIndex, this.DB, datos);
  }
}