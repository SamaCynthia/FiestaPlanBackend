import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 100 },  // Rampa de subida rápida a 100 usuarios
    { duration: '20s', target: 1000 }, // Estabilizar en 1000 usuarios concurrentes
    { duration: '5s', target: 0 },    // Rampa de bajada a 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // El 95% de las peticiones deben durar menos de 2s (2000ms)
    http_req_failed: ['rate<0.01'],    // La tasa de error debe ser menor al 1%
  },
};

// Se puede configurar la URL objetivo usando la variable de entorno TARGET_URL.
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

let errorLogged = false;

export default function () {
  const url = `${BASE_URL}/auth/login`;

  const payload = JSON.stringify({
    correo: 'stress-user-v3@fiestaplan.local',
    password: 'SecurePassword123!',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // Depuración: Imprime el primer error para saber qué está fallando
  if (res.status !== 200 && res.status !== 201 && !errorLogged) {
    console.log(`[DEBUG] Error en Login: Status = ${res.status}, Body = ${res.body}`);
    errorLogged = true;
  }

  // La validación acepta 200 y 201 como estados exitosos de inicio de sesión
  check(res, {
    'status es exitoso (200 o 201)': (r) => r.status === 200 || r.status === 201,
  });

  // Pequeño retardo de 1 segundo entre iteraciones por cada usuario virtual
  sleep(1);
}
