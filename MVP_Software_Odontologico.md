# Software de Gestión Odontológica con IA — Documento de Referencia MVP

> **Propósito de este documento:** Briefing técnico completo para el equipo de desarrollo. Describe la arquitectura, módulos, lógica de negocio y restricciones del MVP v1 del SaaS. Sirve como fuente de verdad para Claude Code y el equipo de desarrollo.

---

## 1. Visión General del Producto

### Qué es
Un SaaS **exclusivamente web** de gestión para consultorios y clínicas odontológicas pequeñas y medianas. Su diferenciador principal es un **asistente de inteligencia artificial integrado** que opera sobre los datos reales del consultorio.

### A quién va dirigido
Consultorios odontológicos pequeños y medianos que hoy operan con papel, Excel o software básico, y para quienes las plataformas enterprise (Dentix, Sonrise, etc.) son demasiado costosas.

### Por qué es diferente
La IA **no es un add-on**; es el núcleo del producto. El asistente puede leer y escribir sobre los datos del sistema (citas, inventario, pacientes, caja, doctores, procedimientos) usando lenguaje natural. Sin este módulo, el producto no tiene propuesta de valor diferencial.

### Plataforma
Web únicamente. Sin apps móviles en v1.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│              INTERFAZ WEB — Odontólogo / Administrador              │
│  Dashboard | Agendamiento | Historia Clínica | Inventario |         │
│  Caja | Administración | Asistente IA                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    CUMPLIMIENTO LEGAL (No Negociable)               │
│  RIPS JSON (Res. 2275/2023) | Facturación Electrónica (Siigo/Alegra)│
│  Habeas Data (Ley 1581/2012) — Consentimiento + Cifrado BD          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                         MÓDULOS CORE                                │
│  Core Clínico | Gestión Administrativa | Administración del Sistema │
│  Asistente IA Admin                                                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│              CAPA DE DATOS E INTEGRACIONES EXTERNAS                 │
│  DB Pacientes | DB Citas | DB Inventario | DB Caja | DB Historias   │
│  DB Procedimientos | DB Doctores | WhatsApp Bot | Siigo/Alegra      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cumplimiento legal — bloqueantes para comercializar

Estos tres módulos deben estar implementados antes de vender el producto en Colombia. Sin ellos, el producto no puede venderse legalmente:

| Módulo | Norma | Descripción |
|---|---|---|
| RIPS JSON | Resolución 2275/2023 | Exportador de registros individuales de prestación de servicios de salud en formato JSON |
| Facturación Electrónica | DIAN | Integración vía API con Siigo o Alegra |
| Habeas Data | Ley 1581/2012 | Consentimiento de pacientes + cifrado de datos sensibles en BD |

---

## 3. Módulos del MVP — Detalle Funcional

### 3.1 Módulo: Agendamiento de Citas

#### UI — Formulario de Nueva Cita

| Campo | Tipo | Fuente de datos |
|---|---|---|
| Paciente | Dropdown con buscador | DB Pacientes |
| Procedimiento | Dropdown | DB Procedimientos (desde Administración) |
| Doctor | Dropdown | DB Doctores (desde Administración) |
| Fecha | Selector de fecha (calendario propio) | — |
| Hora | Selector de franja horaria disponible | Calculado: horas sin citas para ese doctor ese día |

- El campo **Paciente** tiene una opción anclada "+ Añadir nuevo" que expande campos inline: nombre, teléfono, cédula.
- Botones: **Guardar Cita** / **Cancelar Cita**.

#### Lógica al Guardar

1. Validar: paciente seleccionado (o campos nuevos llenos), procedimiento, doctor, fecha y hora.
2. Si el paciente es nuevo:
   - Crear registro en DB Pacientes.
   - Crear Historia Clínica vacía para ese paciente.
   - Usar el ID generado para la cita.
3. Insertar cita en DB Citas (paciente, doctor, procedimiento, fecha, hora).
4. Actualizar la vista del calendario.
5. Encolar recordatorio WhatsApp para `t = hora_cita - 24h`.

#### Lógica al Cancelar

1. Eliminar de DB Citas.
2. Actualizar el calendario.
3. Si el recordatorio WhatsApp aún no fue enviado, cancelar el job de la cola.

#### Calendario Propio

