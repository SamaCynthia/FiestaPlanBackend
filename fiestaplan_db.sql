-- ============================================================
--  FiestaPlan - Script de Base de Datos Completa
--  Motor: PostgreSQL 15+ con extensión PostGIS
--  Convenciones:
--    - Nombres en snake_case, sin tildes ni eñes
--    - Claves primarias: id (BIGSERIAL)
--    - Timestamps: created_at / updated_at en todas las tablas
--    - Imágenes: columna image_data (BYTEA) para binario local
--                columna image_url  (TEXT)  para acceso via URL
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- uuid_generate_v4 / hashing
CREATE EXTENSION IF NOT EXISTS "postgis";      -- búsquedas geoespaciales
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- búsquedas sin tildes

-- ============================================================
-- 0. ENUMERACIONES (TIPOS PERSONALIZADOS)
-- ============================================================

CREATE TYPE genero_enum AS ENUM (
    'masculino',
    'femenino',
    'no_binario',
    'prefiero_no_decir'
);

CREATE TYPE rol_evento_enum AS ENUM (
    'anfitrion',
    'colaborador',
    'invitado'
);

CREATE TYPE estado_tarea_enum AS ENUM (
    'pendiente',
    'en_progreso',
    'completada',
    'cancelada'
);

CREATE TYPE estado_rsvp_enum AS ENUM (
    'pendiente',
    'confirmado',
    'rechazado'
);

CREATE TYPE tipo_evento_enum AS ENUM (
    'cumpleanos',
    'despedida',
    'boda',
    'graduacion',
    'aniversario',
    'corporativo',
    'infantil',
    'otro'
);

CREATE TYPE estado_evento_enum AS ENUM (
    'borrador',
    'activo',
    'finalizado',
    'cancelado'
);

CREATE TYPE prioridad_enum AS ENUM (
    'baja',
    'media',
    'alta'
);

CREATE TYPE accion_log_enum AS ENUM (
    'login',
    'logout',
    'registro',
    'crear_evento',
    'editar_evento',
    'eliminar_evento',
    'agregar_contacto',
    'editar_contacto',
    'eliminar_contacto',
    'asignar_tarea',
    'completar_tarea',
    'enviar_invitacion',
    'confirmar_rsvp',
    'rechazar_rsvp',
    'ver_catalogo',
    'editar_perfil',
    'subir_imagen',
    'solicitar_reserva',
    'encuesta_enviada',
    'intento_login_fallido'
);

-- ============================================================
-- 1. USUARIOS
-- ============================================================

