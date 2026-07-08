import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UsuarioConsentimiento } from './entities/usuario-consentimiento.entity';
import { CrearConsentimientoDto } from './dto/consentimiento.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import * as https from 'https';
import * as fs from 'fs';
import { URL } from 'url';

export interface TransferOptions {
  usuarioId?: number; // Opcional si aplica una excepción de ley
  servicio: string; // Nombre descriptivo del servicio de terceros, ej. 'PAGOS_STRIPE'
  url: string; // URL destino, debe ser HTTPS
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: any;
  headers?: Record<string, string>;
  excepcionLey?: boolean;
  excepcionDocumentada?: string;
}

@Injectable()
export class ApiAdapterService {
  private readonly logger = new Logger(ApiAdapterService.name);

  constructor(
    @InjectRepository(UsuarioConsentimiento)
    private readonly consentRepository: Repository<UsuarioConsentimiento>,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Otorga o actualiza el consentimiento de un usuario para transferencias externas.
   */
  async otorgarConsentimiento(
    usuarioId: number,
    dto: CrearConsentimientoDto,
  ): Promise<UsuarioConsentimiento> {
    let consent = await this.consentRepository.findOne({
      where: { usuarioId, servicio: dto.servicio },
    });

    if (consent) {
      consent.concedido = dto.concedido ?? true;
      consent.excepcionLey = dto.excepcionLey ?? false;
      consent.excepcionDocumentada = dto.excepcionDocumentada ?? null;
      consent.consentimientoFecha = new Date();
    } else {
      consent = this.consentRepository.create({
        usuarioId,
        servicio: dto.servicio,
        concedido: dto.concedido ?? true,
        excepcionLey: dto.excepcionLey ?? false,
        excepcionDocumentada: dto.excepcionDocumentada ?? null,
      });
    }

    return await this.consentRepository.save(consent);
  }

  /**
   * Obtiene todos los consentimientos otorgados de un usuario.
   */
  async obtenerConsentimientos(
    usuarioId: number,
  ): Promise<UsuarioConsentimiento[]> {
    return await this.consentRepository.find({
      where: { usuarioId },
      order: { servicio: 'ASC' },
    });
  }

  /**
   * Realiza la transferencia de datos de manera estrictamente cifrada y segura.
   */
  async transferirDatos(options: TransferOptions): Promise<any> {
    const {
      usuarioId,
      servicio,
      url,
      method,
      data,
      headers = {},
      excepcionLey,
      excepcionDocumentada,
    } = options;

    // 1. Canales Estrictamente Cifrados (HTTPS/TLS)
    if (!url.startsWith('https://')) {
      const errMsg =
        'Canal no seguro rechazado: Las peticiones salientes deben usar estrictamente HTTPS.';
      this.logger.error(errMsg);

      await this.registrarLogAuditoria({
        usuarioId,
        exitoso: false,
        descripcion: `Intento de conexión no cifrada a endpoint HTTP plano para el servicio: ${servicio}`,
        errorMsg: errMsg,
        endpoint: url,
        metodo: method,
      });

      throw new BadRequestException(errMsg);
    }

    // 2. Validación de Consentimiento
    let consentimientoValido = false;

    if (usuarioId) {
      const registroConsentimiento = await this.consentRepository.findOne({
        where: { usuarioId, servicio, concedido: true },
      });
      if (registroConsentimiento) {
        consentimientoValido = true;
      }
    }

    // Si no cuenta con consentimiento explícito, validar si aplica excepción de ley documentada
    if (!consentimientoValido) {
      if (
        excepcionLey &&
        excepcionDocumentada &&
        excepcionDocumentada.trim().length > 0
      ) {
        this.logger.warn(
          `Transferencia autorizada bajo excepción de ley documentada para el servicio ${servicio}. Detalles: ${excepcionDocumentada}`,
        );
      } else {
        const errMsg = `Transferencia rechazada: Se requiere consentimiento explícito del usuario o una excepción de ley plenamente documentada para el servicio ${servicio}.`;
        this.logger.error(errMsg);

        await this.registrarLogAuditoria({
          usuarioId,
          exitoso: false,
          descripcion: `Intento de transferencia de datos rechazado por falta de consentimiento para el servicio: ${servicio}`,
          errorMsg: errMsg,
          endpoint: url,
          metodo: method,
        });

        throw new BadRequestException(errMsg);
      }
    }

    // 3. Protección de Credenciales / Inyección de Tokens desde variables de entorno (.env)
    const serviceKey = servicio.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const tokenConfigKey = `${serviceKey}_API_TOKEN`;
    const token = this.configService.get<string>(tokenConfigKey);

    const requestHeaders = { ...headers };
    if (token) {
      requestHeaders['Authorization'] = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }

    if (data && !requestHeaders['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    // 4. Autenticación Segura / Configuración de mTLS (Certificados desde .env)
    const agentOptions: https.AgentOptions = {};

    const clientKey = this.configService.get<string>(
      `${serviceKey}_CLIENT_KEY`,
    );
    const clientCert = this.configService.get<string>(
      `${serviceKey}_CLIENT_CERT`,
    );
    const caCert = this.configService.get<string>(`${serviceKey}_CA_CERT`);

    const clientKeyPath = this.configService.get<string>(
      `${serviceKey}_CLIENT_KEY_PATH`,
    );
    const clientCertPath = this.configService.get<string>(
      `${serviceKey}_CLIENT_CERT_PATH`,
    );
    const caCertPath = this.configService.get<string>(
      `${serviceKey}_CA_CERT_PATH`,
    );

    // Inyección de certificados en línea (PEM o Base64) o cargados desde archivo
    if (clientKey) {
      agentOptions.key = this.parsearCertificado(clientKey);
    } else if (clientKeyPath && fs.existsSync(clientKeyPath)) {
      agentOptions.key = fs.readFileSync(clientKeyPath);
    }

    if (clientCert) {
      agentOptions.cert = this.parsearCertificado(clientCert);
    } else if (clientCertPath && fs.existsSync(clientCertPath)) {
      agentOptions.cert = fs.readFileSync(clientCertPath);
    }

    if (caCert) {
      agentOptions.ca = this.parsearCertificado(caCert);
    } else if (caCertPath && fs.existsSync(caCertPath)) {
      agentOptions.ca = fs.readFileSync(caCertPath);
    }

    const agent = new https.Agent(agentOptions);

    // 5. Ejecución de la petición HTTPS
    try {
      const response = await this.realizarPeticionHttps(
        url,
        method,
        requestHeaders,
        data,
        agent,
      );

      // Guardar log de auditoría exitoso
      await this.registrarLogAuditoria({
        usuarioId,
        exitoso: true,
        descripcion: `Transferencia de datos segura completada exitosamente al servicio ${servicio}`,
        endpoint: url,
        metodo: method,
      });

      return response;
    } catch (error: any) {
      // 6. Manejo de Errores de Transferencia (sin exponer tokens o certificados)
      const errorSanitizado = this.sanitizarError(error);
      this.logger.error(
        `Error en transferencia externa: ${errorSanitizado.message}`,
      );

      await this.registrarLogAuditoria({
        usuarioId,
        exitoso: false,
        descripcion: `Fallo al realizar la transferencia al servicio ${servicio}`,
        errorMsg: errorSanitizado.message,
        endpoint: url,
        metodo: method,
      });

      throw errorSanitizado;
    }
  }

  private parsearCertificado(val: string): string | Buffer {
    const formatted = val.replace(/\\n/g, '\n');
    if (formatted.includes('-----BEGIN')) {
      return formatted;
    }
    try {
      return Buffer.from(val, 'base64').toString('utf-8');
    } catch {
      return val;
    }
  }

  private realizarPeticionHttps(
    targetUrl: string,
    method: string,
    headers: Record<string, string>,
    data: any,
    agent: https.Agent,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(targetUrl);
      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: headers,
        agent: agent,
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const statusCode = res.statusCode || 500;
          if (statusCode >= 200 && statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(body);
            }
          } else {
            reject(
              new Error(
                `Servicio externo retornó código ${statusCode}. Respuesta: ${body.substring(0, 200)}`,
              ),
            );
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        const bodyData = typeof data === 'string' ? data : JSON.stringify(data);
        req.write(bodyData);
      }
      req.end();
    });
  }

