import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogAuditoria } from './entities/log-auditoria.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(LogAuditoria)
    private readonly logRepository: Repository<LogAuditoria>,
  ) {}

  async crearLog(logData: Partial<LogAuditoria>): Promise<LogAuditoria> {
    const log = this.logRepository.create(logData);
    return await this.logRepository.save(log);
  }
}
