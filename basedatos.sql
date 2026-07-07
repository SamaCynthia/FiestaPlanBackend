-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.usuarios (
  id bigint NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  nombres character varying NOT NULL,
  apellidos character varying NOT NULL,
  fecha_nacimiento date NOT NULL,
  genero USER-DEFINED NOT NULL DEFAULT 'prefiero_no_decir'::genero_enum,
  correo character varying NOT NULL UNIQUE,
  telefono character varying,
  ciudad_residencia character varying,
  password_hash character varying NOT NULL,
  intentos_fallidos smallint NOT NULL DEFAULT 0,
  bloqueado_hasta timestamp with time zone,
  correo_verificado boolean NOT NULL DEFAULT false,
  token_verificacion character varying,
  foto_perfil_data bytea,
  foto_perfil_url text,
  foto_perfil_mime character varying,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  rol_id integer NOT NULL DEFAULT 3,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id)
);
CREATE TABLE public.eventos (
  id bigint NOT NULL DEFAULT nextval('eventos_id_seq'::regclass),
  uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  nombre character varying NOT NULL,
  tipo USER-DEFINED NOT NULL DEFAULT 'otro'::tipo_evento_enum,
  descripcion text,
  fecha_evento date NOT NULL,
  hora_inicio time without time zone,
  hora_fin time without time zone,
  lugar_nombre character varying,
  lugar_direccion text,
  lugar_ciudad character varying,
  lugar_coordenadas USER-DEFINED,
  num_invitados_est integer DEFAULT 0,
  presupuesto_limite numeric DEFAULT 0,
  lugar_cerrado boolean DEFAULT true,
  estado USER-DEFINED NOT NULL DEFAULT 'borrador'::estado_evento_enum,
  portada_data bytea,
  portada_url text,
  portada_mime character varying,
  anfitrion_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT eventos_pkey PRIMARY KEY (id),
  CONSTRAINT eventos_anfitrion_id_fkey FOREIGN KEY (anfitrion_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.evento_participantes (
  id bigint NOT NULL DEFAULT nextval('evento_participantes_id_seq'::regclass),
  evento_id bigint NOT NULL,
  usuario_id bigint,
  nombre_contacto character varying,
  correo_contacto character varying,
  telefono_contacto character varying,
  estado_rsvp USER-DEFINED NOT NULL DEFAULT 'pendiente'::estado_rsvp_enum,
  token_rsvp character varying UNIQUE,
  rsvp_respondido_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  rol_id integer NOT NULL DEFAULT 5,
  CONSTRAINT evento_participantes_pkey PRIMARY KEY (id),
  CONSTRAINT evento_participantes_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id),
  CONSTRAINT evento_participantes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT evento_participantes_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id)
);
CREATE TABLE public.tareas (
  id bigint NOT NULL DEFAULT nextval('tareas_id_seq'::regclass),
  uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  evento_id bigint NOT NULL,
  asignado_a_id bigint,
  titulo character varying NOT NULL,
  descripcion text,
  prioridad USER-DEFINED NOT NULL DEFAULT 'media'::prioridad_enum,
  estado USER-DEFINED NOT NULL DEFAULT 'pendiente'::estado_tarea_enum,
  fecha_limite date,
  es_sugerida_ia boolean NOT NULL DEFAULT false,
  evidencia_data bytea,
  evidencia_url text,
  evidencia_mime character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tareas_pkey PRIMARY KEY (id),
  CONSTRAINT tareas_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id),
  CONSTRAINT tareas_asignado_a_id_fkey FOREIGN KEY (asignado_a_id) REFERENCES public.evento_participantes(id)
);
CREATE TABLE public.salones (
  id bigint NOT NULL DEFAULT nextval('salones_id_seq'::regclass),
  uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  nombre character varying NOT NULL,
  descripcion text,
  direccion text,
  ciudad character varying,
  coordenadas USER-DEFINED,
  capacidad_min integer DEFAULT 0,
  capacidad_max integer DEFAULT 0,
  precio_por_hora numeric,
  precio_evento numeric,
  incluye_catering boolean DEFAULT false,
  incluye_decoracion boolean DEFAULT false,
  incluye_audio boolean DEFAULT false,
  incluye_iluminacion boolean DEFAULT false,
  estacionamiento boolean DEFAULT false,
  acceso_discapacidad boolean DEFAULT false,
  contacto_nombre character varying,
  contacto_correo character varying,
  contacto_telefono character varying,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT salones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.salon_imagenes (
  id bigint NOT NULL DEFAULT nextval('salon_imagenes_id_seq'::regclass),
  salon_id bigint NOT NULL,
  imagen_data bytea,
  imagen_url text NOT NULL,
  imagen_mime character varying NOT NULL DEFAULT 'image/jpeg'::character varying,
  es_portada boolean NOT NULL DEFAULT false,
  orden smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT salon_imagenes_pkey PRIMARY KEY (id),
  CONSTRAINT salon_imagenes_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salones(id)
);
CREATE TABLE public.recomendaciones_ia (
  id bigint NOT NULL DEFAULT nextval('recomendaciones_ia_id_seq'::regclass),
  evento_id bigint NOT NULL,
  tipo character varying NOT NULL,
  contenido_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  resumen text,
  fuente character varying NOT NULL DEFAULT 'ia'::character varying,
  ajustado_manual boolean NOT NULL DEFAULT false,
  ajuste_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recomendaciones_ia_pkey PRIMARY KEY (id),
  CONSTRAINT recomendaciones_ia_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id)
);
CREATE TABLE public.presupuesto_categorias (
  id bigint NOT NULL DEFAULT nextval('presupuesto_categorias_id_seq'::regclass),
  evento_id bigint NOT NULL,
  categoria character varying NOT NULL,
  monto_estimado numeric NOT NULL DEFAULT 0,
  monto_real numeric DEFAULT 0,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT presupuesto_categorias_pkey PRIMARY KEY (id),
  CONSTRAINT presupuesto_categorias_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id)
);
CREATE TABLE public.invitaciones (
  id bigint NOT NULL DEFAULT nextval('invitaciones_id_seq'::regclass),
  uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  evento_id bigint NOT NULL,
  participante_id bigint NOT NULL,
  enviada boolean NOT NULL DEFAULT false,
  enviada_en timestamp with time zone,
  intentos_envio smallint NOT NULL DEFAULT 0,
  ultimo_intento timestamp with time zone,
  error_envio text,
  plantilla character varying NOT NULL DEFAULT 'default'::character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invitaciones_pkey PRIMARY KEY (id),
  CONSTRAINT invitaciones_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id),
  CONSTRAINT invitaciones_participante_id_fkey FOREIGN KEY (participante_id) REFERENCES public.evento_participantes(id)
);
CREATE TABLE public.cola_correos (
  id bigint NOT NULL DEFAULT nextval('cola_correos_id_seq'::regclass),
  destinatario_email character varying NOT NULL,
  destinatario_nombre character varying,
  asunto character varying NOT NULL,
  cuerpo_html text NOT NULL,
  estado character varying NOT NULL DEFAULT 'pendiente'::character varying,
  intentos smallint NOT NULL DEFAULT 0,
  max_intentos smallint NOT NULL DEFAULT 3,
  siguiente_intento timestamp with time zone NOT NULL DEFAULT now(),
  enviado_en timestamp with time zone,
  error text,
  tipo_referencia character varying,
  referencia_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cola_correos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.encuestas_post_evento (
  id bigint NOT NULL DEFAULT nextval('encuestas_post_evento_id_seq'::regclass),
  evento_id bigint NOT NULL,
  usuario_id bigint,
  puntuacion smallint NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
  sugerencias text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT encuestas_post_evento_pkey PRIMARY KEY (id),
  CONSTRAINT encuestas_post_evento_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id),
  CONSTRAINT encuestas_post_evento_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.album_evento (
  id bigint NOT NULL DEFAULT nextval('album_evento_id_seq'::regclass),
  evento_id bigint NOT NULL,
  subida_por_id bigint,
  imagen_data bytea,
  imagen_url text NOT NULL,
  imagen_mime character varying NOT NULL DEFAULT 'image/jpeg'::character varying,
  descripcion text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT album_evento_pkey PRIMARY KEY (id),
  CONSTRAINT album_evento_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id),
  CONSTRAINT album_evento_subida_por_id_fkey FOREIGN KEY (subida_por_id) REFERENCES public.evento_participantes(id)
);
CREATE TABLE public.solicitudes_reserva (
  id bigint NOT NULL DEFAULT nextval('solicitudes_reserva_id_seq'::regclass),
  uuid uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  evento_id bigint NOT NULL,
  salon_id bigint NOT NULL,
  solicitante_id bigint NOT NULL,
  mensaje text,
  estado character varying NOT NULL DEFAULT 'enviada'::character varying,
  correo_enviado boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT solicitudes_reserva_pkey PRIMARY KEY (id),
  CONSTRAINT solicitudes_reserva_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos(id),
  CONSTRAINT solicitudes_reserva_salon_id_fkey FOREIGN KEY (salon_id) REFERENCES public.salones(id),
  CONSTRAINT solicitudes_reserva_solicitante_id_fkey FOREIGN KEY (solicitante_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.sesiones (
  id bigint NOT NULL DEFAULT nextval('sesiones_id_seq'::regclass),
  usuario_id bigint NOT NULL,
  token_hash character varying NOT NULL UNIQUE,
  refresh_token_hash character varying,
  ip_origen inet,
  user_agent text,
  expira_en timestamp with time zone NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  revocada_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sesiones_pkey PRIMARY KEY (id),
  CONSTRAINT sesiones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.logs_auditoria (
  id bigint NOT NULL DEFAULT nextval('logs_auditoria_id_seq'::regclass),
  usuario_id bigint,
  accion USER-DEFINED NOT NULL,
  descripcion text,
  modulo character varying,
  entidad_tipo character varying,
  entidad_id bigint,
  ip_origen inet,
  user_agent text,
  metodo_http character varying,
  endpoint character varying,
  codigo_respuesta smallint,
  exitoso boolean NOT NULL DEFAULT true,
  mensaje_error text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT logs_auditoria_pkey PRIMARY KEY (id),
  CONSTRAINT logs_auditoria_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.notificaciones (
  id bigint NOT NULL DEFAULT nextval('notificaciones_id_seq'::regclass),
  usuario_id bigint NOT NULL,
  titulo character varying NOT NULL,
  cuerpo text,
  tipo character varying NOT NULL DEFAULT 'info'::character varying,
  entidad_tipo character varying,
  entidad_id bigint,
  leida boolean NOT NULL DEFAULT false,
  leida_en timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notificaciones_pkey PRIMARY KEY (id),
  CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);
CREATE TABLE public.checklist_plantillas (
  id bigint NOT NULL DEFAULT nextval('checklist_plantillas_id_seq'::regclass),
  tipo_evento USER-DEFINED NOT NULL,
  orden smallint NOT NULL DEFAULT 0,
  titulo_tarea character varying NOT NULL,
  descripcion text,
  dias_antes integer DEFAULT 7,
  CONSTRAINT checklist_plantillas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.roles (
  id integer NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
  nombre character varying NOT NULL UNIQUE,
  descripcion text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.usuario_consentimientos (
  id bigint NOT NULL DEFAULT nextval('usuario_consentimientos_id_seq'::regclass),
  usuario_id bigint NOT NULL,
  servicio character varying NOT NULL,
  concedido boolean NOT NULL DEFAULT true,
  consentimiento_fecha timestamp with time zone NOT NULL DEFAULT now(),
  excepcion_ley boolean NOT NULL DEFAULT false,
  excepcion_documentada text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuario_consentimientos_pkey PRIMARY KEY (id),
  CONSTRAINT usuario_consentimientos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
  CONSTRAINT uq_usuario_servicio UNIQUE (usuario_id, servicio)
);


-- 1. Agregar la nueva acción de auditoría al enum existente
ALTER TYPE public.accion_log_enum ADD VALUE IF NOT EXISTS 'transferencia_datos';

-- 2. Crear la tabla de consentimientos
CREATE TABLE IF NOT EXISTS public.usuario_consentimientos (
    id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    usuario_id bigint NOT NULL,
    servicio character varying(100) NOT NULL,
    concedido boolean NOT NULL DEFAULT true,
    consentimiento_fecha timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Control de Excepción de Ley
    excepcion_ley boolean NOT NULL DEFAULT false,
    excepcion_documentada text,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Relación con usuarios y restricciones de unicidad
    CONSTRAINT usuario_consentimientos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE,
    CONSTRAINT uq_usuario_servicio UNIQUE (usuario_id, servicio)
);

-- 3. Crear índices para optimizar las búsquedas
CREATE INDEX IF NOT EXISTS idx_consentimientos_usuario ON public.usuario_consentimientos (usuario_id);
CREATE INDEX IF NOT EXISTS idx_consentimientos_servicio ON public.usuario_consentimientos (servicio);

-- 4. Asignar el trigger para mantener el campo updated_at al día
CREATE TRIGGER trg_usuario_consentimientos_updated_at
BEFORE UPDATE ON public.usuario_consentimientos
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