  private sanitizarError(error: any): Error {
    const rawMsg = error.message || 'Error desconocido de red';

    // Eliminar tokens de tipo Bearer, Authorization headers u otras rutas de certificados locales
    let sanitizedMsg = rawMsg
      .replace(/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/g, 'Bearer [REDACTED]')
      .replace(/Authorization/gi, '[REDACTED_HEADER]')
      .replace(
        /key|cert|ca/gi,
        (match: string) => `[REDACTED_${match.toUpperCase()}]`,
      );

    // Evitar exponer directorios y archivos de sistema local de certificados
    sanitizedMsg = sanitizedMsg.replace(
      /[a-zA-Z]:\\[\\\w.\-_]+/g,
      '[REDACTED_PATH]',
    );

    return new Error(sanitizedMsg);
  }

  private async registrarLogAuditoria(params: {
    usuarioId?: number;
    exitoso: boolean;
    descripcion: string;
    errorMsg?: string;
    endpoint: string;
    metodo: string;
  }) {
    try {
      await this.auditLogsService.crearLog({
        usuarioId: params.usuarioId || null,
        accion: 'transferencia_datos',
        descripcion: params.descripcion,
        modulo: 'transferencia_datos',
        entidadTipo: 'transferencia_externa',
        endpoint: params.endpoint,
        metodoHttp: params.metodo,
        exitoso: params.exitoso,
        mensajeError: params.errorMsg || undefined,
      });
    } catch (err: any) {
      this.logger.error(`Error al crear el log de auditoría: ${err.message}`);
    }
  }
}
