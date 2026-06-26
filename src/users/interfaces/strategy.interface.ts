import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import * as bcrypt from 'bcrypt';

export interface ArcoStrategy {
  ejecutar(
    usuario: Usuario,
    repo: Repository<Usuario>,
    datos?: any,
  ): Promise<any>;
}

export class RectificacionStrategy implements ArcoStrategy {
  async ejecutar(
    usuario: Usuario,
    repo: Repository<Usuario>,
    datosNuevos: any,
  ) {
    if (datosNuevos.nombres) usuario.nombres = datosNuevos.nombres;
    if (datosNuevos.apellidos) usuario.apellidos = datosNuevos.apellidos;

    if (datosNuevos.password) {
      usuario.password_hash = await bcrypt.hash(datosNuevos.password, 10);
    }

    const actualizado = await repo.save(usuario);
    const { password_hash, ...resto } = actualizado;

    return {
      message: 'Cuenta rectificada en PostgreSQL mediante Strategy',
      user: resto,
    };
  }
}

export class CancelacionStrategy implements ArcoStrategy {
  async ejecutar(usuario: Usuario, repo: Repository<Usuario>) {
    usuario.nombres = 'Usuario';
    usuario.apellidos = 'Anonimizado';
    usuario.correo = `eliminado_${usuario.id}@fiestaplan.local`;
    usuario.password_hash = 'ELIMINADO';
    usuario.activo = false; // Desactivamos el login
    usuario.fecha_eliminacion = new Date();

    await repo.save(usuario);

    return {
      message: 'Cuenta cancelada y anonimizada en PostgreSQL según LGPDPPSO',
    };
  }
}
