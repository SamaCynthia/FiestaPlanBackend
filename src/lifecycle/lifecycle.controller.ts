import { Controller, Post } from '@nestjs/common';
import { LifecycleJobService } from './lifecycle-job.service';

@Controller('lifecycle')
export class LifecycleController {
  constructor(private readonly lifecycleJobService: LifecycleJobService) {}

  @Post('trigger')
  async triggerClean() {
    // Ejecuta el CronJob en segundo plano de forma asíncrona para que el API responda rápido
    this.lifecycleJobService.ejecutarLimpiezaCicloVida().catch((err) => {
      console.error('Error al ejecutar limpieza de ciclo de vida:', err);
    });

    return {
      message: 'Proceso de ciclo de vida iniciado en segundo plano',
    };
  }
}
