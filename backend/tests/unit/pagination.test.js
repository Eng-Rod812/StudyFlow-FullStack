const { parsePagination, buildMeta, escapeLike } = require("../../src/utils/pagination");

describe("paginación (unitaria)", () => {
  test("valores por defecto: página 1, límite 10", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, offset: 0 });
  });
  test("calcula el offset a partir de page y limit", () => {
    expect(parsePagination({ page: "3", limit: "5" })).toEqual({ page: 3, limit: 5, offset: 10 });
  });
  test("limita el máximo a 50 para no sobrecargar la BD", () => {
    expect(parsePagination({ limit: "9999" }).limit).toBe(50);
  });
  test.each(["0", "-1", "abc", "1.5", "1e3"])("rechaza page=%s", (v) => {
    expect(() => parsePagination({ page: v })).toThrow(/entero positivo/);
  });
  test("rechaza parámetros repetidos (arreglos)", () => {
    expect(() => parsePagination({ page: ["1", "2"] })).toThrow();
  });
  test("buildMeta indica páginas siguiente/anterior", () => {
    expect(buildMeta(25, { page: 2, limit: 10 })).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3, hasNext: true, hasPrev: true });
    expect(buildMeta(0, { page: 1, limit: 10 }).totalPages).toBe(1);
  });
  test("escapeLike neutraliza comodines", () => {
    expect(escapeLike("50%_\\")).toBe("50\\%\\_\\\\");
  });
});