- Vistas: mensual / semanal / diaria.
- Muestra citas con: nombre del paciente + procedimiento + doctor asignado.
- Al seleccionar fecha → sistema muestra franjas horarias disponibles (excluyendo horas ya ocupadas para ese doctor ese día).
- Click en cita existente → panel de detalle: paciente, procedimiento, doctor, hora + botón Cancelar.

**Fuera del alcance MVP:** estados de cita, notas por cita, duración por procedimiento, múltiples usuarios/roles. → v2+: estados, duraciones, vistas por doctor, código de color por procedimiento, drag & drop para reagendar.

#### Automatización — Recordatorio WhatsApp

```
Al crear cita → encolar job para t = hora_cita - 24h
↓
Job Scheduler revisa cola cada hora
↓
Si t-24h ha llegado → enviar mensaje vía WhatsApp Business API
  "Hola [nombre], le recordamos su cita mañana [fecha] a las [hora]
   con el Dr. [doctor]. Procedimiento: [proc]."
↓
Si cita cancelada antes → eliminar job de la cola
```

**Integraciones:** WhatsApp Business API, DB Citas, DB Pacientes, DB Procedimientos, DB Doctores, DB Historias, Módulo Administración.

---

### 3.2 Módulo: Historia Clínica + Odontograma

#### Puntos de Acceso

- **Búsqueda global:** barra buscadora → seleccionar paciente → abrir Historia Clínica.
- **Desde calendario:** click en cita agendada → botón "Ver Historia Clínica del Paciente".
- **Creación automática:** al agendar un paciente nuevo, se crea una Historia Clínica vacía automáticamente.

#### Ficha del Paciente

**Datos personales:** Nombres | Apellidos | Nº de identificación | Teléfono | Fecha de nacimiento | Correo | Dirección.

**Menores de edad:** campos adicionales de "Acudiente": Nombre | Relación | Teléfono.

**Acciones disponibles:** [Editar Datos] | [Exportar HC a PDF] | [Ver Archivos].

**v2+:** Firma digital, consentimientos, seguro médico, historial de pagos.

#### Odontograma Interactivo

- Representación gráfica de **32 piezas dentales**.
  - Superior: 18–11 | 21–28
  - Inferior: 48–41 | 31–38
- Cada pieza es clicable; color según su estado principal.

**Estados por pieza:** Sano | Caries | Obturación | Corona | Endodoncia | Implante | Ausente | Extraído | Fractura.

**Anotación por superficie:** Al hacer click en una pieza → panel con 5 superficies: Oclusal | Mesial | Distal | Vestibular | Lingual/Palatina. Cada superficie tiene su propio estado independiente. Se permiten múltiples anotaciones simultáneas.

**Panel de detalle (al hacer click en pieza):**
- Diagrama de 5 superficies.
- Selector de estado por superficie.
- Campo de nota libre.
- Botón Guardar cambios.
- Historial de cambios de esa pieza.

**v2+:** Periodontograma, integración DICOM, Rayos X intraoral.

#### Timeline de Tratamiento + Notas Clínicas

**Timeline cronológica:** lista de eventos ordenados por fecha descendente:
- Citas realizadas
- Notas clínicas
- Archivos subidos
- Cambios en odontograma

**Tipos de Nota Clínica:** Nota de Ingreso | Nota de Evolución | Nota de Procedimiento | Nota de Interconsulta | Nota de Egreso. Cada una incluye: fecha, doctor, tipo y contenido libre.

**Formulario Nueva Nota:** selector de tipo + campo texto libre + fecha auto (hoy) + botón Guardar.

**Exportación a PDF:** genera documento estructurado con datos del paciente + antecedentes médicos + odontograma (imagen) + timeline completa + archivos adjuntos (referenciados).

**v2+:** Firma digital en notas, plantillas por tipo de nota.

#### Archivos Adjuntos

- **Formatos MVP:** PDF e imágenes (JPG, PNG).
- Asociados a la HC del paciente.
- Etiqueta opcional (ej: "Rx panorámica").
- Vista: galería/lista ordenada por fecha. Botones: Ver | Descargar | Eliminar.
- Aparece en el timeline del paciente.

#### Habeas Data (Ley 1581)

- Datos sensibles cifrados en BD.
- Se puede crear paciente sin consentimiento, pero debe marcarse con un **warning visible**.
- El paciente tiene derecho a exportar y eliminar sus datos (botón disponible en la ficha).

