import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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

  // Lógica ARCO: Cancelación / Anonimización (Issue 5)
  async anonimizarCuenta(id: number) {
    const userIndex = this.DB.findIndex((u) => u.id === id);
    if (userIndex === -1) throw new NotFoundException('Usuario no encontrado');

    // Destruimos los datos personales, pero mantenemos el registro para estadísticas
    this.DB[userIndex].nombre = 'Usuario Anonimizado';
    this.DB[userIndex].email = `eliminado_${id}@fiestaplan.local`;
    this.DB[userIndex].password = 'ELIMINADO';
    this.DB[userIndex].fecha_eliminacion = new Date();

    return { message: 'Cuenta cancelada y anonimizada según la LGPDPPSO' };
  }

  // 2. Agrega esta nueva función para la Rectificación (ARCO)
  async actualizarCuenta(id: number, datosNuevos: any) {
    const userIndex = this.DB.findIndex((u) => u.id === id);
    if (userIndex === -1) throw new NotFoundException('Usuario no encontrado');

    // Actualización dinámica: Revisamos qué mandó el usuario en la petición
    if (datosNuevos.nombre) {
      this.DB[userIndex].nombre = datosNuevos.nombre;
    }

    // Si manda una nueva contraseña, la volvems a hashear por seguridad
    if (datosNuevos.password) {
      this.DB[userIndex].password = await bcrypt.hash(datosNuevos.password, 10);
    }

    // Extraemos la contraseña para no devolverla en la respuesta (por seguridad)
    const { password, ...usuarioActualizado } = this.DB[userIndex];

    return {
      message: 'Cuenta (Rectificación) actualizada exitosamente',
      user: usuarioActualizado,
    };
  }
}
