import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Usuario } from '../../users/entities/usuario.entity';

@Entity('usuario_consentimientos')
export class UsuarioConsentimiento {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'usuario_id', type: 'bigint' })
  usuarioId!: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario?: Usuario;

  @Column({ type: 'varchar', length: 100 })
  servicio!: string;

  @Column({ type: 'boolean', default: true })
  concedido!: boolean;

  @Column({
    name: 'consentimiento_fecha',
    type: 'timestamp with time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  consentimientoFecha!: Date;

  @Column({ name: 'excepcion_ley', type: 'boolean', default: false })
  excepcionLey!: boolean;

  @Column({ name: 'excepcion_documentada', type: 'text', nullable: true })
  excepcionDocumentada?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
