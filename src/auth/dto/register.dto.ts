import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  nombre!: string;

  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  email!: string;

  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres para ser segura',
  })
  password!: string;
}
