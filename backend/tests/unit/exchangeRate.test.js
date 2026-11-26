const { getRate, clearCache } = require("../../src/services/exchangeRate");

const okResponse = (rate) => ({ ok: true, status: 200, json: async () => ({ base: "USD", date: "2026-11-20", rates: { MXN: rate } }) });

describe("servicio de API externa (fetch simulado)", () => {
  const realFetch = global.fetch;
  beforeEach(() => clearCache());
  afterEach(() => { global.fetch = realFetch; });

  test("devuelve la tasa y la guarda en caché", async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse(18.5));
    const a = await getRate("USD", "MXN");
    const b = await getRate("USD", "MXN");
    expect(a.rate).toBe(18.5);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  test("valida códigos de moneda antes de llamar a la API", async () => {
    global.fetch = jest.fn();
    await expect(getRate("usd", "MXN")).rejects.toMatchObject({ status: 400 });
    await expect(getRate("USD", "MXN&x=1")).rejects.toMatchObject({ status: 400 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test("misma moneda no consulta la API", async () => {
    global.fetch = jest.fn();
    expect((await getRate("MXN", "MXN")).rate).toBe(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test("falla de red -> 502", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNRESET"));
    await expect(getRate("USD", "MXN")).rejects.toMatchObject({ status: 502 });
  });
  test("respuesta HTTP 500 de la API -> 502", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(getRate("USD", "MXN")).rejects.toMatchObject({ status: 502 });
  });
  test("moneda no soportada (404) -> 400", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(getRate("USD", "ZZZ")).rejects.toMatchObject({ status: 400 });
  });
  test("respuesta con forma inesperada -> 502", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ rates: {} }) });
    await expect(getRate("USD", "MXN")).rejects.toMatchObject({ status: 502 });
    global.fetch = jest.fn().mockResolvedValue(okResponse("18.5"));
    clearCache();
    await expect(getRate("USD", "MXN")).rejects.toMatchObject({ status: 502 });
  });
  test("JSON inválido -> 502", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error("bad"); } });
    await expect(getRate("USD", "MXN")).rejects.toMatchObject({ status: 502 });
  });
});
