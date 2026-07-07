import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiAdapterService } from './api-adapter.service';
import { ApiAdapterController } from './api-adapter.controller';
import { UsuarioConsentimiento } from './entities/usuario-consentimiento.entity';
import { SharedAuthModule } from '../auth/shared/shared-auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioConsentimiento]),
    SharedAuthModule,
    AuditLogsModule,
  ],
  controllers: [ApiAdapterController],
  providers: [ApiAdapterService],
  exports: [ApiAdapterService],
})
export class ApiAdapterModule {}