**Integraciones:** DB Historias, DB Pacientes, DB Notas, DB Odontograma, DB Archivos, Módulo Agendamiento (crea HC vacía), RIPS/Facturación (datos de procedimientos), Asistente IA (consulta HC en solo lectura).

---

### 3.3 Módulo: Inventario

#### UI — Vista Principal

**Tabla de Insumos:** columnas Nombre | SKU | Categoría | Cantidad | Unidad | Stock Mínimo | Estado. Filtro por categoría. Buscador por nombre o SKU.

**Panel de Alertas:** sección visible con badge "X insumos bajo stock mínimo". Lista los insumos en alerta con cantidad actual vs. mínimo.

**Acciones por fila:** [Editar] | [Actualizar Stock] | [Desactivar].

#### Formulario: Añadir / Editar Insumo

| Campo | Detalle |
|---|---|
| Nombre comercial | Obligatorio |
| Nombre genérico | Opcional |
| Código interno | Se crea por defecto (SKU obligatorio y único) |
| Categoría | Dropdown: Material restaurativo / Instrumental desechable / Medicamento / Bioseguridad / Ortodoncia / Endodoncia / Otro (campo abierto) |
| Cantidad actual | Obligatorio, >= 0 |
| Unidad de medida | Dropdown: Unidad / Caja / Paquete / Frasco / Tubo / mL / g |
| Stock mínimo | Obligatorio |

**Regla:** No se elimina, solo se desactiva.

#### Control de Stock y Alertas

**Actualización manual:** botón "Actualizar Stock" por insumo → modal con campo nueva cantidad o suma/resta de unidades. Guarda con fecha y hora (log interno).

**Lógica de alerta:** cada vez que se actualiza la cantidad:
- Si `cantidad_actual < stock_mínimo` → marcar insumo como EN ALERTA → badge warning en módulo → aparece en panel de alertas.

**Notificación en plataforma:** badge naranja/rojo visible en el ícono del módulo Inventario desde cualquier pantalla. No es push/email en MVP. v2+: WhatsApp o email al admin.

#### Interacción con Asistente IA

**El agente puede LEER:**
- "¿Cuánta resina Filtek queda?"
- "¿Qué insumos están bajo stock mínimo?"
- "¿Cuántas cajas de guantes hay?"
- "Lista los medicamentos disponibles"

**El agente puede ESCRIBIR (siempre con confirmación del usuario):**
- "Actualiza la anestesia a 30 frascos" → IA interpreta → plantea cambio → espera confirmación → ejecuta UPDATE en DB → confirma con nuevo valor.

**Fuera de alcance MVP:** generar órdenes de compra, predecir consumo. v2+: descuento automático al registrar procedimiento (requiere módulo Protocolos).

**Integraciones:** DB Inventario, DB Categorías Insumos, Asistente IA (lee y escribe), RIPS/Facturación (insumos en reportes).

---

### 3.4 Módulo: Caja

#### UI — Vista Principal

**Tabla de Registros:** columnas Paciente | Total | Abonado | Saldo | Estado | Fecha | Acciones. Filtro: Pagado / Pendiente / Abono parcial. Buscador por nombre de paciente.

**Estados de un Registro:**
- **Pendiente:** saldo > 0, sin abonos.
- **Abono parcial:** pagos parciales registrados.
- **Pagado:** saldo = 0. Actualización automática según abonos.

**Acciones:** [+ Nuevo Registro] | [Ver Detalle / Abonos] | [Registrar Abono] | [Editar Total].

#### Creación de Registro de Caja

**Campos del formulario:**
- Paciente (dropdown con buscador) — Obligatorio.
- Descripción (texto libre) — Obligatoria.
- Total a cobrar — Obligatorio, > 0.
- Forma de pago inicial (dropdown: Efectivo / Transferencia / Tarjeta débito / Tarjeta crédito).
- Monto del primer pago.

**Lógica al crear:**
1. Crear entrada en DB Caja con total y paciente.
2. Si hay pago inicial → registrar como primer abono.
3. Calcular saldo: `saldo = total - SUM(abonos)`.
4. Asignar estado automáticamente.

#### Lógica de Abonos y Saldos

**Registrar Nuevo Abono (desde vista detalle):**
- Campos: Monto del abono | Forma de pago | Fecha (auto: hoy).
- Actualiza saldo y estado automáticamente al guardar.

**Cálculo automático de estado:**
```
saldo = total - SUM(abonos)
si saldo = 0          → Estado: Pagado
si saldo < total y > 0 → Abono parcial
si ningún abono        → Pendiente
```

