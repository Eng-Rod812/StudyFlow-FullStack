const v = require("../../src/middleware/validate");

const run = (mw, req) => { let err; mw(req, {}, (e) => { err = e; }); return err; };

describe("middleware de validación (unitaria)", () => {
  test("crear tarea: título obligatorio", () => {
    expect(run(v.validateTaskCreate, { body: {} }).status).toBe(400);
    expect(run(v.validateTaskCreate, { body: { title: "   " } }).status).toBe(400);
    expect(run(v.validateTaskCreate, { body: { title: "Estudiar" } })).toBeUndefined();
  });
  test("rechaza cuerpos que no son objetos", () => {
    expect(run(v.validateTaskCreate, { body: [1] }).status).toBe(400);
    expect(run(v.validateTaskCreate, { body: null }).status).toBe(400);
  });
  test("título de más de 140 caracteres", () => {
    expect(run(v.validateTaskCreate, { body: { title: "a".repeat(141) } }).status).toBe(400);
  });
  test("prioridad, fecha y costo", () => {
    expect(run(v.validateTask, { body: { priority: "urgente" } }).status).toBe(400);
    expect(run(v.validateTask, { body: { due_date: "2026-02-31" } }).status).toBe(400);
    expect(run(v.validateTask, { body: { due_date: "2026-12-01" } })).toBeUndefined();
    expect(run(v.validateTask, { body: { cost_usd: -5 } }).status).toBe(400);
    expect(run(v.validateTask, { body: { cost_usd: "10" } }).status).toBe(400);
    expect(run(v.validateTask, { body: { cost_usd: null, due_date: null } })).toBeUndefined();
  });
  test("PATCH exige al menos un campo", () => {
    expect(run(v.validateTask, { body: {} }).status).toBe(400);
    expect(run(v.validateTask, { body: { completed: "si" } }).status).toBe(400);
    expect(run(v.validateTask, { body: { completed: true } })).toBeUndefined();
  });
  test("parseId rechaza 0, negativos, decimales y texto", () => {
    for (const id of ["0", "-3", "1.2", "abc", "1;DROP TABLE tasks"]) {
      expect(run(v.parseId, { params: { id } }).status).toBe(400);
    }
    const req = { params: { id: "42" } };
    expect(run(v.parseId, req)).toBeUndefined();
    expect(req.targetId).toBe(42);
  });
  test("filtros de consulta con lista blanca", () => {
    expect(run(v.validateTaskQuery, { query: { sort: "password_hash" } }).status).toBe(400);
    expect(run(v.validateTaskQuery, { query: { order: "asc; DROP" } }).status).toBe(400);
    expect(run(v.validateTaskQuery, { query: { status: ["a", "b"] } }).status).toBe(400);
    expect(run(v.validateTaskQuery, { query: { status: "pending", sort: "due_date", order: "asc" } })).toBeUndefined();
  });
  test("registro: correo, contraseña y nombre", () => {
    const ok = { name: "Ana", email: "ana@mail.com", password: "12345678" };
    expect(run(v.validateRegister, { body: ok })).toBeUndefined();
    expect(run(v.validateRegister, { body: { ...ok, email: "ana" } }).status).toBe(400);
    expect(run(v.validateRegister, { body: { ...ok, password: "corta" } }).status).toBe(400);
    expect(run(v.validateRegister, { body: { ...ok, name: "" } }).status).toBe(400);
    expect(run(v.validateRegister, { body: { ...ok, email: { $ne: 1 } } }).status).toBe(400);
  });
  test("cambio de rol solo acepta user/admin", () => {
    expect(run(v.validateRoleChange, { body: { role: "root" } }).status).toBe(400);
    expect(run(v.validateRoleChange, { body: { role: "admin" } })).toBeUndefined();
  });
});
