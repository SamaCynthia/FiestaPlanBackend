import { IsEmail, IsString, MinLength, IsDateString } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  nombres!: string;

  @IsString({ message: 'El apellido debe ser un texto' })
  apellidos!: string;

  @IsEmail({}, { message: 'El correo debe tener un formato válido' })
  correo!: string;

  @IsDateString(
    {},
    {
      message: 'La fecha de nacimiento debe ser una fecha válida (YYYY-MM-DD)',
    },
  )
  fecha_nacimiento!: string;

  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres para ser segura',
  })
  password!: string;
}
