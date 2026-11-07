# Evaluación Experimental: Monolito Modular vs. Microservicios
### Caso de Estudio: Sistema de Reserva de Tickets de Eventos

> **Universidad Nacional de San Agustín de Arequipa (UNSA)**  
> **Facultad de Ingeniería de Producción y Servicios | Escuela Profesional de Ingeniería de Sistemas**  
> **Curso:** Tópicos Avanzados en Ingeniería de Software (TAIS) — Hito 2  
> **Docente:** M.Sc. Ing. Robert Edison Arisaca Mamani  
> **Integrantes:**  
> • Marco Antonio Ponce de León Aguilar  
> • Braulio Armando Chavez Nina  
> • Emerson Danny Mendoza Hilasaca  
> • Yimy Alfredo Charca Ccama  

---

## 📌 1. Descripción del Proyecto

Este repositorio contiene la implementación y el banco de pruebas experimental desarrollado bajo la metodología **Spec-Driven Development (SDD)** con **GitHub Spec Kit** para comparar cuantitativamente dos arquitecturas de software funcionalmente idénticas:

1. **Tratamiento A — Monolito Modular (MM):** Los módulos de `Eventos` y `Reservas` se comunican directamente en memoria dentro de un único proceso Fastify (Node.js/TypeScript).
2. **Tratamiento B — Microservicios (MS):** Servicios desacoplados (`events-service`, `reservations-service`) comunicados a través de la red virtual de Docker mediante un `api-gateway` liviano.

Ambas implementaciones se conectan a **PostgreSQL 16** (con esquemas aislados y bloqueo pesimista `SELECT ... FOR UPDATE` para garantizar **0% de sobreventa / zero overbooking**) y están limitadas por Docker Compose a un presupuesto estricto e idéntico de hardware: **2.0 CPUs y 2048 MB de memoria RAM**.

---

## 🚀 2. Guía Rápida para el Equipo de Investigación

Para ejecutar las pruebas y recolectar las métricas de rendimiento y consumo de recursos para el informe, consulta el documento oficial:

📄 **[Guía Operativa de Ejecución del Experimento (PDF)](./Guia_Ejecucion_Experimento_TAIS.pdf)**

### Comando Único (Ejecución 100% Automatizada):
Abre PowerShell en este directorio y ejecuta el orquestador:
```powershell
powershell -ExecutionPolicy Bypass -File benchmark/scripts/run-all-benchmarks.ps1
```
*Este comando levantará secuencialmente cada arquitectura en Docker, ejecutará las pruebas de carga con k6, capturará el consumo de CPU y RAM cada 1 segundo en archivos CSV dentro de `benchmark/results/` y limpiará los contenedores.*

---

## 📂 3. Estructura del Repositorio

```text
ticket-architecture-benchmark/
├── Guia_Ejecucion_Experimento_TAIS.pdf   # Guía paso a paso para el equipo
├── shared/                              # Modelos de dominio, DTOs y errores comunes
│   └── src/                             # Código TypeScript compartido para paridad absoluta
├── monolith/                            # TRATAMIENTO A: Monolito Modular
│   ├── src/modules/events/              # Catálogo y disponibilidad de cupos
│   ├── src/modules/reservations/        # Transacción de compra con bloqueo en memoria
│   ├── src/server.ts                    # Servidor Fastify (Puerto 3000)
│   └── Dockerfile                       # Imagen de contenedor del monolito
├── microservices/                       # TRATAMIENTO B: Microservicios
│   └── services/
│       ├── api-gateway/                 # Proxy inverso y enrutador (Puerto 3000)
│       ├── events-service/              # Servicio de eventos (Puerto 3001)
│       └── reservations-service/        # Servicio de reservas (Puerto 3002)
├── benchmark/                           # LABORATORIO Y ARNÉS EXPERIMENTAL
│   ├── k6/                              # Scripts de carga en JavaScript
│   │   ├── load-test.js                 # Rampa nominal (10 a 200 VUs)
│   │   ├── stress-test.js               # Contención extrema (150 VUs compitiendo por 20 tickets)
│   │   └── resilience-test.js           # Medición de disponibilidad y MTTR ante caídas
│   ├── scripts/                         # Automatización y telemetría
│   │   ├── collect-metrics.ps1          # Muestreador de CPU%, Memoria MB y Red a CSV
│   │   ├── run-all-benchmarks.ps1       # Orquestador integral de pruebas
│   │   ├── init-db.sql                  # Creación de esquemas relacionales
│   │   └── seed-database.sql            # Datos semilla reproducibles
│   └── sonar-project.properties         # Configuración para escaneo en SonarQube
├── specs/001-ticket-reservation/        # ARTEFACTOS FORMALES (GitHub Spec Kit)
│   ├── spec.md                          # Especificación funcional y criterios de aceptación
│   ├── plan.md                          # Plan técnico y diseño de monorepo
│   ├── tasks.md                         # Tareas de programación atómicas implementadas
│   ├── research.md                      # Decisiones de investigación arquitectónica
│   ├── data-model.md                    # Modelo relacional y reglas de concurrencia
│   └── contracts/openapi.yaml           # Contrato OpenAPI 3.0 unificado
├── tests/                               # SUITE DE PRUEBAS AUTOMATIZADAS
│   ├── contract/api-contract.test.ts    # Validación de esquemas OpenAPI
│   ├── integration/parity.test.ts       # Certificación de equivalencia funcional cruzada
│   └── integration/overbooking-concurrency.test.ts # Verificación de 0 sobreventa
├── docker-compose.monolith.yml           # Compose Monolito + PostgreSQL (2 CPU, 2048M RAM)
├── docker-compose.microservices.yml      # Compose Microservicios + PostgreSQL (2 CPU, 2048M RAM)
├── package.json                         # Configuración de workspaces monorepo
└── README.md                            # Documentación principal del proyecto
```

