import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Rampa de subida a 20 usuarios activos simulados
    { duration: '20s', target: 50 },  // 50 usuarios activos haciendo peticiones constantes
    { duration: '5s', target: 0 },   // Rampa de bajada
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // El 95% de las solicitudes normales deben durar <3s (3000ms)
    http_req_failed: ['rate<0.05'],    // Tasa de error menor al 5%
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  // El primer usuario virtual en su primera iteración dispara la tarea masiva en segundo plano
  if (__VU === 1 && __ITER === 0) {
    console.log('--- Disparando el CronJob de Ciclo de Vida masivo (10,000 registros) ---');
    const triggerUrl = `${BASE_URL}/lifecycle/trigger`;
    http.post(triggerUrl, {}, { headers: { 'Content-Type': 'application/json' } });
  }

  // Todos los demás VUs actúan como usuarios normales iniciando sesión
  const loginUrl = `${BASE_URL}/auth/login`;
  const payload = JSON.stringify({
    correo: 'stress-user-v3@fiestaplan.local',
    password: 'SecurePassword123!',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(loginUrl, payload, params);

  check(res, {
    'status es exitoso (200 o 201)': (r) => r.status === 200 || r.status === 201,
  });

  // Simular tiempo de espera del usuario (entre 0.5s y 1.5s)
  sleep(0.5 + Math.random());
}