**Vista desde perfil del paciente:** en la Historia Clínica del paciente, sección "Caja" muestra registros activos con saldo, historial de pagos y total adeudado acumulado. Acceso rápido sin salir de la ficha.

#### Interacción con Asistente IA

**El agente puede LEER:**
- "¿Cuánto debe el paciente Juan Pérez?"
- "¿Qué pacientes tienen saldo pendiente?"
- "¿Cuánto se ha recaudado esta semana?"
- "¿Cuántos pagos en efectivo hay este mes?"

**El agente puede CREAR registros y REGISTRAR ABONOS (siempre con confirmación):**
- "Crea un registro de $150.000 para Juan Pérez por consulta" → IA muestra resumen → usuario confirma → se guarda.
- "Registra un abono de $50.000 de Juan Pérez en efectivo" → IA identifica registro activo del paciente → confirma → ejecuta abono → muestra nuevo saldo.

**Fuera de alcance MVP:** reportes automáticos generados por IA. v2+: reportes de total del día/semana/mes por forma de pago o por doctor.

**Integraciones:** DB Caja, DB Abonos, DB Pacientes, Asistente IA (lee y escribe), Historia Clínica (vista desde paciente), Facturación Electrónica (datos de pago para DIAN), RIPS (valor del servicio).

---

### 3.5 Módulo: Administración del Sistema

Este módulo es la **base de configuración** que alimenta los dropdowns de Agendamiento (doctores, procedimientos) y los reportes de RIPS/Facturación.

#### UI — Estructura

- Navegación: menú lateral o tabs.
  - > Doctores
  - > Procedimientos

#### Gestión de Doctores

**Formulario (Añadir / Editar):**
- Nombre completo — Obligatorio.
- Especialidad — Campo abierto (texto libre).
- Teléfono.
- Correo.
- Estado: Activo / Inactivo.

**Tabla de Doctores:** columnas Nombre | Especialidad | Teléfono | Estado | Acciones. Filtro: Activos / Inactivos. Búsqueda por nombre.

**Lógica de desactivar:**
- No se elimina de la BD. Cambio de estado a Inactivo.
- **Efecto:** desaparece del dropdown en Agendamiento. Las citas históricas se conservan intactas.
- **Restricción:** no se puede desactivar un doctor con citas futuras agendadas (solo desactivar cuando no tenga citas pendientes).

#### Gestión de Procedimientos

**Formulario (Añadir / Editar):**
- Nombre del procedimiento — Obligatorio y único.
- Descripción breve — Opcional.

**Tabla de Procedimientos:** columnas Nombre | Descripción | Estado | Acciones. Filtro: Activos / Inactivos. Búsqueda por nombre.

**Lógica de desactivar:** igual que doctores. No se elimina; cambia a Inactivo. Desaparece del dropdown en Agendamiento. Las citas históricas se conservan.

**Fuera de alcance MVP:** roles ni permisos por usuario, horarios por doctor, tarifas por procedimiento, múltiples sedes. v2+: tarifas, horarios, múltiples sedes.

**Integraciones internas:**
- Agendamiento: popula dropdowns de doctores y procedimientos.
- Asistente IA: puede responder "¿Qué doctores hay activos?" consultando esta BD.
- RIPS / Facturación: nombre del doctor y procedimiento en reportes.
- Historia Clínica: doctor a cargo queda en el registro.

---

### 3.6 Módulo: Asistente de IA Admin — Diferenciador #1

> Este es el módulo central de diferenciación del producto. Debe ser funcional y confiable en el MVP.

#### UI — Página Dedicada de Chat

- Ventana de chat: historial de la sesión actual. Burbujas de usuario / asistente. Indicador "escribiendo…".
- Input de mensaje: campo de texto libre. Botón Enviar. Atajo: Enter para enviar.
- **Indicador de tokens:** barra de progreso visible con "tokens usados / límite del plan actual". Alerta visual cuando se acerca al límite.
- **Modal de confirmación:** antes de ejecutar cualquier acción de escritura, el agente muestra resumen y pide confirmación explícita: "Voy a registrar X, ¿confirmas?" → [Sí, ejecutar] / [Cancelar].
- **Ejemplos de prompts** visibles en el onboarding para usuarios nuevos.

**v2+:** historial persistente entre sesiones.

#### Arquitectura del Agente

