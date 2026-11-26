const { errorHandler, notFound } = require("../../src/middleware/errors");
const HttpError = require("../../src/utils/httpError");

const makeRes = () => ({ headersSent: false, code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });

describe("middleware de errores (unitaria)", () => {
  test("HttpError conserva su estado y mensaje", () => {
    const res = makeRes();
    errorHandler(new HttpError(403, "Prohibido"), { method: "GET", originalUrl: "/x" }, res, () => {});
    expect(res.code).toBe(403);
    expect(res.body).toEqual({ error: "Prohibido" });
  });
  test("errores inesperados no filtran detalles internos", () => {
    const res = makeRes();
    errorHandler(new Error("password=secreto en la consulta SQL"), { method: "GET", originalUrl: "/x" }, res, () => {});
    expect(res.code).toBe(500);
    expect(res.body.error).toBe("Error interno del servidor.");
  });
  test("delega si los headers ya se enviaron", () => {
    const res = makeRes(); res.headersSent = true;
    const next = jest.fn();
    errorHandler(new Error("x"), {}, res, next);
    expect(next).toHaveBeenCalled();
  });
  test("notFound genera 404", () => {
    const next = jest.fn(); notFound({}, {}, next);
    expect(next.mock.calls[0][0].status).toBe(404);
  });
});
