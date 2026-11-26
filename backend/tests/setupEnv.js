// Variables de entorno para las pruebas (se ejecuta antes de cargar la app).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "pruebas-secreto-de-al-menos-32-caracteres-aleatorios";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres:pw@localhost:5432/studyflow_test";
process.env.ADMIN_EMAIL = "admin@studyflow.test";
process.env.DISABLE_RATE_LIMIT = "true";
