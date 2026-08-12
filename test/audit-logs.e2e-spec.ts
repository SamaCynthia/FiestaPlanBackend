import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../src/users/entities/usuario.entity';
import { LogAuditoria } from '../src/audit-logs/entities/log-auditoria.entity';

describe('AuditLogs (e2e)', () => {
  let app: INestApplication<App>;
  let usuarioRepository: Repository<Usuario>;
  let logAuditoriaRepository: Repository<LogAuditoria>;

  const testUserEmail = 'pii-test-regression@fiestaplan.local';
  const testUserPassword = 'SecurePasswordPii123!';

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    usuarioRepository = moduleFixture.get<Repository<Usuario>>(getRepositoryToken(Usuario));
    logAuditoriaRepository = moduleFixture.get<Repository<LogAuditoria>>(getRepositoryToken(LogAuditoria));

    // Asegurarse de que no exista el usuario de prueba antes de empezar
    const existing = await usuarioRepository.findOne({ where: { correo: testUserEmail } });
    if (existing) {
      await logAuditoriaRepository.delete({ usuarioId: existing.id });
      await usuarioRepository.delete({ id: existing.id });
    }
  });

  afterAll(async () => {
    // Limpieza final de datos de prueba
    const existing = await usuarioRepository.findOne({ where: { correo: testUserEmail } });
    if (existing) {
      await logAuditoriaRepository.delete({ usuarioId: existing.id });
      await usuarioRepository.delete({ id: existing.id });
    }
    await app.close();
  });

  it('Debería registrar un usuario y generar un log de auditoría sin fugar PII (CR-02)', async () => {
    // 1. Enviar petición de registro
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({
        nombres: 'PII Test',
        apellidos: 'Regression',
        correo: testUserEmail,
        fecha_nacimiento: '1995-05-15',
        password: testUserPassword,
        genero: 'prefiero_no_decir',
        telefono: '1234567890',
        ciudad_residencia: 'Dolores Hidalgo',
      })
      .expect(201);

    expect(registerResponse.body).toHaveProperty('message', 'Usuario registrado con éxito');

    // Esperar a que se guarde el log en la base de datos de forma asíncrona
    await wait(500);

    // 2. Buscar al usuario recién creado para obtener su ID
    const testUser = await usuarioRepository.findOne({ where: { correo: testUserEmail } });
    expect(testUser).toBeDefined();
    expect(testUser).not.toBeNull();
    const userId = testUser!.id;

    // 3. Obtener el log de auditoría correspondiente al registro
    const logs = await logAuditoriaRepository.find({
      where: { usuarioId: userId, accion: 'registro' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);

    // IMPRIMIR EVIDENCIA PARA EL REPORTE
    console.log('\n======================================================');
    console.log('EVIDENCIA CR-02: Registro de Auditoría para Registro de Usuario');
    console.log('======================================================');
    console.log(logs);
    console.log('======================================================\n');

    // 4. Validar que los campos de los logs no contengan el correo ni la contraseña
    for (const log of logs) {
      const desc = log.descripcion || '';
      const errMsg = log.mensajeError || '';

      // Ninguno de estos campos debe contener el correo electrónico o la contraseña en texto plano
      expect(desc.includes(testUserEmail)).toBe(false);
      expect(desc.includes(testUserPassword)).toBe(false);
      expect(errMsg.includes(testUserEmail)).toBe(false);
      expect(errMsg.includes(testUserPassword)).toBe(false);
    }
  });

  it('Debería hacer login y generar un log de auditoría sin fugar la contraseña en texto plano (CR-02)', async () => {
    // 1. Enviar petición de login exitoso
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo: testUserEmail,
        password: testUserPassword,
      })
      .expect(201);

    expect(loginResponse.body).toHaveProperty('rol');

    // Esperar a que se guarde el log en la base de datos de forma asíncrona
    await wait(500);

    // 2. Buscar al usuario recién creado para obtener su ID
    const testUser = await usuarioRepository.findOne({ where: { correo: testUserEmail } });
    const userId = testUser!.id;

    // 3. Obtener el log de auditoría correspondiente al login
    const logs = await logAuditoriaRepository.find({
      where: { usuarioId: userId, accion: 'login' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);

    // IMPRIMIR EVIDENCIA PARA EL REPORTE
    console.log('\n======================================================');
    console.log('EVIDENCIA CR-02: Registro de Auditoría para Login Exitoso');
    console.log('======================================================');
    console.log(logs);
    console.log('======================================================\n');

    // 4. Validar que los campos de los logs no contengan la contraseña
    for (const log of logs) {
      const desc = log.descripcion || '';
      const errMsg = log.mensajeError || '';

      expect(desc.includes(testUserPassword)).toBe(false);
      expect(errMsg.includes(testUserPassword)).toBe(false);
    }
  });

  it('Debería generar un log de intento fallido sin fugar la contraseña ni datos PII (CR-02)', async () => {
    const wrongPassword = 'IncorrectPasswordPii123!';

    // 1. Enviar petición de login fallido
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        correo: testUserEmail,
        password: wrongPassword,
      })
      .expect(401);

    // Esperar a que se guarde el log en la base de datos de forma asíncrona
    await wait(500);

    // 2. Buscar al usuario
    const testUser = await usuarioRepository.findOne({ where: { correo: testUserEmail } });
    const userId = testUser!.id;

    // 3. Obtener el log de auditoría correspondiente al intento de login fallido
    const logs = await logAuditoriaRepository.find({
      where: { usuarioId: userId, accion: 'intento_login_fallido' },
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);

    // IMPRIMIR EVIDENCIA PARA EL REPORTE
    console.log('\n======================================================');
    console.log('EVIDENCIA CR-02: Registro de Auditoría para Login Fallido');
    console.log('======================================================');
    console.log(logs);
    console.log('======================================================\n');

    // 4. Validar que los campos de los logs no contengan la contraseña incorrecta
    for (const log of logs) {
      const desc = log.descripcion || '';
      const errMsg = log.mensajeError || '';

      expect(desc.includes(wrongPassword)).toBe(false);
      expect(errMsg.includes(wrongPassword)).toBe(false);
    }
  });
});
