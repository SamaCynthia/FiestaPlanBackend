import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { CancelacionStrategy } from './interfaces/strategy.interface';
import { Repository } from 'typeorm';

describe('UsersService - Pruebas Unitarias', () => {
  let service: UsersService;
  let usuarioRepository: Repository<Usuario>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          // Hacemos un mock del repositorio de TypeORM
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usuarioRepository = module.get<Repository<Usuario>>(
      getRepositoryToken(Usuario),
    );
  });

  describe('CU-02: Patrón Strategy Derechos ARCO', () => {
    it('Debería invocar la estrategia de Cancelación correctamente sin ejecutar otras', async () => {
      // Datos de entrada
      const userId = 'uuid-de-prueba';
      const mockUser = new Usuario();
      mockUser.uuid = userId;
      
      // Configuramos el mock de findOne para simular que encuentra al usuario
      jest.spyOn(usuarioRepository, 'findOne').mockResolvedValue(mockUser);

      // Pasos de ejecución:
      // 1. Configurar el contexto con la estrategia (esto lo hace internamente anonimizarCuenta)
      // Para poder validar que se llamó, espiamos el prototype de CancelacionStrategy
      const estrategiaSpy = jest
        .spyOn(CancelacionStrategy.prototype, 'ejecutar')
        .mockResolvedValue({ message: 'Exito' });

      // 2. Ejecutar el procesador
      await service.anonimizarCuenta(userId);

      // Resultado Esperado: Se llama exclusivamente al método de Cancelación
      expect(estrategiaSpy).toHaveBeenCalledTimes(1);
      
      // Verificamos que se le pasen los argumentos correctos
      expect(estrategiaSpy).toHaveBeenCalledWith(
        mockUser, 
        usuarioRepository,
        undefined
      );

      // Limpieza del mock
      estrategiaSpy.mockRestore();
    });
  });
});
