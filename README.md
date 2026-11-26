# StudyFlow Full Stack — Entrega final

Aplicación web para organizar tareas académicas con prioridades, fechas límite, presupuesto de estudio en pesos (API externa de tipo de cambio) y panel de administración.

**Aplicación publicada:** https://studyflow-fullstack.onrender.com
**Código fuente:** https://github.com/Eng-Rod812/StudyFlow-FullStack

## Tecnologías

| Capa | Herramientas |
|---|---|
| Frontend | React 19, React Router 7, Vite, CSS propio (responsivo, modo oscuro) |
| Backend | Node.js 22, Express 5, helmet, express-rate-limit, cors |
| Base de datos | PostgreSQL (Neon en producción) con `pg` y consultas parametrizadas |
| Seguridad | JWT (HS256) + bcryptjs (costo 12), roles `user` / `admin` (RBAC) |
| API externa | [Frankfurter](https://frankfurter.dev) (REST, tipo de cambio USD→MXN, datos del BCE) |
| Pruebas | Jest + Supertest (unitarias, funcionales, seguridad), Postman |
| Despliegue | Render (Blueprint `render.yaml`) o Docker (`Dockerfile`, `docker-compose.yml`) |

## Funcionalidades

- Registro, inicio de sesión y **sesión persistente** con cierre automático al vencer el JWT.
- CRUD de tareas con prioridad, fecha límite y costo en USD.
- **Filtros, búsqueda, orden y paginación** en `GET /api/tasks` (los filtros viven en la URL).
- **Presupuesto de estudio**: convierte el costo pendiente de USD a MXN con la API externa (con caché y degradación si la API falla).
- **Roles**: el administrador gestiona usuarios (listar, buscar, cambiar rol, eliminar) y ve estadísticas.
- Rutas dinámicas en React Router (`/tareas/:id`), rutas protegidas y por rol.

## Estructura

```text
StudyFlow_FullStack/
├── frontend/                 # React + Vite
│   └── src/ (pages/, components/, api.js, auth.jsx, App.jsx, styles.css)
├── backend/
│   ├── src/ (controllers/, routes/, middleware/, services/, utils/, db/)
│   └── tests/ (unit/, integration/)
├── documentacion/            # Documento técnico, capturas, colección Postman
├── Dockerfile · docker-compose.yml · render.yaml
└── README.md
```

## Instalación local

Requisitos: Node.js 20+ y PostgreSQL.

```bash
# 1) Frontend: compilar
cd frontend && npm install && npm run build
# 2) Backend: configurar y arrancar
cd ../backend && npm install
cp .env.example .env      # edita DATABASE_URL, JWT_SECRET y ADMIN_EMAIL
npm start                 # http://localhost:3000
```

Desarrollo con recarga en caliente: `npm run dev` en `backend/` y `npm run dev` en `frontend/` (http://localhost:5173, con proxy a la API).
En PowerShell, si se bloquea `npm`, usa `npm.cmd`.

**Administrador:** el correo definido en `ADMIN_EMAIL` recibe el rol `admin` al registrarse (o al reiniciar el servidor si ya existía).

## Pruebas

Crea una base vacía (`createdb studyflow_test`) y ejecuta:

```bash
cd backend
# Windows (PowerShell): $env:TEST_DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/studyflow_test"
TEST_DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/studyflow_test npm test
npm run test:coverage
```

Las pruebas **truncan las tablas** de la base indicada: usa siempre una base exclusiva para pruebas.
La suite incluye 116 casos: unitarios (paginación, validación, errores, servicio de API externa con `fetch` simulado), funcionales (CRUD, filtros, roles) y de seguridad (inyección SQL/NoSQL, JWT falsificado/`alg:none`/vencido, escalada de privilegios, mass assignment, XSS, cabeceras, fuerza bruta). Cobertura: ~98 % de líneas.
Colección Postman: `documentacion/StudyFlow.postman_collection.json`.

## API REST

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| GET | `/api/health` | Estado del servicio | Público |
| POST | `/api/auth/register` | Crear cuenta (devuelve JWT) | Público |
| POST | `/api/auth/login` | Iniciar sesión (devuelve JWT) | Público |
| GET | `/api/auth/me` | Perfil y rol actual | JWT |
| GET | `/api/tasks` | Listar: `status`, `priority`, `q`, `sort`, `order`, `page`, `limit` | JWT |
| GET | `/api/tasks/budget` | Costos pendientes/totales convertidos a MXN (API externa) | JWT |
| GET | `/api/tasks/:id` | Obtener una tarea | JWT (propietario) |
| POST | `/api/tasks` | Crear tarea | JWT |
| PATCH | `/api/tasks/:id` | Actualización parcial | JWT (propietario) |
| DELETE | `/api/tasks/:id` | Eliminar | JWT (propietario) |
| GET | `/api/external/exchange-rate?from=USD&to=MXN` | Tipo de cambio | JWT |
| GET | `/api/admin/stats` | Estadísticas globales | Admin |
| GET | `/api/admin/users?q=&page=&limit=` | Usuarios paginados | Admin |
| PATCH | `/api/admin/users/:id/role` | Cambiar rol | Admin |
| DELETE | `/api/admin/users/:id` | Eliminar usuario y sus tareas | Admin |

## Despliegue

**Render (recomendado):** crea un *Web Service* desde el repositorio (o usa el Blueprint `render.yaml`), y define las variables `DATABASE_URL` (cadena de Neon con `?sslmode=require`), `JWT_SECRET` (aleatorio, 32+ caracteres) y `ADMIN_EMAIL`. Build: `cd frontend && npm install && npm run build && cd ../backend && npm install --omit=dev`. Start: `cd backend && npm start`.

**Docker:** `docker compose up --build` levanta PostgreSQL y la app en http://localhost:3000.
