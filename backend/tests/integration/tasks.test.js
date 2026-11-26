const { app, pool, request, resetDb, registerUser, auth } = require("../helpers");

let ana; let beto;
beforeAll(async () => {
  await resetDb();
  ana = await registerUser("Ana", "ana@mail.com");
  beto = await registerUser("Beto", "beto@mail.com");
});
afterAll(() => pool.end());

const create = (token, body) => request(app).post("/api/tasks").set(auth(token)).send(body);

describe("CRUD de tareas (funcional)", () => {
  let id;
  test("crear con valores por defecto", async () => {
    const res = await create(ana.token, { title: "  Estudiar SQL  " });
    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({ title: "Estudiar SQL", completed: false, priority: "media", due_date: null, cost_usd: null });
    id = res.body.task.id;
  });
  test("crear con todos los campos", async () => {
    const res = await create(ana.token, { title: "Comprar libro", priority: "alta", due_date: "2026-12-15", cost_usd: 49.99 });
    expect(res.body.task).toMatchObject({ priority: "alta", due_date: "2026-12-15", cost_usd: 49.99 });
  });
  test("obtener una tarea", async () => {
    const res = await request(app).get(`/api/tasks/${id}`).set(auth(ana.token));
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe("Estudiar SQL");
  });
  test("actualizar parcialmente y limpiar campos con null", async () => {
    const a = await request(app).patch(`/api/tasks/${id}`).set(auth(ana.token)).send({ completed: true, priority: "baja", due_date: "2026-11-30" });
    expect(a.body.task).toMatchObject({ completed: true, priority: "baja", due_date: "2026-11-30", title: "Estudiar SQL" });
    const b = await request(app).patch(`/api/tasks/${id}`).set(auth(ana.token)).send({ due_date: null });
    expect(b.body.task.due_date).toBeNull();
  });
  test("eliminar y luego 404", async () => {
    expect((await request(app).delete(`/api/tasks/${id}`).set(auth(ana.token))).status).toBe(204);
    expect((await request(app).get(`/api/tasks/${id}`).set(auth(ana.token))).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${id}`).set(auth(ana.token))).status).toBe(404);
  });
  test("datos inválidos -> 400", async () => {
    expect((await create(ana.token, { title: "" })).status).toBe(400);
    expect((await create(ana.token, { title: "x", priority: "urgente" })).status).toBe(400);
    expect((await request(app).patch("/api/tasks/abc").set(auth(ana.token)).send({ completed: true })).status).toBe(400);
  });
});

describe("filtros, búsqueda, orden y paginación", () => {
  beforeAll(async () => {
    await pool.query("TRUNCATE tasks RESTART IDENTITY");
    for (let i = 1; i <= 25; i++) {
      await create(ana.token, { title: `Tarea ${String(i).padStart(2, "0")}${i % 5 === 0 ? " examen" : ""}`, priority: ["baja", "media", "alta"][i % 3] });
    }
    await request(app).patch("/api/tasks/1").set(auth(ana.token)).send({ completed: true });
    await request(app).patch("/api/tasks/2").set(auth(ana.token)).send({ completed: true });
    await create(ana.token, { title: "100% listo_ya" });
  });
  const get = (qs) => request(app).get(`/api/tasks${qs}`).set(auth(ana.token));

  test("paginación por defecto (10 por página)", async () => {
    const res = await get("");
    expect(res.body.tasks).toHaveLength(10);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, total: 26, totalPages: 3, hasNext: true, hasPrev: false });
  });
  test("última página trae el resto", async () => {
    const res = await get("?page=3");
    expect(res.body.tasks).toHaveLength(6);
    expect(res.body.pagination).toMatchObject({ hasNext: false, hasPrev: true });
  });
  test("página fuera de rango devuelve lista vacía (no error)", async () => {
    const res = await get("?page=99");
    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
  });
  test("limit personalizado y tope", async () => {
    expect((await get("?limit=5")).body.tasks).toHaveLength(5);
    expect((await get("?limit=1000")).body.pagination.limit).toBe(50);
  });
  test("filtro por estado y resumen global", async () => {
    const done = await get("?status=completed");
    expect(done.body.pagination.total).toBe(2);
    const pend = await get("?status=pending&limit=50");
    expect(pend.body.pagination.total).toBe(24);
    expect(done.body.summary).toEqual({ total: 26, completed: 2, pending: 24 });
  });
  test("filtro por prioridad", async () => {
    const res = await get("?priority=alta&limit=50");
    expect(res.body.tasks.every((t) => t.priority === "alta")).toBe(true);
  });
  test("búsqueda por texto", async () => {
    const res = await get("?q=examen&limit=50");
    expect(res.body.pagination.total).toBe(5);
  });
  test("los comodines LIKE del usuario se tratan como texto", async () => {
    expect((await get("?q=%25")).body.pagination.total).toBe(1);
    expect((await get("?q=_")).body.pagination.total).toBe(1);
  });
  test("orden por título ascendente", async () => {
    const res = await get("?sort=title&order=asc&limit=3");
    expect(res.body.tasks.map((t) => t.title)).toEqual(["100% listo_ya", "Tarea 01", "Tarea 02"]);
  });
  test("combinación de filtros", async () => {
    const res = await get("?status=pending&q=examen&priority=media");
    expect(res.body.tasks.every((t) => !t.completed && t.priority === "media" && /examen/.test(t.title))).toBe(true);
  });
  test("parámetros inválidos -> 400", async () => {
    for (const qs of ["?page=0", "?page=x", "?status=otro", "?sort=password", "?order=up", "?priority=zzz"]) {
      expect((await get(qs)).status).toBe(400);
    }
  });
});

describe("aislamiento entre usuarios", () => {
  let tareaAna;
  beforeAll(async () => { tareaAna = (await create(ana.token, { title: "Privada de Ana" })).body.task.id; });
  test("otro usuario no ve, edita ni borra la tarea (404)", async () => {
    expect((await request(app).get(`/api/tasks/${tareaAna}`).set(auth(beto.token))).status).toBe(404);
    expect((await request(app).patch(`/api/tasks/${tareaAna}`).set(auth(beto.token)).send({ title: "hackeada" })).status).toBe(404);
    expect((await request(app).delete(`/api/tasks/${tareaAna}`).set(auth(beto.token))).status).toBe(404);
    expect((await request(app).get("/api/tasks?q=Privada").set(auth(beto.token))).body.pagination.total).toBe(0);
  });
  test("ni siquiera un admin ve las tareas privadas por la ruta de usuario", async () => {
    const admin = await registerUser("Admin", "admin@studyflow.test");
    expect((await request(app).get(`/api/tasks/${tareaAna}`).set(auth(admin.token))).status).toBe(404);
  });
});

describe("presupuesto con API externa", () => {
  const realFetch = global.fetch;
  const { clearCache } = require("../../src/services/exchangeRate");
  let carla;
  beforeAll(async () => {
    carla = await registerUser("Carla", "carla@mail.com");
    await create(carla.token, { title: "Curso", cost_usd: 100 });
    const done = (await create(carla.token, { title: "Libro", cost_usd: 50.5 })).body.task.id;
    await request(app).patch(`/api/tasks/${done}`).set(auth(carla.token)).send({ completed: true });
  });
  beforeEach(() => clearCache());
  afterEach(() => { global.fetch = realFetch; });

  test("convierte USD a MXN con la tasa externa", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ date: "2026-11-20", rates: { MXN: 18.25 } }) });
    const res = await request(app).get("/api/tasks/budget").set(auth(carla.token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ pendingUsd: 100, totalUsd: 150.5, pendingMxn: 1825, totalMxn: 2746.63 });
    expect(res.body.exchange.rate).toBe(18.25);
  });
  test("si la API externa falla, responde 200 con datos locales y una advertencia", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("timeout"));
    const res = await request(app).get("/api/tasks/budget").set(auth(carla.token));
    expect(res.status).toBe(200);
    expect(res.body.pendingMxn).toBeNull();
    expect(res.body.pendingUsd).toBe(100);
    expect(res.body.warning).toMatch(/tipo de cambio/);
  });
  test("endpoint directo del tipo de cambio: éxito, validación y 502", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ date: "2026-11-20", rates: { EUR: 0.86 } }) });
    const ok = await request(app).get("/api/external/exchange-rate?from=USD&to=EUR").set(auth(carla.token));
    expect(ok.body).toMatchObject({ from: "USD", to: "EUR", rate: 0.86 });
    expect((await request(app).get("/api/external/exchange-rate?from=US&to=EUR").set(auth(carla.token))).status).toBe(400);
    expect((await request(app).get("/api/external/exchange-rate")).status).toBe(401);
    clearCache();
    global.fetch = jest.fn().mockRejectedValue(new Error("down"));
    expect((await request(app).get("/api/external/exchange-rate?to=MXN").set(auth(carla.token))).status).toBe(502);
  });
});
