import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LogAuditoria } from './entities/log-auditoria.entity';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([LogAuditoria]), UsersModule],
  providers: [
    AuditLogsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
