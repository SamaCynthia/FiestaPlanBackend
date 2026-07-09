import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
    next();
  });

  // Simple memory-based rate limiting for login to prevent brute force (OWASP Top 10)
  const loginAttempts = new Map<string, { count: number; resetTime: number }>();
  app.use('/auth/login', (req: any, res: any, next: any) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const limit = 50; // max 50 requests
    const windowMs = 60 * 1000; // 1 minute window

    let clientAttempts = loginAttempts.get(ip);
    if (!clientAttempts || now > clientAttempts.resetTime) {
      clientAttempts = { count: 0, resetTime: now + windowMs };
    }

    clientAttempts.count++;
    loginAttempts.set(ip, clientAttempts);

    if (clientAttempts.count > limit) {
      return res.status(429).json({
        statusCode: 429,
        message: 'Too Many Requests - Intente de nuevo más tarde.',
        error: 'Too Many Requests',
      });
    }
    next();
  });

  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
