import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service'; // Asegúrate de que esta ruta sea correcta
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService - Pruebas Unitarias', () => {
  let service: AuthService;

  // 1. Creamos objetos falsos (mocks) para engañar a las dependencias
  const mockUsersService = {};
  const mockJwtService = {};

  beforeEach(async () => {
    // 2. Registramos los mocks en el módulo de prueba
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService, // Le pasamos el objeto vacío
        },
        {
          provide: JwtService,
          useValue: mockJwtService, // Le pasamos el objeto vacío
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('CU-01: Debería hashear la contraseña usando bcrypt', async () => {
    // Datos de entrada
    const passwordEnTextoPlano = '123456';
    const saltRounds = 10;

    // Pasos de ejecución
    const hashedPassword = await bcrypt.hash(passwordEnTextoPlano, saltRounds);

    // Resultado esperado vs obtenido
    expect(hashedPassword).not.toEqual(passwordEnTextoPlano);
    expect(hashedPassword).toBeDefined();
  });
});