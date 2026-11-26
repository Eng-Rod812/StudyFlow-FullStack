const jwt = require("jsonwebtoken");
const { app, pool, request, resetDb, registerUser, auth } = require("../helpers");

let ana; let beto; let admin;
beforeAll(async () => {
  await resetDb();
  ana = await registerUser("Ana", "ana@mail.com");
  beto = await registerUser("Beto", "beto@mail.com");
  admin = await registerUser("Admin", "admin@studyflow.test");
  await request(app).post("/api/tasks").set(auth(ana.token)).send({ title: "Secreta de Ana" });
});
afterAll(() => pool.end());

const SQLI = ["' OR '1'='1", "'; DROP TABLE tasks; --", "\" OR 1=1 --", "1; SELECT pg_sleep(5)", "' UNION SELECT password_hash FROM users --"];

describe("seguridad: autenticación", () => {
  const protectedRoutes = [["get", "/api/tasks"], ["post", "/api/tasks"], ["get", "/api/tasks/1"], ["patch", "/api/tasks/1"], ["delete", "/api/tasks/1"], ["get", "/api/tasks/budget"], ["get", "/api/auth/me"], ["get", "/api/external/exchange-rate"], ["get", "/api/admin/users"]];
  test.each(protectedRoutes)("%s %s sin token -> 401", async (m, url) => {
    expect((await request(app)[m](url)).status).toBe(401);
  });
  test("token con firma de otra clave -> 401", async () => {
    const forged = jwt.sign({ role: "admin" }, "otra-clave-distinta-de-32-caracteres-xx", { subject: String(ana.user.id) });
    expect((await request(app).get("/api/tasks").set(auth(forged))).status).toBe(401);
  });
  test("token con algoritmo 'none' -> 401", async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const none = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: String(admin.user.id), role: "admin" })}.`;
    expect((await request(app).get("/api/admin/users").set(auth(none))).status).toBe(401);
  });
  test("token vencido -> 401", async () => {
    const old = jwt.sign({}, process.env.JWT_SECRET, { subject: String(ana.user.id), expiresIn: -10 });
    expect((await request(app).get("/api/tasks").set(auth(old))).status).toBe(401);
  });
  test("token alterado (payload modificado) -> 401", async () => {
    const [h, , s] = ana.token.split(".");
    const payload = Buffer.from(JSON.stringify({ sub: String(admin.user.id), role: "admin" })).toString("base64url");
    expect((await request(app).get("/api/admin/users").set(auth(`${h}.${payload}.${s}`))).status).toBe(401);
  });
  test("escalada de privilegios: claim role=admin en un token firmado NO da acceso", async () => {
    const t = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, { subject: String(ana.user.id) });
    expect((await request(app).get("/api/admin/users").set(auth(t))).status).toBe(403);
  });
  test("subject malicioso en el token -> 401", async () => {
    const t = jwt.sign({}, process.env.JWT_SECRET, { subject: "1 OR 1=1" });
    expect((await request(app).get("/api/tasks").set(auth(t))).status).toBe(401);
  });
  test("cabecera Authorization sin esquema Bearer -> 401", async () => {
    expect((await request(app).get("/api/tasks").set("Authorization", ana.token)).status).toBe(401);
  });
});

describe("seguridad: inyección SQL", () => {
  test.each(SQLI)("login con payload %s no autentica", async (payload) => {
    const res = await request(app).post("/api/auth/login").send({ email: payload, password: payload });
    expect([400, 401]).toContain(res.status);
  });
  test.each(SQLI)("búsqueda q=%s se trata como texto", async (payload) => {
    const res = await request(app).get("/api/tasks").query({ q: payload }).set(auth(beto.token));
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
  test.each(SQLI)("sort/order/status con %s -> 400", async (payload) => {
    for (const p of ["sort", "order", "status", "priority"]) {
      expect((await request(app).get("/api/tasks").query({ [p]: payload }).set(auth(ana.token))).status).toBe(400);
    }
  });
  test.each(SQLI)("id de ruta %s -> 400/404, no ejecuta SQL", async (payload) => {
    const res = await request(app).delete(`/api/tasks/${encodeURIComponent(payload)}`).set(auth(ana.token));
    expect([400, 404]).toContain(res.status);
  });
  test("el título con SQL se guarda literal y las tablas siguen intactas", async () => {
    const t = "Robert'); DROP TABLE tasks;--";
    const res = await request(app).post("/api/tasks").set(auth(ana.token)).send({ title: t });
    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe(t);
    expect((await pool.query("SELECT COUNT(*)::int AS n FROM tasks")).rows[0].n).toBeGreaterThan(0);
  });
  test("inyección NoSQL / objetos en lugar de texto -> 400", async () => {
    expect((await request(app).post("/api/auth/login").send({ email: { $ne: null }, password: { $ne: null } })).status).toBe(400);
    expect((await request(app).post("/api/tasks").set(auth(ana.token)).send({ title: { $gt: "" } })).status).toBe(400);
  });
});

describe("seguridad: autorización y datos", () => {
  test("mass assignment: user_id, role e id del body se ignoran", async () => {
    const res = await request(app).post("/api/tasks").set(auth(beto.token)).send({ title: "Mía", user_id: ana.user.id, id: 9999 });
    expect(res.status).toBe(201);
    const row = (await pool.query("SELECT user_id FROM tasks WHERE id = $1", [res.body.task.id])).rows[0];
    expect(row.user_id).toBe(beto.user.id);
    const reg = await request(app).post("/api/auth/register").send({ name: "Mal", email: "mal@mail.com", password: "ClaveSegura123", role: "admin" });
    expect(reg.body.user.role).toBe("user");
  });
  test("un usuario no puede leer tareas ajenas por ningún filtro", async () => {
    const res = await request(app).get("/api/tasks?limit=50").set(auth(beto.token));
    expect(res.body.tasks.some((t) => t.title === "Secreta de Ana")).toBe(false);
  });
  test("las respuestas nunca incluyen password_hash", async () => {
    const responses = [
      await request(app).get("/api/auth/me").set(auth(ana.token)),
      await request(app).get("/api/admin/users").set(auth(admin.token)),
      await request(app).post("/api/auth/login").send({ email: "ana@mail.com", password: "ClaveSegura123" }),
    ];
    for (const r of responses) expect(JSON.stringify(r.body)).not.toMatch(/password|\$2[aby]\$/);
  });
  test("XSS: el payload se almacena como texto y se devuelve como JSON (el front lo escapa)", async () => {
    const xss = "<img src=x onerror=alert(1)>";
    const res = await request(app).post("/api/tasks").set(auth(ana.token)).send({ title: xss });
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.task.title).toBe(xss);
  });
  test("cabeceras de seguridad (helmet) y sin x-powered-by", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["strict-transport-security"]).toBeDefined();
  });
});

describe("seguridad y robustez: manejo de errores", () => {
  test("JSON mal formado -> 400 controlado", async () => {
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{ no es json");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("JSON mal formado.");
  });
  test("cuerpo mayor a 16 KB -> 413", async () => {
    const res = await request(app).post("/api/tasks").set(auth(ana.token)).send({ title: "a".repeat(20000) });
    expect(res.status).toBe(413);
  });
  test("ruta de API inexistente -> 404 JSON", async () => {
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Ruta no encontrada.");
  });
  test("método no soportado -> 404 JSON, no cae el servidor", async () => {
    expect((await request(app).put("/api/tasks/1").set(auth(ana.token))).status).toBe(404);
  });
});

describe("seguridad: límite de intentos (fuerza bruta)", () => {
  test("tras 30 intentos de login se responde 429", async () => {
    process.env.DISABLE_RATE_LIMIT = "false";
    let last;
    for (let i = 0; i < 32; i++) last = await request(app).post("/api/auth/login").send({ email: "ana@mail.com", password: "incorrecta-123" });
    process.env.DISABLE_RATE_LIMIT = "true";
    expect(last.status).toBe(429);
  });
});
