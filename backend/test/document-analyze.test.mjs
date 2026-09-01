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

describe("POST /api/document/analyze", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 404 and does not call Ollama when the document does not exist", async () => {
    const fetchMock = vi.spyOn(
      globalThis,
      "fetch"
    );

    const response =
      await request(app)
        .post(
          "/api/document/analyze"
        )
        .send({
          documentId:
            "missing-document-id",

          instruction:
            "Summarize this document.",

          mode: "fast",

          model: "local",
        })
        .expect(404);

    expect(
      response.body
    ).toEqual({
      error:
        "Document not found. Upload it again.",
    });

    expect(
      fetchMock
    ).not.toHaveBeenCalled();
  });

  it("returns 400 and does not call Ollama when instruction is empty", async () => {
    const uploadResponse =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            Buffer.from(
            "This document exists for an instruction validation test.",
            "utf8"
            ),
            {
            filename:
                "instruction-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    const fetchMock = vi.spyOn(
        globalThis,
        "fetch"
    );

    const response =
        await request(app)
        .post(
            "/api/document/analyze"
        )
        .send({
            documentId,

            instruction:
            "   ",

            mode:
            "fast",

            model:
            "local",
        })
        .expect(400);

    expect(
        response.body
    ).toEqual({
        error:
        "An instruction is required.",
    });

    expect(
        fetchMock
    ).not.toHaveBeenCalled();

    await request(app)
        .delete(
        `/api/files/${documentId}`
        )
    .expect(200);
  });

  it("analyzes a TXT document with the LOCAL model and streams the final answer", async () => {
    const uploadResponse =
        await request(app)
        .post(
            "/api/files/upload"
        )
        .attach(
            "file",
            Buffer.from(
            `
    PROJECT ORION

    The total budget is 120,000 dollars.

    The main technology is React.

    The project deadline is October 15, 2026.

    The main risk is insufficient testing before release.
            `.trim(),
            "utf8"
            ),
            {
            filename:
                "orion-analysis-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    try {
        // First Ollama call:
        // non-streaming analysis of the document chunk.
        const chunkResponse =
        new Response(
            JSON.stringify({
            message: {
                role:
                "assistant",

                content:
                "The deadline is October 15, 2026. The budget is 120,000 dollars. The technology is React. The main risk is insufficient testing. [CHUNK 1]",
            },
            }),
            {
            status: 200,

            headers: {
                "Content-Type":
                "application/json",
            },
            }
        );

        // Second Ollama call:
        // streaming final synthesis.
        const finalStream =
        [
            JSON.stringify({
            message: {
                role:
                "assistant",

                content:
                "LOCAL DOCUMENT TEST OK",
            },

            done: false,
            }),

            JSON.stringify({
            message: {
                role:
                "assistant",

                content: "",
            },

            done: true,

            eval_count:
                4,

            eval_duration:
                1_000_000_000,

            prompt_eval_count:
                10,

            prompt_eval_duration:
                500_000_000,
            }),
        ].join("\n") + "\n";

        const finalResponse =
        new Response(
            finalStream,
            {
            status: 200,

            headers: {
                "Content-Type":
                "application/x-ndjson",
            },
            }
        );

        const fetchMock =
        vi
            .spyOn(
            globalThis,
            "fetch"
            )
            .mockResolvedValueOnce(
            chunkResponse
            )
            .mockResolvedValueOnce(
            finalResponse
            );

        const response =
        await request(app)
            .post(
            "/api/document/analyze"
            )
            .send({
            documentId,

            instruction:
                "What is the deadline, budget, technology and main risk?",

            mode:
                "fast",

            model:
                "local",
            })
            .expect(200);

        expect(
        fetchMock
        ).toHaveBeenCalledTimes(
        2
        );

        // --------------------------------
        // CHUNK ANALYSIS REQUEST
        // --------------------------------

        const [
        chunkUrl,
        chunkOptions,
        ] =
        fetchMock.mock.calls[0];

        expect(
        chunkUrl
        ).toBe(
        "http://127.0.0.1:11434/api/chat"
        );

        const chunkRequest =
        JSON.parse(
            chunkOptions.body
        );

        expect(
        chunkRequest.model
        ).toBe(
        "qwen3.5:4b"
        );

        expect(
        chunkRequest.stream
        ).toBe(false);

        expect(
        chunkRequest.think
        ).toBe(false);

        expect(
        chunkRequest.options.num_ctx
        ).toBe(4096);

        // --------------------------------
        // FINAL SYNTHESIS REQUEST
        // --------------------------------

        const [
        finalUrl,
        finalOptions,
        ] =
        fetchMock.mock.calls[1];

        expect(
        finalUrl
        ).toBe(
        "http://127.0.0.1:11434/api/chat"
        );

        const finalRequest =
        JSON.parse(
            finalOptions.body
        );

        expect(
        finalRequest.model
        ).toBe(
        "qwen3.5:4b"
        );

        expect(
        finalRequest.stream
        ).toBe(true);

        expect(
        finalRequest.think
        ).toBe(false);

        expect(
        finalRequest.options.num_ctx
        ).toBe(4096);

        // --------------------------------
        // STREAM RETURNED TO FRONTEND
        // --------------------------------

        expect(
        response.text
        ).toContain(
        '"stage":"analyzing"'
        );

        expect(
        response.text
        ).toContain(
        '"stage":"preparing-final-answer"'
        );

        expect(
        response.text
        ).toContain(
        '"stage":"writing-final-answer"'
        );

        expect(
        response.text
        ).toContain(
        "LOCAL DOCUMENT TEST OK"
        );

        expect(
        response.text
        ).toContain(
        '"document":true'
        );

        expect(
        response.text
        ).toContain(
        '"chunksProcessed":1'
        );

        expect(
        response.text
        ).toContain(
        '"relevantChunks":1'
        );
    } finally {
        await request(app)
        .delete(
            `/api/files/${documentId}`
        );
    }
  });

  it("uses and reports the ATRAEL model during document analysis", async () => {
    const atraelModel =
        "tinyrick/Qwen3.8-27B-Uncensored-HauhauCS-Aggressive-MTP-GGUF:Q4_K_P";

    const uploadResponse =
        await request(app)
        .post("/api/files/upload")
        .attach(
            "file",
            Buffer.from(
            "The project uses React and has a budget of 120,000 dollars.",
            "utf8"
            ),
            {
            filename:
                "atrael-document-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    try {
        const chunkResponse =
        new Response(
            JSON.stringify({
            message: {
                role:
                "assistant",

                content:
                "The project uses React and has a budget of 120,000 dollars. [CHUNK 1]",
            },
            }),
            {
            status: 200,

            headers: {
                "Content-Type":
                "application/json",
            },
            }
        );

        const finalStream =
        [
            JSON.stringify({
            message: {
                role:
                "assistant",

                content:
                "ATRAEL DOCUMENT TEST OK",
            },

            done: false,
            }),

            JSON.stringify({
            message: {
                role:
                "assistant",

                content: "",
            },

            done: true,

            eval_count:
                4,

            eval_duration:
                1_000_000_000,

            prompt_eval_count:
                8,

            prompt_eval_duration:
                500_000_000,
            }),
        ].join("\n") + "\n";

        const finalResponse =
        new Response(
            finalStream,
            {
            status: 200,

            headers: {
                "Content-Type":
                "application/x-ndjson",
            },
            }
        );

        const fetchMock =
        vi
            .spyOn(
            globalThis,
            "fetch"
            )
            .mockResolvedValueOnce(
            chunkResponse
            )
            .mockResolvedValueOnce(
            finalResponse
            );

        const response =
        await request(app)
            .post(
            "/api/document/analyze"
            )
            .send({
            documentId,

            instruction:
                "Summarize the project.",

            mode:
                "fast",

            model:
                "atrael",
            })
            .expect(200);

        expect(
        fetchMock
        ).toHaveBeenCalledTimes(
        2
        );

        const chunkRequest =
        JSON.parse(
            fetchMock.mock.calls[0][1]
            .body
        );

        const finalRequest =
        JSON.parse(
            fetchMock.mock.calls[1][1]
            .body
        );

        expect(
        chunkRequest.model
        ).toBe(
        atraelModel
        );

        expect(
        finalRequest.model
        ).toBe(
        atraelModel
        );

        expect(
        response.text
        ).toContain(
        "ATRAEL DOCUMENT TEST OK"
        );

        expect(
        response.text
        ).toContain(
        `"model":"${atraelModel}"`
        );
    } finally {
        await request(app)
        .delete(
            `/api/files/${documentId}`
        );
    }
  });

  it("does not identify ATRAEL as Qwen 3.5 4B during document analysis", async () => {
    const uploadResponse =
        await request(app)
        .post("/api/files/upload")
        .attach(
            "file",
            Buffer.from(
            "The project uses React and has a budget of 120,000 dollars.",
            "utf8"
            ),
            {
            filename:
                "atrael-identity-document.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    try {
        const chunkResponse =
        new Response(
            JSON.stringify({
            message: {
                role:
                "assistant",

                content:
                "React and 120,000 dollars. [CHUNK 1]",
            },
            }),
            {
            status: 200,

            headers: {
                "Content-Type":
                "application/json",
            },
            }
        );

        const finalStream =
        [
            JSON.stringify({
            message: {
                role:
                "assistant",

                content:
                "DOCUMENT IDENTITY TEST",
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
                3,

            eval_duration:
                1_000_000_000,

            prompt_eval_count:
                6,

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
            .mockResolvedValueOnce(
            chunkResponse
            )
            .mockResolvedValueOnce(
            new Response(
                finalStream,
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
            "/api/document/analyze"
        )
        .send({
            documentId,

            instruction:
            "Summarize this document.",

            mode:
            "fast",

            model:
            "atrael",
        })
        .expect(200);

        const chunkRequest =
        JSON.parse(
            fetchMock.mock.calls[0][1]
            .body
        );

        const finalRequest =
        JSON.parse(
            fetchMock.mock.calls[1][1]
            .body
        );

        const chunkSystemPrompt =
        chunkRequest.messages[0]
            .content;

        const finalSystemPrompt =
        finalRequest.messages[0]
            .content;

        expect(
        chunkSystemPrompt
        ).not.toContain(
        "You are Qwen 3.5 4B"
        );

        expect(
        finalSystemPrompt
        ).not.toContain(
        "You are Qwen 3.5 4B"
        );

        expect(
        chunkSystemPrompt
            .toLowerCase()
        ).toContain(
        "atrael"
        );

        expect(
        finalSystemPrompt
            .toLowerCase()
        ).toContain(
        "atrael"
        );
    } finally {
        await request(app)
        .delete(
            `/api/files/${documentId}`
        );
    }
  });

  it("provides Andres Alba identity and creator profile during document analysis", async () => {
    const uploadResponse =
        await request(app)
        .post("/api/files/upload")
        .attach(
            "file",
            Buffer.from(
            "This is a simple document used to test Atrael identity context.",
            "utf8"
            ),
            {
            filename:
                "creator-profile-document-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    try {
        const chunkResponse =
        new Response(
            JSON.stringify({
            message: {
                role: "assistant",

                content:
                "Simple document content. [CHUNK 1]",
            },
            }),
            {
            status: 200,

            headers: {
                "Content-Type":
                "application/json",
            },
            }
        );

        const finalStream =
        [
            JSON.stringify({
            message: {
                role: "assistant",

                content:
                "DOCUMENT CREATOR PROFILE TEST",
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

            eval_duration:
                1_000_000_000,

            prompt_eval_count: 6,

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
            .mockResolvedValueOnce(
            chunkResponse
            )
            .mockResolvedValueOnce(
            new Response(
                finalStream,
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
        .post(
            "/api/document/analyze"
        )
        .send({
            documentId,

            instruction:
            "Summarize this document.",

            mode:
            "fast",

            model:
            "local",
        })
        .expect(200);

        expect(
        fetchMock
        ).toHaveBeenCalledTimes(2);

        const chunkRequest =
        JSON.parse(
            fetchMock
            .mock
            .calls[0][1]
            .body
        );

        const finalRequest =
        JSON.parse(
            fetchMock
            .mock
            .calls[1][1]
            .body
        );

        const chunkSystemPrompt =
        chunkRequest
            .messages[0]
            .content;

        const finalSystemPrompt =
        finalRequest
            .messages[0]
            .content;

        for (
        const systemPrompt of [
            chunkSystemPrompt,
            finalSystemPrompt,
        ]
        ) {
        expect(
            systemPrompt
        ).toContain(
            "Andres Alba"
        );

        expect(
            systemPrompt
        ).toContain(
            "creator"
        );

        expect(
            systemPrompt
        ).toContain(
            creatorProfile
        );
        }
    } finally {
        await request(app)
        .delete(
            `/api/files/${documentId}`
        );
    }
  });

  it("preserves previous conversation context during document analysis", async () => {
    const uploadResponse =
        await request(app)
        .post("/api/files/upload")
        .attach(
            "file",
            Buffer.from(
            `
    PROJECT ATLAS

    Risk one is insufficient testing before release.

    Risk two is insufficient budget for the second development phase.
            `.trim(),
            "utf8"
            ),
            {
            filename:
                "document-conversation-context-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    try {
        const chunkResponse =
        new Response(
            JSON.stringify({
            message: {
                role: "assistant",

                content:
                "Risk two is insufficient budget for the second development phase. [CHUNK 1]",
            },
            }),
            {
            status: 200,

            headers: {
                "Content-Type":
                "application/json",
            },
            }
        );

        const finalStream =
        [
            JSON.stringify({
            message: {
                role: "assistant",

                content:
                "DOCUMENT CONVERSATION TEST OK",
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

            eval_duration:
                1_000_000_000,

            prompt_eval_count: 6,

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
            .mockResolvedValueOnce(
            chunkResponse
            )
            .mockResolvedValueOnce(
            new Response(
                finalStream,
                {
                status: 200,

                headers: {
                    "Content-Type":
                    "application/x-ndjson",
                },
                }
            )
            );

        const previousMessages = [
        {
            role: "user",

            content:
            "What are the two main risks?",
        },

        {
            role: "assistant",

            content:
            "The first risk is insufficient testing. The second risk is insufficient budget.",
        },
        ];

        await request(app)
        .post(
            "/api/document/analyze"
        )
        .send({
            documentId,

            instruction:
            "Explain the second one in more detail.",

            messages:
            previousMessages,

            mode:
            "fast",

            model:
            "local",
        })
        .expect(200);

        expect(
        fetchMock
        ).toHaveBeenCalledTimes(2);

        const chunkRequest =
        JSON.parse(
            fetchMock
            .mock
            .calls[0][1]
            .body
        );

        const finalRequest =
        JSON.parse(
            fetchMock
            .mock
            .calls[1][1]
            .body
        );

        const chunkPrompt =
        chunkRequest
            .messages
            .map(
            (message) =>
                message.content
            )
            .join("\n");

        const finalPrompt =
        finalRequest
            .messages
            .map(
            (message) =>
                message.content
            )
            .join("\n");

        for (
        const prompt of [
            chunkPrompt,
            finalPrompt,
        ]
        ) {
        expect(
            prompt
        ).toContain(
            "What are the two main risks?"
        );

        expect(
            prompt
        ).toContain(
            "The first risk is insufficient testing. The second risk is insufficient budget."
        );

        expect(
            prompt
        ).toContain(
            "Explain the second one in more detail."
        );
        }
    } finally {
        await request(app)
        .delete(
            `/api/files/${documentId}`
        );
    }
  });

  it("uses web search context when webAccess is enabled during document analysis", async () => {
    const uploadResponse =
        await request(app)
        .post("/api/files/upload")
        .attach(
            "file",
            Buffer.from(
            "This document says the application uses React.",
            "utf8"
            ),
            {
            filename:
                "document-web-test.txt",

            contentType:
                "text/plain",
            }
        )
        .expect(200);

    const documentId =
        uploadResponse.body.documentId;

    try {
        const finalStream =
        [
            JSON.stringify({
            message: {
                role: "assistant",

                content:
                "DOCUMENT WEB TEST OK",
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

            eval_duration:
                1_000_000_000,

            prompt_eval_count: 6,

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
            .mockImplementation(
            async (
                url,
                options = {}
            ) => {
                // --------------------------------
                // PRIVATE WEB SEARCH
                // --------------------------------

                if (
                url ===
                "https://html.duckduckgo.com/html/"
                ) {
                return new Response(
                    `
    <html>
    <body>
        <a
        class="result__a"
        href="https://example.com/react"
        >
        React official documentation
        </a>

        <div class="result__snippet">
        React external evidence used for the document web test.
        </div>
    </body>
    </html>
                    `.trim(),
                    {
                    status: 200,

                    headers: {
                        "Content-Type":
                        "text/html",
                    },
                    }
                );
                }

                // --------------------------------
                // OLLAMA
                // --------------------------------

                if (
                url ===
                "http://127.0.0.1:11434/api/chat"
                ) {
                const body =
                    JSON.parse(
                    options.body
                    );

                const systemPrompt =
                    body.messages?.[0]
                    ?.content || "";

                // Web-query generation
                if (
                    systemPrompt.includes(
                    "You create privacy-preserving web search queries."
                    )
                ) {
                    return new Response(
                    JSON.stringify({
                        message: {
                        role:
                            "assistant",

                        content:
                            "React official documentation",
                        },
                    }),
                    {
                        status: 200,

                        headers: {
                        "Content-Type":
                            "application/json",
                        },
                    }
                    );
                }

                // Document chunk analysis
                if (
                    body.stream ===
                    false
                ) {
                    return new Response(
                    JSON.stringify({
                        message: {
                        role:
                            "assistant",

                        content:
                            "The document says the application uses React. [CHUNK 1]",
                        },
                    }),
                    {
                        status: 200,

                        headers: {
                        "Content-Type":
                            "application/json",
                        },
                    }
                    );
                }

                // Final synthesis
                if (
                    body.stream ===
                    true
                ) {
                    return new Response(
                    finalStream,
                    {
                        status: 200,

                        headers: {
                        "Content-Type":
                            "application/x-ndjson",
                        },
                    }
                    );
                }
                }

                throw new Error(
                `Unexpected fetch call: ${url}`
                );
            }
            );

        const response =
        await request(app)
            .post(
            "/api/document/analyze"
            )
            .send({
            documentId,

            instruction:
                "Analyze the document and use web information when useful.",

            messages: [],

            mode:
                "fast",

            model:
                "local",

            webAccess:
                true,
            })
            .expect(200);

        // --------------------------------
        // WEB SEARCH MUST ACTUALLY HAPPEN
        // --------------------------------

        const webSearchCall =
        fetchMock.mock.calls.find(
            ([url]) =>
            url ===
            "https://html.duckduckgo.com/html/"
        );

        expect(
        webSearchCall
        ).toBeDefined();

        // --------------------------------
        // FIND FINAL OLLAMA REQUEST
        // --------------------------------

        const finalCall =
        [...fetchMock.mock.calls]
            .reverse()
            .find(
            (
                [
                url,
                options,
                ]
            ) => {
                if (
                url !==
                "http://127.0.0.1:11434/api/chat"
                ) {
                return false;
                }

                const body =
                JSON.parse(
                    options.body
                );

                return (
                body.stream ===
                true
                );
            }
            );

        expect(
        finalCall
        ).toBeDefined();

        const finalRequest =
        JSON.parse(
            finalCall[1].body
        );

        const finalPrompt =
        finalRequest.messages
            .map(
            (message) =>
                message.content
            )
            .join("\n");

        // --------------------------------
        // WEB RESULTS MUST REACH FINAL AI
        // --------------------------------

        expect(
        finalPrompt
        ).toContain(
        "WEB SEARCH RESULTS:"
        );

        expect(
        finalPrompt
        ).toContain(
        "React official documentation"
        );

        expect(
        finalPrompt
        ).toContain(
        "https://example.com/react"
        );

        // --------------------------------
        // FRONTEND MUST KNOW WEB WAS USED
        // --------------------------------

        expect(
        response.text
        ).toContain(
        '"type":"web"'
        );

        expect(
        response.text
        ).toContain(
        '"used":true'
        );

        expect(
        response.text
        ).toContain(
        "DOCUMENT WEB TEST OK"
        );
    } finally {
        await request(app)
        .delete(
            `/api/files/${documentId}`
        );
    }
  });
});