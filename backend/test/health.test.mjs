import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import request from "supertest";

import serverModule from "../server.js";

const { app } = serverModule;

describe("GET /api/health", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 when Ollama is available", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue({
        ok: true,

        json: async () => ({
          models: [
            {
              name: "qwen3.5:4b",
            },
          ],
        }),
      });

    const response =
      await request(app)
        .get("/api/health")
        .expect(200);

    expect(response.body.ok).toBe(
      true
    );

    expect(
      response.body.ollama
    ).toBe("connected");

    expect(
      response.body.model
    ).toBe("qwen3.5:4b");

    expect(
      response.body.installedModels
    ).toContain("qwen3.5:4b");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/tags"
    );
  });

  it("returns 500 when Ollama is unavailable", async () => {
    vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue({
        ok: false,

        text: async () =>
            "Ollama is unavailable",
        });

    const response =
        await request(app)
        .get("/api/health")
        .expect(500);

    expect(response.body.ok).toBe(
        false
    );

    expect(
        response.body.error
    ).toBe(
        "Ollama is not responding"
    );
  });
});