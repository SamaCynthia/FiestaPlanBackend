import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CrearConsentimientoDto {
  @IsString()
  @IsNotEmpty()
  servicio!: string;

  @IsBoolean()
  @IsOptional()
  concedido?: boolean;

  @IsBoolean()
  @IsOptional()
  excepcionLey?: boolean;

  @IsString()
  @IsOptional()
  excepcionDocumentada?: string;
}
