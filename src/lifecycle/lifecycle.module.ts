import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '../users/entities/usuario.entity';
import { LifecycleJobService } from './lifecycle-job.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [LifecycleJobService],
  exports: [LifecycleJobService],
})
export class LifecycleModule {}
