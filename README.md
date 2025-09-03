# Informe técnico de revisión de app.ts
 
>Resumen: Se analizaron las ~100 líneas visibles de app.ts (extracto provisto). Se identifican 22 problemas concretos que afectan principios SOLID, Clean Code, diseño de APIs, Clean Architecture y operatividad. Para cada uno se indica el principio afectado, el riesgo y una solución accionable. Al final se propone una arquitectura objetivo con ejemplos de código.

## Hallazgos: problemas, principios, riesgos y soluciones
> En Evidencia cito fragmentos reales del archivo para anclar el problema.
> Columna Severidad: 🔴 alta · 🟠 media · 🟡 baja

| #  | Problema (con evidencia)                                                                                                             | Principio afectado*                   | Riesgo                                                   | Solución propuesta                                                                           | Sev. |     |                                               |    |
| -- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---- | --- | --------------------------------------------- | -- |
| 1  | **Tipado débil**: `checkpoints: any[] = [];`                                                                                         | Clean Code, Type Safety              | Errores en runtime; contratos implícitos                 | Definir **interfaces**/tipos fuertes (`Checkpoint`) y usarlos en todo el flujo.              | 🔴   |     |                                               |    |
| 2  | **Crea y retorna la colección completa** en vez del recurso creado: `return this.checkpoints;` (en `createCheckpoint`)               | Diseño de APIs, SRP (S de SOLID)     | Acopla llamadas a estructura interna; respuestas pesadas | Retornar **solo el recurso creado** o un DTO; status **201**.                                | 🟠   |     |                                               |    |
| 3  | **Generación de id insegura**: `id: Math.random().toString()`                                                                        | Seguridad, Consistencia              | Colisiones; ids predecibles                              | Usar **UUID v4** (p.ej., `crypto.randomUUID()` en Node 18+).                                 | 🔴   |     |                                               |    |
| 4  | **Modelo inconsistente**: parámetro `timestamp: Date` pero se persiste **string**: `timestamp: timestamp.toISOString()`              | Clean Code, DDD                      | Bichos por desalineación de tipos                        | Mantener **tipo dominio** coherente (Date) y mapear a string **solo en la capa de I/O**.     | 🟠   |     |                                               |    |
| 5  | **Comparación laxa**: `c.unitId == unitId`                                                                                           | Clean Code                           | Bugs por coerción                                        | Usar **`===`** y normalizar tipos/inputs.                                                    | 🟡   |     |                                               |    |
| 6  | **Falta de validación de entradas** (status, unitId, timestamp) en rutas y servicios                                                 | Diseño de APIs, Seguridad            | Inyección de datos inválidos; DOS por payload            | Declarar **esquemas** (Fastify `schema`/JSON Schema) y validar **query/body**.               | 🔴   |     |                                               |    |
| 7  | **`any` en la capa HTTP**: `const { status } = req.query as any;`                                                                    | Clean Code                           | Tipos silenciosos; errores en producción                 | Tipar request con **`RouteGenericInterface`** o inferir desde `schema`.                      | 🟠   |     |                                               |    |
| 8  | **Envío directo de estructuras internas**: `reply.send(this.unitService.getUnitsByStatus(status));`                                  | Clean Architecture, Encapsulación    | Filtración de detalles internos; acoplamiento            | Mapear a **DTOs de salida** en el adaptador HTTP.                                            | 🟠   |     |                                               |    |
| 9  | **Estado en memoria**: `checkpoints` en array                                                                                        | Arquitectura, Escalabilidad          | Pérdida de datos al reiniciar; no escalable              | Introducir **Repository** (puerto) + **adaptador** (InMemory/DB).                            | 🔴   |     |                                               |    |
| 10 | **Acoplamiento a Fastify** en lógica de negocio (rutas instancian servicios directamente)                                            | Clean Architecture, DIP (D de SOLID) | Difícil testear/sustituir framework                      | Separar **dominio / casos de uso** de **HTTP**; **inyección de dependencias**.               | 🔴   |     |                                               |    |
| 11 | **Nombre engañoso**: `getHistory(unitId)` filtra checkpoints por `unitId`, pero cada checkpoint tiene un `history: []` no gestionado | Clean Code (Nomenclatura), SRP       | Confusión, deuda técnica                                 | Renombrar a `getCheckpointsByUnitId` o implementar correctamente `history`.                  | 🟠   |     |                                               |    |
| 12 | **Propiedad `history: []` sin uso**                                                                                                  | YAGNI, SRP                           | Complejidad accidental, consumo de RAM                   | Eliminar hasta que exista el caso de uso; o gestionar eventos/historial en entidad dedicada. | 🟡   |     |                                               |    |
| 13 | **Faltan códigos de estado y manejo de errores** (solo `reply.send`)                                                                 | Diseño de APIs                       | Semántica HTTP pobre; clientes ambiguos                  | Usar \`reply.status(201                                                                      | 400  | 404 | 500).send(...)\` y **middleware** de errores. | 🟠 |
| 14 | **`app.listen` con callback** (patrón legado) y sin `await`, sin host                                                                | Operatividad                         | Arranque no determinista; fallo en contenedores          | Usar **promesas**: `await app.listen({ host:'0.0.0.0', port })` dentro de `bootstrap()`.     | 🟠   |     |                                               |    |
| 15 | **`process.exit(1)` sin log ni cierre gracioso**                                                                                     | Observabilidad, Operación            | Pérdida de logs, shutdown brusco                         | Capturar señales, cerrar servidor con `app.close()`, log estructurado.                       | 🟠   |     |                                               |    |
| 16 | **Puerto hardcodeado**: `3000`                                                                                                       | 12-Factor, Config                    | Dificulta despliegues multiambiente                      | Leer de **`process.env.PORT`** con default.                                                  | 🟡   |     |                                               |    |
| 17 | **Ausencia de logging estructurado**                                                                                                 | Observabilidad                       | Difícil diagnóstico en prod                              | Inicializar Fastify con **pino** y niveles; correlación de requests.                         | 🟡   |     |                                               |    |
| 18 | **Falta de paginación/limitación** en listados (`getHistory`, `getUnitsByStatus`)                                                    | Diseño de APIs, Performance          | Respuestas grandes; DOS                                  | Soportar **`limit`/`cursor`** y **paginación**.                                              | 🟠   |     |                                               |    |
| 19 | **Mutabilidad sin control** (`push` directo)                                                                                         | DDD, Inmutabilidad                   | Condiciones de carrera, efectos colaterales              | Entidades **inmutables**; `add()` regresa nuevo arreglo o repositorio controla mutación.     | 🟡   |     |                                               |    |
| 20 | **Igual mezcla de responsabilidades** (gestión de checkpoints + historial + API) en un solo archivo                                  | SRP, Clean Architecture              | Mantenibilidad baja                                      | Split por capas y **módulos**: dominio, casos de uso, adaptadores.                           | 🔴   |     |                                               |    |
| 21 | **Tipos de dominio mezclados con detalles de transporte** (ISO string)                                                               | Clean Architecture                   | Fugas de infraestructura al dominio                      | **Mapeos** en adaptadores (Serializers/Mappers).                                             | 🟠   |     |                                               |    |
| 22 | **Sin controles básicos de seguridad** (authz/authn, rate limit, CORS)                                                               | Seguridad                            | Exposición de datos; abuso                               | Añadir **CORS**, **rate limiting**, **auth** (JWT/OAuth), **schemas estrictos**.             | 🔴   |     |                                               |    |


### Explicación principios afectados, identificados en el código
* SRP (Single Responsibility Principle): Cada módulo debe tener un único motivo de cambio; evita mezclar responsabilidades.

* OCP (Open/Closed Principle): El código debe poder extenderse sin modificar lo existente, favoreciendo abstracciones.

* LSP (Liskov Substitution Principle): Subtipos deben poder reemplazar a sus supertipos sin alterar el comportamiento esperado.

* ISP (Interface Segregation Principle): Interfaces específicas y pequeñas son preferibles a interfaces grandes y genéricas.

* DIP (Dependency Inversion Principle): Las dependencias deben ir de abstracciones, no de implementaciones concretas.

* Clean Code: Código legible, simple y con nombres claros que transmiten intención y reducen ambigüedad.

* Clean Architecture: Separación en capas (dominio, aplicación, infraestructura) con dependencias hacia adentro.

* Diseño de APIs: Definir contratos claros, consistentes y seguros entre cliente y servidor.

* Seguridad: Protección frente a entradas maliciosas, exposición de datos y amenazas de disponibilidad.

* DDD (Domain-Driven Design): El modelo de dominio refleja la lógica del negocio y se abstrae de infraestructura.

* YAGNI (You Aren’t Gonna Need It): Evitar agregar complejidad o funcionalidades que aún no son necesarias.

* SoC (Separation of Concerns): Dividir el sistema en partes independientes para reducir acoplamiento.

* Inmutabilidad: Evitar mutaciones directas de estado para lograr mayor previsibilidad y menos errores.

* 12-Factor / Configuración: Configuración externa al código fuente, facilitando despliegue en múltiples entornos.

* Observabilidad: Registro estructurado, métricas y trazas para diagnosticar y entender el comportamiento en producción.