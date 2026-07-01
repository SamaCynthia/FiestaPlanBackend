import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Correo inválido' })
  correo!: string;

  @IsString()
  password!: string;
}
