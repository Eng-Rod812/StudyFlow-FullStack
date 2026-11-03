[README.md](https://github.com/user-attachments/files/34302401/README.md)
# StudyFlow Full Stack

Aplicación web para organizar tareas académicas. Permite crear una cuenta, iniciar sesión y administrar tareas personales mediante una interfaz conectada a una API REST y a PostgreSQL.

**Aplicación publicada:** https://studyflow-fullstack.onrender.com  
**Código fuente:** https://github.com/Eng-Rod812/StudyFlow-FullStack

## Tecnologías

- **Frontend:** HTML, CSS y JavaScript.
- **Backend:** Node.js y Express.
- **Base de datos:** PostgreSQL (Neon).
- **Autenticación:** JSON Web Token (JWT) y contraseñas protegidas mediante hash con bcryptjs.
- **Pruebas de API:** Postman.
- **Despliegue:** Render.

## Funcionalidades

- Registro e inicio de sesión de usuarios.
- Creación, consulta, edición, marcado como completada y eliminación de tareas.
- Filtros de tareas y contador de progreso.
- Persistencia de los datos en PostgreSQL.
- Rutas protegidas: cada usuario administra solamente sus propias tareas.
- Interfaz adaptable a distintos tamaños de pantalla.

## Estructura principal

```text
StudyFlow-FullStack/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── .gitignore
└── render.yaml
```

## Instalación local

**Requisitos:** Node.js 20 o posterior, npm y una base de datos PostgreSQL accesible.

1. Clona el repositorio y entra a `backend`.
2. Copia `backend/.env.example` como `backend/.env`.
3. Configura `DATABASE_URL` y un `JWT_SECRET` aleatorio de al menos 32 caracteres en `backend/.env`.
4. Desde la carpeta `backend`, instala las dependencias e inicia el servidor:

```bash
npm install
npm start
```

5. Abre **http://localhost:3000** en el navegador.

El servidor Express sirve el frontend y la API. Al arrancar, crea las tablas necesarias si todavía no existen. El archivo `.env` está excluido de Git para evitar publicar credenciales.

> En PowerShell, si la ejecución de scripts bloquea `npm`, puedes utilizar `npm.cmd install` y `npm.cmd start`.

## API REST

| Método | Ruta | Descripción | Autenticación |
|---|---|---|---|
| GET | `/api/health` | Verificar el estado de la API | No |
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/login` | Iniciar sesión | No |
| GET | `/api/auth/me` | Consultar perfil | Sí |
| GET | `/api/tasks` | Listar tareas del usuario | Sí |
| POST | `/api/tasks` | Crear tarea | Sí |
| PATCH | `/api/tasks/:id` | Editar título o estado | Sí |
| DELETE | `/api/tasks/:id` | Eliminar tarea | Sí |

Las rutas protegidas requieren el encabezado `Authorization: Bearer <token>`. El backend valida las solicitudes y utiliza consultas parametrizadas para acceder a PostgreSQL.

## Despliegue

La aplicación está publicada como servicio web de Node.js en Render y utiliza una base de datos PostgreSQL alojada en Neon. Las credenciales y la clave JWT se configuran como variables de entorno del servicio, sin incluirlas en el repositorio.

**URL:** https://studyflow-fullstack.onrender.com
