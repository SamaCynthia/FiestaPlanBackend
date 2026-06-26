import * as bcrypt from 'bcrypt';

// Interfaz base obligatoria
export interface ArcoStrategy {
  ejecutar(usuarioIndex: number, DB: any[], datos?: any): any;
}

// Estrategia encargada del Derecho de Rectificación
export class RectificacionStrategy implements ArcoStrategy {
  async ejecutar(usuarioIndex: number, DB: any[], datosNuevos: any) {
    if (datosNuevos.nombre) {
      DB[usuarioIndex].nombre = datosNuevos.nombre;
    }

    if (datosNuevos.password) {
      DB[usuarioIndex].password = await bcrypt.hash(datosNuevos.password, 10);
    }

    const { password, ...usuarioActualizado } = DB[usuarioIndex];

    return {
      message:
        'Cuenta (Rectificación) actualizada exitosamente mediante Strategy',
      user: usuarioActualizado,
    };
  }
}

// Estrategia encargada del Derecho de Cancelación
export class CancelacionStrategy implements ArcoStrategy {
  async ejecutar(usuarioIndex: number, DB: any[]) {
    const id = DB[usuarioIndex].id;

    DB[usuarioIndex].nombre = 'Usuario Anonimizado';
    DB[usuarioIndex].email = `eliminado_${id}@fiestaplan.local`;
    DB[usuarioIndex].password = 'ELIMINADO';
    DB[usuarioIndex].fecha_eliminacion = new Date();

    return {
      message:
        'Cuenta cancelada y anonimizada según la LGPDPPSO mediante Strategy',
    };
  }
}
