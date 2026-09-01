import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import request from "supertest";

import serverModule from "../server.js";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { app } = serverModule;

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const creatorProfile =
  fs
    .readFileSync(
      path.join(
        __dirname,
        "../creator-profile.md"
      ),
      "utf8"
    )
    .trim();

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses qwen3.5:4b when LOCAL is selected", async () => {
    const ollamaStream = [
      JSON.stringify({
        message: {
          role: "assistant",
          content: "LOCAL TEST OK",
        },
        done: false,
      }),

      JSON.stringify({
        message: {
          role: "assistant",
          content: "",
        },
        done: true,
        eval_count: 3,
        eval_duration: 1_000_000_000,
        prompt_eval_count: 5,
        prompt_eval_duration: 500_000_000,
      }),
    ].join("\n") + "\n";

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          ollamaStream,
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/x-ndjson",
            },
          }
        )
      );

    const response =
      await request(app)
        .post("/api/chat")
        .send({
          messages: [
            {
              role: "user",
              content: "Hello",
            },
          ],
          mode: "fast",
          model: "local",
        })
        .expect(200);

    expect(fetchMock).toHaveBeenCalledTimes(
      1
    );

    const [
      url,
      options,
    ] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      "http://127.0.0.1:11434/api/chat"
    );

    const ollamaRequest =
      JSON.parse(
        options.body
      );

    expect(
      ollamaRequest.model
    ).toBe(
      "qwen3.5:4b"
    );

    expect(
      ollamaRequest.stream
    ).toBe(true);

    expect(
      ollamaRequest.think
    ).toBe(false);

    expect(
      ollamaRequest.options.num_ctx
    ).toBe(4096);

    expect(
      response.text
    ).toContain(
      "LOCAL TEST OK"
    );

    expect(
      response.text
    ).toContain(
      '"modelVariant":"LOCAL"'
    );
  });

  it("uses the ATRAEL 27B model when ATRAEL is selected", async () => {
    const ollamaStream = [
        JSON.stringify({
        message: {
            role: "assistant",
            content: "ATRAEL TEST OK",
        },
        done: false,
        }),

        JSON.stringify({
        message: {
            role: "assistant",
            content: "",
        },
        done: true,
        eval_count: 4,
        eval_duration: 2_000_000_000,
        prompt_eval_count: 6,
        prompt_eval_duration: 500_000_000,
        }),
    ].join("\n") + "\n";

    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
        new Response(
            ollamaStream,
            {
            status: 200,
            headers: {
                "Content-Type":
                "application/x-ndjson",
            },
            }
        )
        );

    const response =
        await request(app)
        .post("/api/chat")
        .send({
            messages: [
            {
                role: "user",
                content: "Hello Atrael",
            },
            ],
            mode: "fast",
            model: "atrael",
        })
        .expect(200);

    expect(fetchMock).toHaveBeenCalledTimes(
        1
    );

    const [
        url,
        options,
    ] =
        fetchMock.mock.calls[0];

    expect(url).toBe(
        "http://127.0.0.1:11434/api/chat"
    );

    const ollamaRequest =
        JSON.parse(
        options.body
        );

    expect(
        ollamaRequest.model
    ).toBe(
        "tinyrick/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF:Q4_K_P"
    );

    expect(
        ollamaRequest.stream
    ).toBe(true);

    expect(
        ollamaRequest.think
    ).toBe(false);

    expect(
        ollamaRequest.options.num_ctx
    ).toBe(4096);

    expect(
        response.text
    ).toContain(
        "ATRAEL TEST OK"
    );

    expect(
        response.text
    ).toContain(
        '"modelVariant":"ATRAEL"'
    );
  });

  it("uses QUALITY mode configuration correctly", async () => {
    const ollamaStream = [
        JSON.stringify({
        message: {
            role: "assistant",
            content: "QUALITY TEST OK",
        },
        done: false,
        }),

        JSON.stringify({
        message: {
            role: "assistant",
            content: "",
        },
        done: true,
        eval_count: 5,
        eval_duration: 2_000_000_000,
        prompt_eval_count: 8,
        prompt_eval_duration: 500_000_000,
        }),
    ].join("\n") + "\n";

    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
        new Response(
            ollamaStream,
            {
            status: 200,
            headers: {
                "Content-Type":
                "application/x-ndjson",
            },
            }
        )
        );

    const response =
        await request(app)
        .post("/api/chat")
        .send({
            messages: [
            {
                role: "user",
                content: "Test quality mode",
            },
            ],
            mode: "quality",
            model: "local",
        })
        .expect(200);

    expect(fetchMock).toHaveBeenCalledTimes(
        1
    );

    const [
        ,
        options,
    ] =
        fetchMock.mock.calls[0];

    const ollamaRequest =
        JSON.parse(
        options.body
        );

    expect(
        ollamaRequest.think
    ).toBe(true);

    expect(
        ollamaRequest.options.num_ctx
    ).toBe(8192);

    expect(
        ollamaRequest.options.temperature
    ).toBe(0.3);

    expect(
        response.text
    ).toContain(
        "QUALITY TEST OK"
    );

    expect(
        response.text
    ).toContain(
        '"mode":"QUALITY"'
    );
  });

  it("falls back to LOCAL when an invalid model is requested", async () => {
    const ollamaStream = [
        JSON.stringify({
        message: {
            role: "assistant",
            content: "FALLBACK TEST OK",
        },
        done: false,
        }),

        JSON.stringify({
        message: {
            role: "assistant",
            content: "",
        },
        done: true,
        eval_count: 2,
        eval_duration: 1_000_000_000,
        prompt_eval_count: 4,
        prompt_eval_duration: 500_000_000,
        }),
    ].join("\n") + "\n";

    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
        new Response(
            ollamaStream,
            {
            status: 200,
            headers: {
                "Content-Type":
                "application/x-ndjson",
            },
            }
        )
        );

    const response =
        await request(app)
        .post("/api/chat")
        .send({
            messages: [
            {
                role: "user",
                content: "Test invalid model",
            },
            ],
            mode: "fast",
            model: "pepito-model",
        })
        .expect(200);

    const [
        ,
        options,
    ] =
        fetchMock.mock.calls[0];

    const ollamaRequest =
        JSON.parse(
        options.body
        );

    expect(
        ollamaRequest.model
    ).toBe(
        "qwen3.5:4b"
    );

    expect(
        response.text
    ).toContain(
        '"modelVariant":"LOCAL"'
    );

    expect(
        response.text
    ).toContain(
        "FALLBACK TEST OK"
    );
  });

  it("returns 400 and does not call Ollama when messages is empty", async () => {
    const fetchMock = vi
        .spyOn(globalThis, "fetch");

    const response =
        await request(app)
        .post("/api/chat")
        .send({
            messages: [],
            mode: "fast",
            model: "local",
        })
        .expect(400);

    expect(response.body).toEqual({
        error: "messages is required",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 500 when Ollama rejects the chat request", async () => {
    const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue({
        ok: false,

        text: async () =>
            "Ollama model failed",
        });

    const response =
        await request(app)
        .post("/api/chat")
        .send({
            messages: [
            {
                role: "user",
                content: "Hello",
            },
            ],
            mode: "fast",
            model: "local",
        })
        .expect(500);

    expect(fetchMock).toHaveBeenCalledTimes(
        1
    );

    expect(response.body).toEqual({
        error: "Ollama model failed",
    });
  });

  it("does not identify ATRAEL as Qwen 3.5 4B in the system prompt", async () => {
    const atraelModel =
        "tinyrick/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF:Q4_K_P";

    const ollamaStream =
        [
        JSON.stringify({
            message: {
            role:
                "assistant",

            content:
                "IDENTITY TEST",
            },

            done:
            false,
        }),

        JSON.stringify({
            message: {
            role:
                "assistant",

            content:
                "",
            },

            done:
            true,

            eval_count:
            2,

            eval_duration:
            1_000_000_000,

            prompt_eval_count:
            4,

            prompt_eval_duration:
            500_000_000,
        }),
        ].join("\n") +
        "\n";

    const fetchMock =
        vi
        .spyOn(
            globalThis,
            "fetch"
        )
        .mockResolvedValue(
            new Response(
            ollamaStream,
            {
                status:
                200,

                headers: {
                "Content-Type":
                    "application/x-ndjson",
                },
            }
            )
        );

    await request(app)
        .post(
        "/api/chat"
        )
        .send({
        messages: [
            {
            role:
                "user",

            content:
                "Who are you?",
            },
        ],

        mode:
            "fast",

        model:
            "atrael",
        })
        .expect(200);

    const ollamaRequest =
        JSON.parse(
        fetchMock.mock.calls[0][1]
            .body
        );

    expect(
        ollamaRequest.model
    ).toBe(
        atraelModel
    );

    const systemPrompt =
        ollamaRequest.messages[0]
        .content;

    expect(
        systemPrompt
    ).not.toContain(
        "You are Qwen 3.5 4B"
    );

    expect(
        systemPrompt
        .toLowerCase()
    ).toContain(
        "atrael"
    );
  });

  it("includes Andres Alba identity and the complete creator profile in the system prompt", async () => {
    const ollamaStream =
        [
        JSON.stringify({
            message: {
            role: "assistant",
            content:
                "CREATOR PROFILE TEST OK",
            },

            done: false,
        }),

        JSON.stringify({
            message: {
            role: "assistant",
            content: "",
            },

            done: true,

            eval_count: 2,
            eval_duration:
            1_000_000_000,

            prompt_eval_count: 4,
            prompt_eval_duration:
            500_000_000,
        }),
        ].join("\n") + "\n";

    const fetchMock =
        vi
        .spyOn(
            globalThis,
            "fetch"
        )
        .mockResolvedValue(
            new Response(
            ollamaStream,
            {
                status: 200,

                headers: {
                "Content-Type":
                    "application/x-ndjson",
                },
            }
            )
        );

    await request(app)
        .post("/api/chat")
        .send({
        messages: [
            {
            role: "user",
            content:
                "Who is Andres Alba?",
            },
        ],

        mode: "fast",
        model: "local",
        })
        .expect(200);

    expect(
        fetchMock
    ).toHaveBeenCalledTimes(1);

    const ollamaRequest =
        JSON.parse(
        fetchMock
            .mock
            .calls[0][1]
            .body
        );

    expect(
        ollamaRequest.messages[0].role
    ).toBe("system");

    const systemPrompt =
        ollamaRequest.messages[0]
        .content;

    expect(
        systemPrompt
    ).toContain(
        "The human currently interacting with you is Andres Alba."
    );

    expect(
        systemPrompt
    ).toContain(
        "Andres Alba created Atrael."
    );

    expect(
        systemPrompt
    ).toContain(
        '"Who am I?"'
    );

    expect(
        systemPrompt
    ).toContain(
        '"Who is Andres Alba?"'
    );

    expect(
        systemPrompt
    ).toContain(
        "BEGIN PRIVATE CREATOR PROFILE"
    );

    expect(
        systemPrompt
    ).toContain(
        creatorProfile
    );

    expect(
        systemPrompt
    ).toContain(
        "END PRIVATE CREATOR PROFILE"
    );
  });

  it("provides explicit system context that the current user is Andres Alba", async () => {
    const ollamaStream =
        [
        JSON.stringify({
            message: {
            role: "assistant",
            content:
                "USER IDENTITY TEST OK",
            },

            done: false,
        }),

        JSON.stringify({
            message: {
            role: "assistant",
            content: "",
            },

            done: true,

            eval_count: 2,
            eval_duration:
            1_000_000_000,

            prompt_eval_count: 4,
            prompt_eval_duration:
            500_000_000,
        }),
        ].join("\n") + "\n";

    const fetchMock =
        vi
        .spyOn(
            globalThis,
            "fetch"
        )
        .mockResolvedValue(
            new Response(
            ollamaStream,
            {
                status: 200,

                headers: {
                "Content-Type":
                    "application/x-ndjson",
                },
            }
            )
        );

    await request(app)
        .post("/api/chat")
        .send({
        messages: [
            {
            role: "user",
            content:
                "Who am I?",
            },
        ],

        mode: "fast",
        model: "local",
        })
        .expect(200);

    const ollamaRequest =
        JSON.parse(
        fetchMock
            .mock
            .calls[0][1]
            .body
        );

    const systemPrompt =
        ollamaRequest.messages[0]
        .content;

    expect(
        systemPrompt
    ).toContain(
        "The human currently interacting with you is Andres Alba."
    );

    expect(
        systemPrompt
    ).toContain(
        '"You are Andres Alba, my creator, developer, and primary user."'
    );

    expect(
        systemPrompt
    ).toContain(
        '"Who am I?" means Andres Alba.'
    );
  });

  it("preserves previous conversation messages in the correct order", async () => {
    const ollamaStream =
        [
        JSON.stringify({
            message: {
            role: "assistant",
            content:
                "HISTORY TEST OK",
            },

            done: false,
        }),

        JSON.stringify({
            message: {
            role: "assistant",
            content: "",
            },

            done: true,

            eval_count: 2,
            eval_duration:
            1_000_000_000,

            prompt_eval_count: 4,
            prompt_eval_duration:
            500_000_000,
        }),
        ].join("\n") + "\n";

    const fetchMock =
        vi
        .spyOn(
            globalThis,
            "fetch"
        )
        .mockResolvedValue(
            new Response(
            ollamaStream,
            {
                status: 200,

                headers: {
                "Content-Type":
                    "application/x-ndjson",
                },
            }
            )
        );

    const conversation = [
        {
        role: "user",
        content:
            "My favorite test value is 12345.",
        },

        {
        role: "assistant",
        content:
            "Understood.",
        },

        {
        role: "user",
        content:
            "What value did I just give you?",
        },
    ];

    await request(app)
        .post("/api/chat")
        .send({
        messages:
            conversation,

        mode: "fast",
        model: "local",
        })
        .expect(200);

    const ollamaRequest =
        JSON.parse(
        fetchMock
            .mock
            .calls[0][1]
            .body
        );

    expect(
        ollamaRequest.messages
    ).toHaveLength(4);

    expect(
        ollamaRequest.messages[0]
        .role
    ).toBe("system");

    expect(
        ollamaRequest.messages.slice(1)
    ).toEqual(
        conversation
    );
  });
});