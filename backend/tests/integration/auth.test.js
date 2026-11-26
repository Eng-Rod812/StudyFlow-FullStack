const { app, pool, request, resetDb, registerUser, auth } = require("../helpers");

beforeAll(resetDb);
afterAll(() => pool.end());

describe("autenticación y roles (funcional)", () => {
  test("registro crea usuario con rol user y entrega JWT", async () => {
    const r = await registerUser("Ana", "ana@mail.com");
    expect(r.status).toBe(201);
    expect(r.user.role).toBe("user");
    expect(r.token.split(".")).toHaveLength(3);
    expect(r.user.password_hash).toBeUndefined();
  });
  test("el correo definido en ADMIN_EMAIL obtiene rol admin", async () => {
    const r = await registerUser("Jefe", "ADMIN@studyflow.test");
    expect(r.user.role).toBe("admin");
  });
  test("correo duplicado -> 409", async () => {
    expect((await registerUser("Ana 2", "ana@mail.com")).status).toBe(409);
  });
  test("login correcto e incorrecto", async () => {
    const ok = await request(app).post("/api/auth/login").send({ email: "ana@mail.com", password: "ClaveSegura123" });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeDefined();
    const bad = await request(app).post("/api/auth/login").send({ email: "ana@mail.com", password: "otra-clave-12" });
    expect(bad.status).toBe(401);
    const none = await request(app).post("/api/auth/login").send({ email: "nadie@mail.com", password: "ClaveSegura123" });
    expect(none.status).toBe(401);
    expect(none.body.error).toBe(bad.body.error); // no revela si el correo existe
  });
  test("/me devuelve el usuario del token", async () => {
    const { token } = await registerUser("Luis", "luis@mail.com");
    const res = await request(app).get("/api/auth/me").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: "Luis", email: "luis@mail.com", role: "user" });
  });
  test("la contraseña se guarda como hash bcrypt", async () => {
    const row = (await pool.query("SELECT password_hash FROM users WHERE email = 'ana@mail.com'")).rows[0];
    expect(row.password_hash).toMatch(/^\$2[aby]\$12\$/);
    expect(row.password_hash).not.toContain("ClaveSegura123");
  });
  test("validaciones de registro devuelven 400", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "X", email: "mal", password: "12345678" });
    expect(res.status).toBe(400);
  });
});

describe("administración (RBAC)", () => {
  let admin; let user; let other;
  beforeAll(async () => {
    await resetDb();
    admin = await registerUser("Admin", "admin@studyflow.test");
    user = await registerUser("Usuario", "u@mail.com");
    other = await registerUser("Otro", "o@mail.com");
  });
  test("usuario normal recibe 403 en rutas de admin", async () => {
    for (const [m, url] of [["get", "/api/admin/users"], ["get", "/api/admin/stats"], ["patch", `/api/admin/users/${other.user.id}/role`], ["delete", `/api/admin/users/${other.user.id}`]]) {
      const res = await request(app)[m](url).set(auth(user.token)).send({ role: "admin" });
      expect(res.status).toBe(403);
    }
  });
  test("sin token recibe 401", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
  });
  test("admin lista usuarios con paginación y búsqueda", async () => {
    const res = await request(app).get("/api/admin/users?limit=2&page=1").set(auth(admin.token));
    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ total: 3, totalPages: 2, hasNext: true });
    const q = await request(app).get("/api/admin/users?q=otro").set(auth(admin.token));
    expect(q.body.users.map((u) => u.email)).toEqual(["o@mail.com"]);
    expect(q.body.users[0].password_hash).toBeUndefined();
  });
  test("admin ve estadísticas", async () => {
    const res = await request(app).get("/api/admin/stats").set(auth(admin.token));
    expect(res.body.stats).toMatchObject({ users: 3, admins: 1 });
  });
  test("admin cambia el rol y el cambio aplica de inmediato (aunque el token sea anterior)", async () => {
    const res = await request(app).patch(`/api/admin/users/${user.user.id}/role`).set(auth(admin.token)).send({ role: "admin" });
    expect(res.status).toBe(200);
    expect((await request(app).get("/api/admin/stats").set(auth(user.token))).status).toBe(200);
    await request(app).patch(`/api/admin/users/${user.user.id}/role`).set(auth(admin.token)).send({ role: "user" });
    expect((await request(app).get("/api/admin/stats").set(auth(user.token))).status).toBe(403);
  });
  test("admin no puede cambiarse el rol ni eliminarse", async () => {
    expect((await request(app).patch(`/api/admin/users/${admin.user.id}/role`).set(auth(admin.token)).send({ role: "user" })).status).toBe(400);
    expect((await request(app).delete(`/api/admin/users/${admin.user.id}`).set(auth(admin.token))).status).toBe(400);
  });
  test("admin elimina usuarios; su token deja de funcionar y sus tareas se borran en cascada", async () => {
    await request(app).post("/api/tasks").set(auth(other.token)).send({ title: "Tarea de otro" });
    expect((await request(app).delete(`/api/admin/users/${other.user.id}`).set(auth(admin.token))).status).toBe(204);
    expect((await request(app).get("/api/auth/me").set(auth(other.token))).status).toBe(401);
    expect((await pool.query("SELECT COUNT(*)::int AS n FROM tasks")).rows[0].n).toBe(0);
    expect((await request(app).delete("/api/admin/users/9999").set(auth(admin.token))).status).toBe(404);
  });
});