CREATE TABLE usuarios (
    id                  BIGSERIAL       PRIMARY KEY,
    uuid                UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    -- Datos personales
    nombres             VARCHAR(100)    NOT NULL,
    apellidos           VARCHAR(100)    NOT NULL,
    fecha_nacimiento    DATE            NOT NULL,
    genero              genero_enum     NOT NULL DEFAULT 'prefiero_no_decir',

    -- Contacto
    correo              VARCHAR(255)    NOT NULL UNIQUE,
    telefono            VARCHAR(20),
    ciudad_residencia   VARCHAR(100),

    -- Autenticación
    password_hash       VARCHAR(255)    NOT NULL,   -- bcrypt/scrypt hash
    intentos_fallidos   SMALLINT        NOT NULL DEFAULT 0,
    bloqueado_hasta     TIMESTAMPTZ,               -- bloqueo 15 min tras 5 intentos (RF-02)
    correo_verificado   BOOLEAN         NOT NULL DEFAULT FALSE,
    token_verificacion  VARCHAR(255),

    -- Foto de perfil (doble formato: binario + URL)
    foto_perfil_data    BYTEA,                     -- imagen binaria (acceso local)
    foto_perfil_url     TEXT,                      -- URL pública (MinIO/CDN)
    foto_perfil_mime    VARCHAR(50),               -- ej. 'image/jpeg'

    -- Estado
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,

    -- Auditoría
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Índices de usuarios
CREATE INDEX idx_usuarios_correo       ON usuarios (correo);
CREATE INDEX idx_usuarios_uuid         ON usuarios (uuid);
CREATE INDEX idx_usuarios_ciudad       ON usuarios (ciudad_residencia);
CREATE INDEX idx_usuarios_activo       ON usuarios (activo);

-- ============================================================
-- 2. EVENTOS (PROYECTOS DE FIESTA)
-- ============================================================

CREATE TABLE eventos (
    id                  BIGSERIAL           PRIMARY KEY,
    uuid                UUID                NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    -- Datos del evento
    nombre              VARCHAR(200)        NOT NULL,
    tipo                tipo_evento_enum    NOT NULL DEFAULT 'otro',
    descripcion         TEXT,
    fecha_evento        DATE                NOT NULL,
    hora_inicio         TIME,
    hora_fin            TIME,

    -- Lugar
    lugar_nombre        VARCHAR(200),
    lugar_direccion     TEXT,
    lugar_ciudad        VARCHAR(100),
    lugar_coordenadas   GEOGRAPHY(POINT, 4326),    -- PostGIS: lat/lon

    -- Configuración
    num_invitados_est   INT                 DEFAULT 0,
    presupuesto_limite  NUMERIC(12, 2)      DEFAULT 0,
    lugar_cerrado       BOOLEAN             DEFAULT TRUE,   -- cerrado/abierto (RF-05)
    estado              estado_evento_enum  NOT NULL DEFAULT 'borrador',

    -- Imagen de portada (doble formato)
    portada_data        BYTEA,
    portada_url         TEXT,
    portada_mime        VARCHAR(50),

    -- Relación
    anfitrion_id        BIGINT              NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Auditoría
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eventos_anfitrion     ON eventos (anfitrion_id);
CREATE INDEX idx_eventos_fecha         ON eventos (fecha_evento);
CREATE INDEX idx_eventos_estado        ON eventos (estado);
CREATE INDEX idx_eventos_tipo          ON eventos (tipo);
CREATE INDEX idx_eventos_coordenadas   ON eventos USING GIST (lugar_coordenadas);

-- ============================================================
-- 3. PARTICIPANTES DEL EVENTO (Invitados y Colaboradores)
-- ============================================================

CREATE TABLE evento_participantes (
    id                  BIGSERIAL           PRIMARY KEY,

    evento_id           BIGINT              NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,

    -- El participante puede o no ser usuario registrado
    usuario_id          BIGINT              REFERENCES usuarios(id) ON DELETE SET NULL,

    -- Datos manuales si no está registrado (RF-06)
    nombre_contacto     VARCHAR(200),
    correo_contacto     VARCHAR(255),
    telefono_contacto   VARCHAR(20),

    -- Rol dentro del evento
    rol                 rol_evento_enum     NOT NULL DEFAULT 'invitado',

    -- RSVP (RF-19)
    estado_rsvp         estado_rsvp_enum    NOT NULL DEFAULT 'pendiente',
    token_rsvp          VARCHAR(255)        UNIQUE,         -- enlace único de confirmación
    rsvp_respondido_en  TIMESTAMPTZ,

    -- Auditoría
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_evento_correo UNIQUE (evento_id, correo_contacto)
);

CREATE INDEX idx_participantes_evento  ON evento_participantes (evento_id);
CREATE INDEX idx_participantes_usuario ON evento_participantes (usuario_id);
CREATE INDEX idx_participantes_rol     ON evento_participantes (rol);
CREATE INDEX idx_participantes_rsvp    ON evento_participantes (estado_rsvp);
CREATE INDEX idx_participantes_token   ON evento_participantes (token_rsvp);

-- ============================================================
-- 4. TAREAS / CHECKLIST DEL EVENTO
-- ============================================================

CREATE TABLE tareas (
    id                  BIGSERIAL           PRIMARY KEY,
    uuid                UUID                NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    evento_id           BIGINT              NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    asignado_a_id       BIGINT              REFERENCES evento_participantes(id) ON DELETE SET NULL,

    -- Datos de la tarea
    titulo              VARCHAR(300)        NOT NULL,
    descripcion         TEXT,
    prioridad           prioridad_enum      NOT NULL DEFAULT 'media',
    estado              estado_tarea_enum   NOT NULL DEFAULT 'pendiente',
    fecha_limite        DATE,

    -- Es sugerida por la IA o por el anfitrión
    es_sugerida_ia      BOOLEAN             NOT NULL DEFAULT FALSE,

    -- Evidencia (imagen al completar) (RF-12) - doble formato
    evidencia_data      BYTEA,
    evidencia_url       TEXT,
    evidencia_mime      VARCHAR(50),

    -- Auditoría
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tareas_evento         ON tareas (evento_id);
CREATE INDEX idx_tareas_asignado       ON tareas (asignado_a_id);
CREATE INDEX idx_tareas_estado         ON tareas (estado);
CREATE INDEX idx_tareas_fecha_limite   ON tareas (fecha_limite);

-- ============================================================
-- 5. CATÁLOGO DE SALONES / ESPACIOS (RF-14, RF-15)
-- ============================================================

CREATE TABLE salones (
    id                  BIGSERIAL       PRIMARY KEY,
    uuid                UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    nombre              VARCHAR(200)    NOT NULL,
    descripcion         TEXT,
    direccion           TEXT,
    ciudad              VARCHAR(100),
    coordenadas         GEOGRAPHY(POINT, 4326),    -- PostGIS

    capacidad_min       INT             DEFAULT 0,
    capacidad_max       INT             DEFAULT 0,
    precio_por_hora     NUMERIC(10, 2),
    precio_evento       NUMERIC(10, 2),

    -- Servicios incluidos
    incluye_catering    BOOLEAN         DEFAULT FALSE,
    incluye_decoracion  BOOLEAN         DEFAULT FALSE,
    incluye_audio       BOOLEAN         DEFAULT FALSE,
    incluye_iluminacion BOOLEAN         DEFAULT FALSE,
    estacionamiento     BOOLEAN         DEFAULT FALSE,
    acceso_discapacidad BOOLEAN         DEFAULT FALSE,

    -- Contacto del proveedor
    contacto_nombre     VARCHAR(200),
    contacto_correo     VARCHAR(255),
    contacto_telefono   VARCHAR(20),

    -- Estado
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,

    -- Auditoría
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salones_ciudad        ON salones (ciudad);
CREATE INDEX idx_salones_capacidad     ON salones (capacidad_max);
CREATE INDEX idx_salones_precio        ON salones (precio_evento);
CREATE INDEX idx_salones_coordenadas   ON salones USING GIST (coordenadas);
CREATE INDEX idx_salones_activo        ON salones (activo);

-- ============================================================
-- 6. IMÁGENES DE SALONES (galería - RF-15)
-- ============================================================

CREATE TABLE salon_imagenes (
    id                  BIGSERIAL       PRIMARY KEY,
    salon_id            BIGINT          NOT NULL REFERENCES salones(id) ON DELETE CASCADE,

    -- Doble formato: binario + URL
    imagen_data         BYTEA,
    imagen_url          TEXT            NOT NULL,
    imagen_mime         VARCHAR(50)     NOT NULL DEFAULT 'image/jpeg',
    es_portada          BOOLEAN         NOT NULL DEFAULT FALSE,
    orden               SMALLINT        NOT NULL DEFAULT 0,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salon_imagenes_salon  ON salon_imagenes (salon_id);

-- ============================================================
-- 7. RECOMENDACIONES DE IA (RF-16, RF-05)
-- ============================================================

CREATE TABLE recomendaciones_ia (
    id                  BIGSERIAL       PRIMARY KEY,
    evento_id           BIGINT          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,

    -- Tipo: 'comida', 'presupuesto', 'checklist', 'lugar'
    tipo                VARCHAR(50)     NOT NULL,

    -- Payload completo devuelto por la IA (JSON)
    contenido_json      JSONB           NOT NULL DEFAULT '{}',

    -- Texto legible para mostrar al usuario
    resumen             TEXT,

    -- ¿Fue generado por IA o por fórmulas locales?
    fuente              VARCHAR(20)     NOT NULL DEFAULT 'ia',  -- 'ia' | 'formulas'

    -- Ajustes manuales del usuario sobre la recomendación
    ajustado_manual     BOOLEAN         NOT NULL DEFAULT FALSE,
    ajuste_json         JSONB,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recom_evento          ON recomendaciones_ia (evento_id);
CREATE INDEX idx_recom_tipo            ON recomendaciones_ia (tipo);

-- ============================================================
-- 8. PRESUPUESTO POR CATEGORÍAS (RF-17)
-- ============================================================

CREATE TABLE presupuesto_categorias (
    id                  BIGSERIAL       PRIMARY KEY,
    evento_id           BIGINT          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,

    categoria           VARCHAR(100)    NOT NULL,   -- 'lugar','comida','decoracion','bebidas','otros'
    monto_estimado      NUMERIC(12, 2)  NOT NULL DEFAULT 0,
    monto_real          NUMERIC(12, 2)  DEFAULT 0,
    notas               TEXT,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_evento_categoria UNIQUE (evento_id, categoria)
);

CREATE INDEX idx_presupuesto_evento    ON presupuesto_categorias (evento_id);

-- ============================================================
-- 9. INVITACIONES DIGITALES (RF-18)
-- ============================================================

CREATE TABLE invitaciones (
    id                  BIGSERIAL       PRIMARY KEY,
    uuid                UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    evento_id           BIGINT          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    participante_id     BIGINT          NOT NULL REFERENCES evento_participantes(id) ON DELETE CASCADE,

    -- Control de envío
    enviada             BOOLEAN         NOT NULL DEFAULT FALSE,
    enviada_en          TIMESTAMPTZ,
    intentos_envio      SMALLINT        NOT NULL DEFAULT 0,  -- máx 3 reintentos (RNF-14)
    ultimo_intento      TIMESTAMPTZ,
    error_envio         TEXT,

    -- Plantilla usada
    plantilla           VARCHAR(100)    NOT NULL DEFAULT 'default',

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitaciones_evento        ON invitaciones (evento_id);
CREATE INDEX idx_invitaciones_participante  ON invitaciones (participante_id);
CREATE INDEX idx_invitaciones_enviada       ON invitaciones (enviada);

-- ============================================================
-- 10. COLA DE CORREOS (Job Queue en PostgreSQL) (RNF-14)
-- ============================================================

CREATE TABLE cola_correos (
    id                  BIGSERIAL       PRIMARY KEY,

    -- Destinatario
    destinatario_email  VARCHAR(255)    NOT NULL,
    destinatario_nombre VARCHAR(200),

    -- Contenido
    asunto              VARCHAR(500)    NOT NULL,
    cuerpo_html         TEXT            NOT NULL,

    -- Estado de la cola
    estado              VARCHAR(20)     NOT NULL DEFAULT 'pendiente', -- pendiente/procesando/enviado/fallido
    intentos            SMALLINT        NOT NULL DEFAULT 0,
    max_intentos        SMALLINT        NOT NULL DEFAULT 3,
    siguiente_intento   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    enviado_en          TIMESTAMPTZ,
    error               TEXT,

    -- Referencia opcional
    tipo_referencia     VARCHAR(50),    -- 'invitacion', 'tarea', 'rsvp', etc.
    referencia_id       BIGINT,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cola_correos_estado       ON cola_correos (estado);
CREATE INDEX idx_cola_correos_siguiente    ON cola_correos (siguiente_intento) WHERE estado = 'pendiente';

-- ============================================================
-- 11. ENCUESTA POST-EVENTO (RF-21)
-- ============================================================

CREATE TABLE encuestas_post_evento (
    id                  BIGSERIAL       PRIMARY KEY,
    evento_id           BIGINT          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    usuario_id          BIGINT          REFERENCES usuarios(id) ON DELETE SET NULL,

    puntuacion          SMALLINT        NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    sugerencias         TEXT,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_encuestas_evento      ON encuestas_post_evento (evento_id);

-- ============================================================
-- 12. ÁLBUM COLABORATIVO (imágenes del evento) (RF-12)
-- ============================================================

CREATE TABLE album_evento (
    id                  BIGSERIAL       PRIMARY KEY,
    evento_id           BIGINT          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    subida_por_id       BIGINT          REFERENCES evento_participantes(id) ON DELETE SET NULL,

    -- Doble formato
    imagen_data         BYTEA,
    imagen_url          TEXT            NOT NULL,
    imagen_mime         VARCHAR(50)     NOT NULL DEFAULT 'image/jpeg',

    descripcion         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_album_evento          ON album_evento (evento_id);

-- ============================================================
-- 13. SOLICITUDES DE RESERVA DE SALÓN (RF-15)
-- ============================================================

CREATE TABLE solicitudes_reserva (
    id                  BIGSERIAL       PRIMARY KEY,
    uuid                UUID            NOT NULL DEFAULT gen_random_uuid() UNIQUE,

    evento_id           BIGINT          NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    salon_id            BIGINT          NOT NULL REFERENCES salones(id) ON DELETE CASCADE,
    solicitante_id      BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    mensaje             TEXT,
    estado              VARCHAR(30)     NOT NULL DEFAULT 'enviada',  -- enviada/vista/confirmada/rechazada
    correo_enviado      BOOLEAN         NOT NULL DEFAULT FALSE,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reservas_evento       ON solicitudes_reserva (evento_id);
CREATE INDEX idx_reservas_salon        ON solicitudes_reserva (salon_id);

-- ============================================================
-- 14. TOKENS JWT / SESIONES ACTIVAS (RF-02)
-- ============================================================

CREATE TABLE sesiones (
    id                  BIGSERIAL       PRIMARY KEY,
    usuario_id          BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    token_hash          VARCHAR(255)    NOT NULL UNIQUE,  -- hash del JWT
    refresh_token_hash  VARCHAR(255),
    ip_origen           INET,
    user_agent          TEXT,

    expira_en           TIMESTAMPTZ     NOT NULL,
    activa              BOOLEAN         NOT NULL DEFAULT TRUE,
    revocada_en         TIMESTAMPTZ,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sesiones_usuario      ON sesiones (usuario_id);
CREATE INDEX idx_sesiones_token        ON sesiones (token_hash);
CREATE INDEX idx_sesiones_activa       ON sesiones (activa) WHERE activa = TRUE;

-- ============================================================
-- 15. REGISTRO DE LOGS DE AUDITORÍA (RNF)
--     Quién inicia sesión, qué hace y a qué hora se va
-- ============================================================

CREATE TABLE logs_auditoria (
    id                  BIGSERIAL           PRIMARY KEY,

    -- Quién
    usuario_id          BIGINT              REFERENCES usuarios(id) ON DELETE SET NULL,
    usuario_correo      VARCHAR(255),       -- guardamos el correo por si se elimina el usuario
    usuario_nombre      VARCHAR(200),

    -- Qué
    accion              accion_log_enum     NOT NULL,
    descripcion         TEXT,               -- detalle legible de la acción
    modulo              VARCHAR(100),       -- 'autenticacion','eventos','tareas','catalogo', etc.

    -- Referencia opcional al registro afectado
    entidad_tipo        VARCHAR(100),       -- 'evento', 'tarea', 'invitacion', etc.
    entidad_id          BIGINT,

    -- Contexto técnico
    ip_origen           INET,
    user_agent          TEXT,
    metodo_http         VARCHAR(10),        -- GET, POST, PUT, DELETE
    endpoint            VARCHAR(500),
    codigo_respuesta    SMALLINT,           -- 200, 401, 500, etc.

    -- Resultado
    exitoso             BOOLEAN             NOT NULL DEFAULT TRUE,
    mensaje_error       TEXT,

    -- Cuándo
    creado_en           TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas frecuentes en logs
CREATE INDEX idx_logs_usuario          ON logs_auditoria (usuario_id);
CREATE INDEX idx_logs_accion           ON logs_auditoria (accion);
CREATE INDEX idx_logs_creado_en        ON logs_auditoria (creado_en DESC);
CREATE INDEX idx_logs_modulo           ON logs_auditoria (modulo);
CREATE INDEX idx_logs_entidad          ON logs_auditoria (entidad_tipo, entidad_id);
CREATE INDEX idx_logs_exitoso          ON logs_auditoria (exitoso);
-- Índice parcial para logins fallidos (muy consultado en seguridad)
CREATE INDEX idx_logs_fallos_login     ON logs_auditoria (usuario_correo, creado_en DESC)
    WHERE accion = 'intento_login_fallido';

-- ============================================================
-- 16. NOTIFICACIONES IN-APP (WebSocket + historial)
-- ============================================================

CREATE TABLE notificaciones (
    id                  BIGSERIAL       PRIMARY KEY,
    usuario_id          BIGINT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    titulo              VARCHAR(300)    NOT NULL,
    cuerpo              TEXT,
    tipo                VARCHAR(50)     NOT NULL DEFAULT 'info',  -- info/tarea/rsvp/alerta

    -- Referencia al objeto que la generó
    entidad_tipo        VARCHAR(100),
    entidad_id          BIGINT,

    leida               BOOLEAN         NOT NULL DEFAULT FALSE,
    leida_en            TIMESTAMPTZ,

    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario    ON notificaciones (usuario_id);
CREATE INDEX idx_notificaciones_leida      ON notificaciones (usuario_id, leida) WHERE leida = FALSE;

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'usuarios',
        'eventos',
        'evento_participantes',
        'tareas',
        'salones',
        'recomendaciones_ia',
        'presupuesto_categorias',
        'invitaciones',
        'cola_correos',
        'solicitudes_reserva'
    ]
    LOOP
        EXECUTE FORMAT(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();',
            t, t
        );
    END LOOP;
END;
$$;

-- ============================================================
-- VISTA ÚTIL: Resumen de RSVP por evento
-- ============================================================

CREATE OR REPLACE VIEW v_rsvp_resumen AS
SELECT
    e.id            AS evento_id,
    e.nombre        AS evento_nombre,
    COUNT(*)                                                AS total_participantes,
    COUNT(*) FILTER (WHERE ep.estado_rsvp = 'confirmado')  AS confirmados,
    COUNT(*) FILTER (WHERE ep.estado_rsvp = 'pendiente')   AS pendientes,
    COUNT(*) FILTER (WHERE ep.estado_rsvp = 'rechazado')   AS rechazados,
    COUNT(*) FILTER (WHERE ep.rol = 'colaborador')         AS colaboradores,
    COUNT(*) FILTER (WHERE ep.rol = 'invitado')            AS invitados
FROM eventos e
JOIN evento_participantes ep ON ep.evento_id = e.id
GROUP BY e.id, e.nombre;

-- ============================================================
-- VISTA ÚTIL: Actividad reciente de un usuario (últimos logs)
-- ============================================================

CREATE OR REPLACE VIEW v_actividad_usuario AS
SELECT
    la.usuario_id,
    la.usuario_correo,
    la.usuario_nombre,
    la.accion,
    la.modulo,
    la.descripcion,
    la.ip_origen,
    la.exitoso,
    la.creado_en
FROM logs_auditoria la
ORDER BY la.creado_en DESC;

-- ============================================================
-- DATOS DE EJEMPLO: Tipos de evento → checklist predefinida
-- ============================================================

CREATE TABLE checklist_plantillas (
    id              BIGSERIAL       PRIMARY KEY,
    tipo_evento     tipo_evento_enum NOT NULL,
    orden           SMALLINT        NOT NULL DEFAULT 0,
    titulo_tarea    VARCHAR(300)    NOT NULL,
    descripcion     TEXT,
    dias_antes      INT             DEFAULT 7,  -- cuántos días antes del evento asignar la tarea

    CONSTRAINT uq_plantilla UNIQUE (tipo_evento, titulo_tarea)
);

INSERT INTO checklist_plantillas (tipo_evento, orden, titulo_tarea, descripcion, dias_antes) VALUES
-- Cumpleaños
('cumpleanos', 1,  'Definir lista de invitados',        'Decidir cuántas personas y quiénes asistirán', 30),
('cumpleanos', 2,  'Reservar el lugar',                 'Confirmar disponibilidad y costo del salón', 21),
('cumpleanos', 3,  'Enviar invitaciones',               'Enviar invitaciones digitales con enlace RSVP', 14),
('cumpleanos', 4,  'Contratar pastel',                  'Elegir sabor, tamaño y decoración del pastel', 14),
('cumpleanos', 5,  'Organizar decoración',              'Globos, manteles, centros de mesa, etc.', 7),
('cumpleanos', 6,  'Comprar comida y bebida',           'Basado en el conteo de confirmados', 3),
('cumpleanos', 7,  'Preparar música o playlist',        'Playlist o contratar DJ/grupo musical', 7),
('cumpleanos', 8,  'Confirmar asistencia de invitados', 'Revisar panel RSVP y hacer seguimiento', 2),
-- Boda
('boda', 1,  'Definir fecha y presupuesto',             'Fechas tentativas y límite de gasto total', 180),
('boda', 2,  'Reservar salón de eventos',               'Confirmar capacidad y servicios incluidos', 150),
('boda', 3,  'Contratar fotógrafo y video',             'Solicitar portafolios y cotizaciones', 120),
('boda', 4,  'Elegir menú con catering',                'Prueba de menú y definición de opciones', 90),
('boda', 5,  'Enviar invitaciones formales',            'Invitaciones con enlace RSVP y detalles', 60),
('boda', 6,  'Confirmar proveedores',                   'DJ, decoración, flores, transporte', 30),
('boda', 7,  'Ensayo general',                          'Coordinación de la ceremonia y recepción', 7),
-- Despedida
('despedida', 1, 'Elegir tipo de festejo',              'Bar, restaurante, actividad al aire libre, etc.', 14),
('despedida', 2, 'Confirmar lugar y reservación',       'Verificar disponibilidad y capacidad', 10),
('despedida', 3, 'Recolectar aportación de invitados',  'Coordinar pago del regalo o fondo compartido', 10),
('despedida', 4, 'Comprar regalo o experiencia',        'Con base en los gustos del homenajeado', 7),
('despedida', 5, 'Enviar invitaciones',                 'Invitar al grupo y confirmar asistencia', 7),
('despedida', 6, 'Preparar sorpresa o discurso',        'Mensaje especial para el homenajeado', 1);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

-- Verificación rápida de tablas creadas
SELECT
    tablename AS tabla,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS tamano
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