---

## 🛠️ 4. Ejecución Manual Paso a Paso

Si prefieres levantar cada entorno de forma independiente para capturar pantallas o depurar:

### A. Probar el Monolito Modular
```bash
# 1. Levantar contenedores
docker compose -f docker-compose.monolith.yml up --build -d

# 2. Verificar salud
curl http://localhost:3000/health
curl http://localhost:3000/api/events?limit=5

# 3. Lanzar pruebas de estrés con k6
k6 run benchmark/k6/load-test.js
k6 run benchmark/k6/stress-test.js

# 4. Apagar y limpiar datos
docker compose -f docker-compose.monolith.yml down -v
```

### B. Probar los Microservicios
```bash
# 1. Levantar los 3 servicios y base de datos
docker compose -f docker-compose.microservices.yml up --build -d

# 2. Verificar API Gateway
curl http://localhost:3000/health
curl http://localhost:3000/api/events?limit=5

# 3. Lanzar pruebas de estrés con k6
k6 run benchmark/k6/load-test.js
k6 run benchmark/k6/stress-test.js

# 4. Prueba de Resiliencia (Inyección de Fallos):
# Ejecutar k6 y mientras corre, simular la caída del servicio de reservas:
k6 run benchmark/k6/resilience-test.js
docker stop benchmark_ms_reservations   # El catálogo sigue respondiendo HTTP 200
docker start benchmark_ms_reservations  # Se recupera el servicio

# 5. Apagar y limpiar datos
docker compose -f docker-compose.microservices.yml down -v
```

### C. Auditoría Estática con SonarQube
Para medir deuda técnica, complejidad ciclomática y cognitiva:
```bash
sonar-scanner -Dproject.settings=benchmark/sonar-project.properties
```

---

## 📊 5. Variables Experimentales a Evaluar

| Dimensión | Variable Dependiente | Métrica / Unidad | Instrumento |
| :--- | :--- | :--- | :--- |
| **Rendimiento** | Latencia (Media, p95, p99) | Milisegundos (ms) | Grafana k6 |
| **Rendimiento** | Throughput (Caudal) | Peticiones / seg (RPS) | Grafana k6 |
| **Confiabilidad** | Tasa de Error | Porcentaje (%) | Grafana k6 |
| **Consumo** | Uso de CPU (Medio y Pico) | Porcentaje (%) | Docker Stats (CSV) |
| **Consumo** | Uso de Memoria RAM (Basal y Pico) | Megabytes (MB) | Docker Stats (CSV) |
| **Mantenibilidad**| Complejidad y Deuda Técnica | Índice SQALE / Horas | SonarQube |
| **Resiliencia** | Continuidad y Tiempo de Recuperación | Disponibilidad (%) y MTTR (s) | k6 + Docker Health |

---

## 📜 6. Licencia y Cita Académica

Proyecto desarrollado con fines académicos y experimentales para la asignatura de **Tópicos Avanzados en Ingeniería de Software (UNSA, 2026)**.

