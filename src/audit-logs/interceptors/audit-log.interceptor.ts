import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AUDIT_LOG_KEY, AuditLogOptions } from '../decorators/audit-log.decorator';
import { AuditLogsService } from '../audit-logs.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogsService: AuditLogsService,
    private readonly usersService: UsersService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest();
    const res = httpContext.getResponse();

    // Obtener la metadata del decorador @AuditLog
    const auditOptions = this.reflector.getAllAndOverride<AuditLogOptions>(
      AUDIT_LOG_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditOptions) {
      return next.handle();
    }

    const { accion, modulo, entidadTipo } = auditOptions;

    return next.handle().pipe(
      tap((responseBody) => {
        // Evento exitoso
        this.logEvent({
          req,
          statusCode: res.statusCode,
          exitoso: true,
          accion,
          modulo,
          entidadTipo,
          responseBody,
        }).catch((err) =>
          console.error('Error al guardar log de auditoría (exitoso):', err),
        );
      }),
      catchError((error) => {
        // Evento fallido
        const statusCode = error.status || 500;
        // Mensaje de error amigable y libre de PII
        const errorMessage = error.response?.message || error.message || 'Error interno del servidor';

        let resolvedAction = accion;
        if (accion === 'login') {
          resolvedAction = 'intento_login_fallido';
        }

        this.logEvent({
          req,
          statusCode,
          exitoso: false,
          accion: resolvedAction,
          modulo,
          entidadTipo,
          errorMessage: Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage,
        }).catch((err) =>
          console.error('Error al guardar log de auditoría (fallido):', err),
        );

        return throwError(() => error);
      }),
    );
  }

  private async logEvent(params: {
    req: any;
    statusCode: number;
    exitoso: boolean;
    accion: string;
    modulo: string;
    entidadTipo?: string;
    responseBody?: any;
    errorMessage?: string;
  }) {
    const {
      req,
      statusCode,
      exitoso,
      accion,
      modulo,
      entidadTipo,
      errorMessage,
    } = params;

    let usuarioId: number | null = null;
    let entidadId: number | null = null;

    // 1. Obtener ID del usuario autenticado si existe en el request
    if (req.user && req.user.id) {
      usuarioId = Number(req.user.id);
    }

    // 2. Flujo especial para Login / Intento Fallido (se identifica al actor por email ingresado)
    if (accion === 'login' || accion === 'intento_login_fallido') {
      const email = req.body?.correo;
      if (email) {
        const user = await this.usersService.findByEmail(email).catch(() => null);
        if (user) {
          usuarioId = user.id;
        }
      }
    }
    // 3. Flujo especial para Registro (se identifica al nuevo usuario tras completarse con éxito)
    else if (accion === 'registro' && exitoso) {
      const email = req.body?.correo;
      if (email) {
        const user = await this.usersService.findByEmail(email).catch(() => null);
        if (user) {
          usuarioId = user.id;
          entidadId = user.id;
        }
      }
    }

    // 4. Determinar el ID del recurso afectado (entidad_id)
    if (entidadTipo === 'usuario') {
      if (req.params?.uuid) {
        const targetUser = await this.usersService.findByUuid(req.params.uuid).catch(() => null);
        if (targetUser) {
          entidadId = targetUser.id;
        }
      } else if (req.user && req.user.id) {
        entidadId = Number(req.user.id);
      }
    }

    // 5. Contexto técnico de red
    let ipOrigen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    if (ipOrigen && typeof ipOrigen === 'string') {
      if (ipOrigen.includes(',')) {
        ipOrigen = ipOrigen.split(',')[0].trim();
      }
      if (ipOrigen === '::1') {
        ipOrigen = '127.0.0.1';
      } else if (ipOrigen.startsWith('::ffff:')) {
        ipOrigen = ipOrigen.substring(7);
      }
    }

    const userAgent = req.headers['user-agent'] || null;
    const metodoHttp = req.method;
    const endpoint = req.originalUrl;

    // 6. Generar una descripción descriptiva sin PII
    let descripcion = '';
    if (accion === 'login') {
      descripcion = 'Inicio de sesión exitoso';
    } else if (accion === 'intento_login_fallido') {
      descripcion = 'Intento fallido de inicio de sesión';
    } else if (accion === 'registro') {
      descripcion = 'Registro de nuevo usuario';
    } else if (accion === 'consultar_usuarios') {
      descripcion = 'Consulta de lista de usuarios';
    } else if (accion === 'consultar_perfil') {
      descripcion = `Consulta de perfil de usuario (ID de destino: ${entidadId || 'desconocido'})`;
    } else if (accion === 'editar_perfil') {
      descripcion = 'Actualización de perfil de usuario';
    } else if (accion === 'eliminar_perfil') {
      descripcion = 'Cancelación y anonimización de cuenta de usuario';
    } else {
      descripcion = `Acción ${accion} realizada en el módulo ${modulo}`;
    }

    await this.auditLogsService.crearLog({
      usuarioId,
      accion,
      descripcion,
      modulo,
      entidadTipo,
      entidadId,
      ipOrigen: ipOrigen || null,
      userAgent,
      metodoHttp,
      endpoint,
      codigoRespuesta: statusCode,
      exitoso,
      mensajeError: errorMessage ?? undefined,
    });
  }
}