| Componente | Detalle |
|---|---|
| Modelo | Claude Sonnet (balance costo/calidad) |
| Temperatura | Baja — para respuestas administrativas precisas |
| Memoria | De sesión (dentro de la conversación actual; al cerrar, se reinicia) |
| API | Anthropic API |

**System Prompt — contexto inyectado automáticamente:**
- Datos del consultorio.
- Fecha y hora actual.
- Módulos disponibles y sus herramientas (tools).
- Instrucción de confirmación antes de escribir datos.
- Límite de tokens restante.

#### Herramientas (Tools) disponibles para el agente

```
read_pacientes         → Leer lista y datos de pacientes
read_citas             → Leer citas agendadas
read_inventario        → Leer cantidades, alertas, categorías
read_caja              → Leer registros y saldos de caja
create_paciente        → Crear nuevo paciente
create_cita            → Agendar cita
update_inventario      → Actualizar stock de insumo (con confirmación)
create_caja            → Crear registro de caja
create_abono           → Registrar abono en caja
create_doctor          → Añadir doctor
create_procedimiento   → Añadir procedimiento
```

#### Capacidades del Agente

**Puede LEER (sin confirmación):**
- Pacientes y sus datos.
- Citas agendadas.
- Inventario y alertas.
- Registros de caja y saldos.
- Doctores y procedimientos.
- Historia clínica (resumen del paciente).

**Puede ESCRIBIR (siempre con confirmación explícita del usuario):**
- Crear paciente nuevo.
- Agendar cita.
- Actualizar stock de insumo.
- Crear registro de caja.
- Registrar abono en caja.
- Añadir doctor.
- Añadir procedimiento.

**Preguntas clínicas:** el agente no está restringido para responder preguntas clínicas. Responde con conocimiento general del LLM (similar a ChatGPT). Sin grafo clínico especializado en MVP. **Disclaimer automático en toda respuesta clínica:** *"Esta respuesta es informativa, no reemplaza juicio clínico."*

**Fuera de alcance MVP:**
- Modificar Historia Clínica.
- Eliminar registros.
- Acceder a archivos adjuntos.
- Interpretar radiografías.
- v2+: IA clínica especializada, grafo de conocimiento, imagen médica.

#### Sistema de Tiers — Límites de Uso de IA

| Tier | Plan | Comportamiento al agotar tokens |
|---|---|---|
| Tier 1 — Básico | Trial / Plan Inicial | Lectura sigue funcionando. Escritura bloqueada. Mensaje: "Actualiza tu plan". Ideal para prueba gratuita. |
| Tier 2 — Estándar | Plan Principal | Alerta visible en chat. Opción de upgrade. Se reinicia el próximo ciclo. Ideal para consultorios pequeños. |
| Tier 3 — Premium | Plan de alto volumen | Acceso completo + prioridad en respuestas. Para clínicas con mayor volumen de interacciones diarias. |

*Los límites exactos de tokens por tier están pendientes de definición.*

**v2+:** historial persistente entre sesiones, acceso anticipado a funciones de IA clínica.

---

## 4. Módulos de Cumplimiento Legal (No Negociables)

### 4.1 RIPS JSON — Resolución 2275/2023

- Exportador de Registros Individuales de Prestación de Servicios de Salud.
- Formato de salida: JSON según especificación MINSALUD.
- Datos fuente: Historia Clínica, procedimientos realizados, doctor a cargo, caja (valor del servicio).

### 4.2 Facturación Electrónica

- Integración vía API con **Siigo** o **Alegra**.
- Datos fuente: módulo Caja (forma de pago, total, paciente).
- Obligatorio para operar legalmente en Colombia ante la DIAN.

### 4.3 Habeas Data — Ley 1581/2012

- **Consentimiento:** se puede crear paciente sin consentimiento pero debe marcarse con warning visible en la ficha.
- **Cifrado:** datos sensibles del paciente cifrados en BD.
- **Derechos del paciente:** botón disponible en la ficha del paciente para exportar y eliminar sus datos del sistema.

---

## 5. Base de Datos — Entidades Principales

