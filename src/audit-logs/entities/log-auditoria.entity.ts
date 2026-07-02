import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('logs_auditoria')
export class LogAuditoria {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'usuario_id', type: 'bigint', nullable: true })
  usuarioId?: number | null;

  @Column({ type: 'varchar', length: 100 })
  accion!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  modulo?: string;

  @Column({
    name: 'entidad_tipo',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  entidadTipo?: string;

  @Column({ name: 'entidad_id', type: 'bigint', nullable: true })
  entidadId?: number | null;

  @Column({ name: 'ip_origen', type: 'varchar', nullable: true })
  ipOrigen?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'metodo_http', type: 'varchar', length: 10, nullable: true })
  metodoHttp?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  endpoint?: string;

  @Column({ name: 'codigo_respuesta', type: 'smallint', nullable: true })
  codigoRespuesta?: number;

  @Column({ type: 'boolean', default: true })
  exitoso!: boolean;

  @Column({ name: 'mensaje_error', type: 'text', nullable: true })
  mensajeError?: string;

  @CreateDateColumn({ name: 'creado_en', type: 'timestamp with time zone' })
  creadoEn!: Date;
}
