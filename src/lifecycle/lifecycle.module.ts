import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../users/entities/usuario.entity';
import { LifecycleJobService } from './lifecycle-job.service';
import { LifecycleController } from './lifecycle.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  controllers: [LifecycleController],
  providers: [LifecycleJobService],
  exports: [LifecycleJobService],
})
export class LifecycleModule {}
