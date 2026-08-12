import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno del archivo .env del proyecto
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  console.log('Conectado a la base de datos de PostgreSQL...');

  // Si se pasa el argumento --clean, borramos los usuarios
  const args = process.argv.slice(2);
  if (args.includes('--clean')) {
    console.log('Limpiando usuarios de pruebas de estrés...');
    const deleteQuery = `DELETE FROM usuarios WHERE correo LIKE 'stress-batch-%';`;
    const start = Date.now();
    const res = await client.query(deleteQuery);
    const duration = (Date.now() - start) / 1000;
    console.log(`Se eliminaron con éxito ${res.rowCount} usuarios de prueba en ${duration} segundos.`);
    await client.end();
    return;
  }

  console.log('Insertando 10,000 usuarios de prueba inactivos...');
  
  // Usamos la función generate_series de Postgres para insertar los 10,000 en una sola transacción ultrarrápida
  const query = `
    INSERT INTO usuarios (nombres, apellidos, fecha_nacimiento, genero, correo, password_hash, activo, correo_verificado, rol_id, created_at, updated_at)
    SELECT 
      'StressBatch' || s.id,
      'User',
      '1990-01-01',
      'prefiero_no_decir',
      'stress-batch-' || s.id || '@fiestaplan.local',
      'ELIMINAR_STRESS',
      false,
      false,
      3,
      NOW() - INTERVAL '40 days',
      NOW() - INTERVAL '40 days'
    FROM generate_series(1, 10000) AS s(id)
    ON CONFLICT (correo) DO NOTHING;
  `;

  const start = Date.now();
  const res = await client.query(query);
  const duration = (Date.now() - start) / 1000;

  console.log(`Se insertaron con éxito ${res.rowCount} usuarios de prueba en ${duration} segundos.`);
  await client.end();
}

seed().catch((err) => {
  console.error('Error al sembrar la base de datos:', err);
});
