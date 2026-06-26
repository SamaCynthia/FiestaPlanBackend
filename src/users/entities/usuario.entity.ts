import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Generated,
} from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  @Generated('uuid')
  uuid!: string;

  @Column({ length: 100 })
  nombres!: string;

  @Column({ length: 100 })
  apellidos!: string;

  @Column({ type: 'date' })
  fecha_nacimiento!: string;

  @Column({ unique: true })
  correo!: string;

  @Column({ name: 'password_hash' })
  password_hash!: string;

  @Column({ default: true })
  activo!: boolean;

  @Column({ nullable: true })
  fecha_eliminacion!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
