import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Rol } from '../../roles/entities/rol.entity';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ generated: 'uuid' })
  uuid!: string;

  @Column({ length: 100 })
  nombres!: string;

  @Column({ length: 100 })
  apellidos!: string;

  @Column({ type: 'date' })
  fecha_nacimiento!: string;

  @Column({ default: 'prefiero_no_decir' })
  genero!: string;

  @Column({ unique: true })
  correo!: string;

  @Column({ nullable: true })
  telefono?: string;

  @Column({ nullable: true })
  ciudad_residencia?: string;

  @Column({ name: 'password_hash' })
  password_hash!: string;

  @Column({ default: true })
  activo!: boolean;

  @Column({ default: false })
  correo_verificado!: boolean;

  // Relación dinámica con la tabla roles (rol de sistema: admin, moderador, usuario)
  @Column({ name: 'rol_id', default: 3 })
  rol_id!: number;

  @ManyToOne(() => Rol, { eager: true })
  @JoinColumn({ name: 'rol_id' })
  rol!: Rol;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
