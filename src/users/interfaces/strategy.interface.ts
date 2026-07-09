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
    if (datosNuevos.foto_perfil_url !== undefined) {
      usuario.foto_perfil_url = datosNuevos.foto_perfil_url;
    }
    if (datosNuevos.foto_perfil_data !== undefined) {
      usuario.foto_perfil_data = datosNuevos.foto_perfil_data;
    }
    if (datosNuevos.foto_perfil_mime !== undefined) {
      usuario.foto_perfil_mime = datosNuevos.foto_perfil_mime;
    }
    if (datosNuevos.telefono !== undefined) {
      usuario.telefono = datosNuevos.telefono;
    }
    if (datosNuevos.ciudad_residencia !== undefined) {
      usuario.ciudad_residencia = datosNuevos.ciudad_residencia;
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
    usuario.activo = false;
    usuario.telefono = undefined;
    usuario.ciudad_residencia = undefined;
    usuario.fecha_nacimiento = '1970-01-01';
    usuario.genero = 'prefiero_no_decir';
    usuario.foto_perfil_data = null;
    usuario.foto_perfil_url = undefined;
    usuario.foto_perfil_mime = undefined;
    usuario.token_verificacion = undefined;

    await repo.save(usuario);

    return {
      message: 'Cuenta cancelada y anonimizada en PostgreSQL según LGPDPPSO',
    };
  }
}