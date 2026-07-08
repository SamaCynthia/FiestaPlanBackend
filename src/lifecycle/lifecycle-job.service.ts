import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource, Repository, Not, Like, LessThan } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Usuario } from '../users/entities/usuario.entity';
import { CancelacionStrategy } from '../users/interfaces/strategy.interface';

@Injectable()
export class LifecycleJobService {
  private readonly logger = new Logger(LifecycleJobService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Tarea programada para ejecutarse diariamente de madrugada (a las 2:00 AM).
   * Procesa la caducidad y minimización de datos (anonimización de usuarios y borrado de eventos).
   */
  @Cron('0 2 * * *')
  async ejecutarLimpiezaCicloVida(): Promise<void> {
    this.logger.log('Iniciando proceso automático de ciclo de vida (limpieza y anonimización)...');

    // 1. Anonimizar usuarios inactivos
    let usuariosAnonimizados = 0;
    try {
      const cutOffDate = new Date();
      cutOffDate.setDate(cutOffDate.getDate() - 30); // 30 días de antigüedad en inactividad

      const usuariosParaAnonimizar = await this.usuarioRepository.find({
        where: {
          activo: false,
          updated_at: LessThan(cutOffDate),
          correo: Not(Like('eliminado_%')),
        },
      });

      const estrategia = new CancelacionStrategy();
      for (const usuario of usuariosParaAnonimizar) {
        try {
          await estrategia.ejecutar(usuario, this.usuarioRepository);
          usuariosAnonimizados++;
        } catch (error) {
          // Logueamos solo el ID para evitar imprimir PII
          this.logger.error(
            `Error al anonimizar usuario con ID ${usuario.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error en el paso de anonimización de usuarios: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 2. Eliminar eventos antiguos (y por cascada todos sus datos)
    let eventosEliminados = 0;
    try {
      const resEventos = await this.dataSource.query(
        `DELETE FROM eventos WHERE fecha_evento < CURRENT_DATE - INTERVAL '365 days'`,
      );
      eventosEliminados = Array.isArray(resEventos)
        ? resEventos[1]
        : (resEventos?.rowCount || 0);
    } catch (error) {
      this.logger.error(
        `Error en el paso de eliminación de eventos: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // 3. Eliminar sesiones expiradas (Opcional - Mantenimiento)
    let sesionesEliminadas = 0;
    try {
      const resSesiones = await this.dataSource.query(
        `DELETE FROM sesiones WHERE expira_en < NOW()`,
      );
      sesionesEliminadas = Array.isArray(resSesiones)
        ? resSesiones[1]
        : (resSesiones?.rowCount || 0);
    } catch (error) {
      this.logger.error(
        `Error en el paso de limpieza de sesiones: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    this.logger.log(
      `Proceso automático de ciclo de vida finalizado con éxito. ` +
        `Resumen de registros afectados: [Usuarios Anonimizados: ${usuariosAnonimizados}], ` +
        `[Eventos Eliminados: ${eventosEliminados}], ` +
        `[Sesiones Expiradas Eliminadas: ${sesionesEliminadas}]`,
    );
  }
}
