import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Correo inválido' })
  email!: string;

  @IsString()
  password!: string;
}