| Entidad | Campos clave |
|---|---|
| DB Pacientes | id, nombres, apellidos, identificación, teléfono, fecha_nacimiento, correo, dirección, acudiente (si menor), consentimiento_habeas_data |
| DB Citas | id, paciente_id, doctor_id, procedimiento_id, fecha, hora, estado |
| DB Historias | id, paciente_id, fecha_creación, antecedentes |
| DB Notas | id, historia_id, doctor_id, tipo, contenido, fecha |
| DB Odontograma | id, historia_id, pieza_id, superficie, estado, nota, fecha |
| DB Archivos | id, historia_id, nombre, etiqueta, url, fecha |
| DB Inventario | id, nombre_comercial, nombre_generico, sku, categoria_id, cantidad, unidad, stock_minimo, estado, fecha_actualizacion |
| DB Categorías Insumos | id, nombre |
| DB Caja | id, paciente_id, descripcion, total, saldo, estado, fecha |
| DB Abonos | id, caja_id, monto, forma_pago, fecha |
| DB Doctores | id, nombre, especialidad, telefono, correo, estado |
| DB Procedimientos | id, nombre, descripcion, estado |

---

## 6. Integraciones Externas

| Integración | Uso | Prioridad |
|---|---|---|
| **WhatsApp Business API** | Recordatorios automáticos de citas 24h antes | MVP |
| **Siigo / Alegra (API)** | Facturación electrónica (DIAN) | MVP (legal) |
| **Anthropic API (Claude Sonnet)** | Motor del Asistente IA | MVP |
| **Google Calendar** | Sincronización del calendario de citas | Evaluando para MVP |

---

## 7. Estrategia de Go-to-Market

- **Prueba gratuita:** 7–15 días. Durante el trial, se limita el uso de tokens de IA (Tier 1 — lectura habilitada, escritura bloqueada al agotar cuota).
- **Migración de datos:** si el consultorio tiene datos digitalizados, se migra con scripts. Si es en papel, el equipo hace la migración manual como parte del onboarding.
- **Validación previa al desarrollo:** el equipo está visitando consultorios reales para validar hipótesis antes de avanzar en diseño e implementación.

---

## 8. Roadmap Post-MVP (v2+)

Los siguientes elementos están **fuera del alcance del MVP** pero documentados para informar decisiones de arquitectura:

- **IA clínica especializada:** grafo de conocimiento clínico odontológico, interpretación de radiografías e imágenes DICOM, apoyo en diagnóstico.
- **Módulo Protocolos:** asociar insumos de inventario a procedimientos. Descuento automático de stock al registrar un procedimiento. Sistema de alertas cruzando citas agendadas vs. inventario disponible.
- **Gestión de equipos médicos:** hojas de vida de equipos, mantenimientos, certificados Invima.
- **Caja avanzada:** reportes automáticos por período, comisiones, contabilidad, múltiples conceptos por registro.
- **Agendamiento avanzado:** estados de cita, duración por procedimiento, vistas por doctor con código de color, drag & drop para reagendar, múltiples roles de usuario.
- **Historia Clínica avanzada:** periodontograma, firma digital, plantillas por tipo de nota.
- **Odontograma v2:** integración DICOM, Rayos X intraoral directa en plataforma.
- **Administración avanzada:** tarifas por procedimiento, horarios por doctor, múltiples sedes, roles y permisos granulares.
- **Notificaciones:** WhatsApp o email al admin cuando hay alertas de inventario.
- **Inventario predictivo:** predicción de consumo de insumos, órdenes de compra automáticas.

---

## 9. Principios de Diseño y Desarrollo

1. **La IA es obligatoria en v1.** Sin el Asistente IA funcional, el MVP no tiene propuesta de valor diferencial. No se puede lanzar sin él.
2. **Validar antes de construir.** Las hipótesis sobre flujos clínicos y administrativos se validan con odontólogos reales antes de avanzar en diseño.
3. **Soft delete sobre hard delete.** Ninguna entidad se elimina de la BD. Doctores, procedimientos e insumos se desactivan para preservar integridad de registros históricos.
4. **Confirmación antes de escribir.** El Asistente IA nunca ejecuta una acción de escritura sin confirmación explícita del usuario.
5. **Cumplimiento legal no negociable.** RIPS, Facturación Electrónica y Habeas Data deben estar implementados antes de cualquier venta.
6. **Escalabilidad por diseño.** La arquitectura de BD y módulos debe contemplar las funcionalidades v2+ listadas en la sección 8, aunque no se implementen en el MVP.

---

*Documento generado a partir del acta de reunión del 17 de abril de 2026 y los diagramas de arquitectura del MVP v3. Equipo: Manuel, Juan Pablo (desarrollo), Daniel.*
