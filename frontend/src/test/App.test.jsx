import {
  describe,
  expect,
  it,
} from "vitest";

import {
  beforeEach,
  vi,
} from "vitest";

import App from "../App";

import userEvent from "@testing-library/user-event";

import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("Atrael UI", () => {
  it("renders the model and processing mode controls", () => {
    render(<App />);

    expect(
      screen.getByRole("button", {
        name: /LOCAL.*Qwen 3\.5 4B/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /FAST.*16K.*instant/i,
      })
    ).toBeInTheDocument();
  });

  it("switches the active model from LOCAL to ATRAEL", async () => {
    const user = userEvent.setup();

    render(<App />);

    const modelButton = screen.getByRole("button", {
      name: /LOCAL.*Qwen 3\.5 4B/i,
    });

    expect(modelButton).toHaveClass("local");
    expect(modelButton).not.toHaveClass("atrael");

    await user.click(modelButton);

    expect(
      screen.getByRole("button", {
        name: /ATRAEL.*Qwen 27B/i,
      })
    ).toBeInTheDocument();

    expect(modelButton).toHaveClass("atrael");
    expect(modelButton).not.toHaveClass("local");

    await user.click(modelButton);

    expect(
      screen.getByRole("button", {
        name: /LOCAL.*Qwen 3\.5 4B/i,
      })
    ).toBeInTheDocument();

    expect(modelButton).toHaveClass("local");
    expect(modelButton).not.toHaveClass("atrael");
  });

  it("switches the active processing mode from FAST to QUALITY", async () => {
    const user = userEvent.setup();

    render(<App />);

    const modeButton = screen.getByRole("button", {
      name: /FAST.*16K.*instant/i,
    });

    await user.click(modeButton);

    expect(
      screen.getByRole("button", {
        name: /QUALITY.*32K.*reasoning/i,
      })
    ).toBeInTheDocument();

    await user.click(modeButton);

    expect(
      screen.getByRole("button", {
        name: /FAST.*16K.*instant/i,
      })
    ).toBeInTheDocument();
  });

  it("sends ATRAEL and QUALITY to the backend", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    fetchMock.mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Hello",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    render(<App />);

    // Toggle model to ATRAEL
    await user.click(
      screen.getByRole("button", {
        name: /LOCAL.*Qwen 3\.5 4B/i,
      })
    );

    // Toggle mode to QUALITY
    await user.click(
      screen.getByRole("button", {
        name: /FAST.*16K.*instant/i,
      })
    );

    const textarea =
        screen.getByRole(
        "textbox"
        );

    await user.type(
        textarea,
        "Hello Atrael"
    );

    const sendButton =
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        );

    await user.click(
        sendButton
    );

    expect(
        fetchMock
    ).toHaveBeenCalled();

    const [
        url,
        options,
    ] =
        fetchMock.mock.calls[0];

    expect(
        url
    ).toBe(
        "http://localhost:3050/api/chat"
    );

    const body =
        JSON.parse(
        options.body
        );

    expect(
        body.model
    ).toBe(
        "atrael"
    );

    expect(
        body.mode
    ).toBe(
        "quality"
    );

    expect(
        body.messages
    ).toEqual([
        {
        role:
            "user",

        content:
            "Hello Atrael",
        },
    ]);
  });

  it("renders streamed assistant text in the chat", async () => {
    const user =
        userEvent.setup();

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Hello from Atrael",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    render(
        <App />
    );

    const textarea =
        screen.getByRole(
        "textbox"
        );

    await user.type(
        textarea,
        "Say hello"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Hello from Atrael"
        )
    ).toBeInTheDocument();
  });

  it("aborts an active generation when Stop is clicked", async () => {
    const user =
        userEvent.setup();

    let capturedSignal;

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockImplementation(
        (_url, options) => {
        capturedSignal =
            options.signal;

        return new Promise(
            (_resolve, reject) => {
            options.signal.addEventListener(
                "abort",
                () => {
                const error =
                    new Error(
                    "Aborted"
                    );

                error.name =
                    "AbortError";

                reject(
                    error
                );
                },
                {
                once: true,
                }
            );
            }
        );
        }
    );

    render(
        <App />
    );

    const textarea =
        screen.getByRole(
        "textbox"
        );

    await user.type(
        textarea,
        "Generate a long answer"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    const stopButton =
        await screen.findByRole(
        "button",
        {
            name:
            /Stop/i,
        }
        );

    expect(
        capturedSignal
    ).toBeDefined();

    expect(
        capturedSignal.aborted
    ).toBe(false);

    await user.click(
        stopButton
    );

    expect(
        capturedSignal.aborted
    ).toBe(true);

    expect(
        await screen.findByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    ).toBeInTheDocument();
  });

  it("clears the conversation and restores the empty state", async () => {
    const user =
        userEvent.setup();

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "This answer will be cleared",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    render(
        <App />
    );

    const textarea =
        screen.getByRole(
        "textbox"
        );

    await user.type(
        textarea,
        "Temporary question"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "This answer will be cleared"
        )
    ).toBeInTheDocument();

    expect(
        screen.getByText(
        "Temporary question"
        )
    ).toBeInTheDocument();

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /Clear Chat/i,
        }
        )
    );

    expect(
        screen.queryByText(
        "Temporary question"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.queryByText(
        "This answer will be cleared"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.getByText(
        "Ask anything"
        )
    ).toBeInTheDocument();

    expect(
        textarea
    ).toHaveValue("");
  });

  it("reads an assistant response aloud", async () => {
    const user =
        userEvent.setup();

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Hello from Atrael",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    render(
        <App />
    );

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Say hello"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Hello from Atrael"
        )
    ).toBeInTheDocument();

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /Read aloud/i,
        }
        )
    );

    expect(
        window.speechSynthesis.speak
    ).toHaveBeenCalledTimes(
        1
    );

    const utterance =
        window.speechSynthesis.speak
        .mock.calls[0][0];

    expect(
        utterance.text
    ).toBe(
        "Hello from Atrael"
    );

    expect(
        utterance.rate
    ).toBe(1);

    expect(
        utterance.pitch
    ).toBe(0.9);

    expect(
        utterance.volume
    ).toBe(1);
  });

  it("stops an active read aloud response", async () => {
    const user =
        userEvent.setup();

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "This response is being read aloud",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    render(
        <App />
    );

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Read this"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "This response is being read aloud"
        )
    ).toBeInTheDocument();

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /Read aloud/i,
        }
        )
    );

    const utterance =
        window.speechSynthesis.speak
        .mock.calls[0][0];

    await act(
        async () => {
        utterance.onstart();
        }
    );

    const stopReadingButton =
        screen.getByRole(
        "button",
        {
            name:
            /Stop/i,
        }
        );

    expect(
        stopReadingButton
    ).toBeInTheDocument();

    await user.click(
        stopReadingButton
    );

    expect(
        window.speechSynthesis.cancel
    ).toHaveBeenCalledTimes(
        2
    );

    expect(
        screen.getByRole(
        "button",
        {
            name:
            /Read aloud/i,
        }
        )
    ).toBeInTheDocument();
  });

  it("uploads an image and sends its base64 data to the backend", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    fetchMock.mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Image received",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    const {
        container,
    } =
        render(
        <App />
        );

    const imageInput =
        container.querySelector(
        'input[accept="image/png,image/jpeg,image/webp"]'
        );

    const file =
        new File(
        [
            "fake-image-bytes",
        ],
        "atrael-test.png",
        {
            type:
            "image/png",
        }
        );

    await user.upload(
        imageInput,
        file
    );

    expect(
        await screen.findByText(
        "atrael-test.png"
        )
    ).toBeInTheDocument();

    expect(
        screen.getByText(
        "Image ready"
        )
    ).toBeInTheDocument();

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Describe this image"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        fetchMock
    ).toHaveBeenCalledTimes(
        1
    );

    const [
        url,
        options,
    ] =
        fetchMock.mock.calls[0];

    expect(
        url
    ).toBe(
        "http://localhost:3050/api/chat"
    );

    const body =
        JSON.parse(
        options.body
        );

    expect(
        body.messages
    ).toHaveLength(1);

    expect(
        body.messages[0].role
    ).toBe(
        "user"
    );

    expect(
        body.messages[0].content
    ).toBe(
        "Describe this image"
    );

    expect(
        body.messages[0].images
    ).toHaveLength(1);

    expect(
        body.messages[0].images[0]
    ).toBe(
        btoa(
        "fake-image-bytes"
        )
    );
  });

  it("rejects an unsupported image type", () => {
    const alertMock =
        vi.spyOn(
        window,
        "alert"
        ).mockImplementation(
        () => {}
        );

    const {
        container,
    } =
        render(
        <App />
        );

    const imageInput =
        container.querySelector(
        'input[accept="image/png,image/jpeg,image/webp"]'
        );

    const invalidFile =
        new File(
        [
            "not-an-image",
        ],
        "atrael-test.exe",
        {
            type:
            "application/octet-stream",
        }
        );

    fireEvent.change(
        imageInput,
        {
        target: {
            files: [
            invalidFile,
            ],
        },
        }
    );

    expect(
        alertMock
    ).toHaveBeenCalledWith(
        "Use PNG, JPG, JPEG or WEBP."
    );

    expect(
        screen.queryByText(
        "atrael-test.exe"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.queryByText(
        "Image ready"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    ).toBeDisabled();
  });

  it("rejects an image larger than 8 MB", async () => {
    const user =
        userEvent.setup();

    const alertMock =
        vi.spyOn(
        window,
        "alert"
        ).mockImplementation(
        () => {}
        );

    const {
        container,
    } =
        render(
        <App />
        );

    const imageInput =
        container.querySelector(
        'input[accept="image/png,image/jpeg,image/webp"]'
        );

    const oversizedImage =
        new File(
        [
            new Uint8Array(
            8 * 1024 * 1024 + 1
            ),
        ],
        "too-large.png",
        {
            type:
            "image/png",
        }
        );

    await user.upload(
        imageInput,
        oversizedImage
    );

    expect(
        alertMock
    ).toHaveBeenCalledWith(
        "Image must be smaller than 8 MB."
    );

    expect(
        screen.queryByText(
        "too-large.png"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.queryByText(
        "Image ready"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    ).toBeDisabled();
  });

  it("uploads a document and shows it in the sidebar", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        ).mockResolvedValue({
        ok: true,

        json: async () => ({
            ok: true,
            documentId:
            "document-test-123",
            name:
            "notes.txt",
            type:
            "text",
            words:
            42,
            chars:
            250,
            chunks:
            2,
            metadata: {},
        }),
        });

    const {
        container,
    } =
        render(
        <App />
        );

    const documentInput =
        container.querySelector(
        'input[accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"]'
        );

    const file =
        new File(
        [
            "This is a test document for Atrael.",
        ],
        "notes.txt",
        {
            type:
            "text/plain",
        }
        );

    await user.upload(
        documentInput,
        file
    );

    expect(
        await screen.findByText(
        "notes.txt"
        )
    ).toBeInTheDocument();

    expect(
        screen.getByText(
        "42 words"
        )
    ).toBeInTheDocument();

    expect(
        screen.getByText(
        "2 chunks"
        )
    ).toBeInTheDocument();

    expect(
        fetchMock
    ).toHaveBeenCalledTimes(
        1
    );

    const [
        url,
        options,
    ] =
        fetchMock.mock.calls[0];

    expect(
        url
    ).toBe(
        "http://localhost:3050/api/files/upload"
    );

    expect(
        options.method
    ).toBe(
        "POST"
    );

    expect(
        options.body
    ).toBeInstanceOf(
        FormData
    );

    const uploadedFile =
        options.body.get(
        "file"
        );

    expect(
        uploadedFile
    ).toBeInstanceOf(
        File
    );

    expect(
        uploadedFile.name
    ).toBe(
        "notes.txt"
    );
  });

  it("sends document questions to the document analysis endpoint", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    // 1. Document upload
    fetchMock.mockResolvedValueOnce({
        ok: true,

        json: async () => ({
        ok: true,
        documentId:
            "document-test-456",
        name:
            "report.txt",
        type:
            "text",
        words:
            100,
        chars:
            600,
        chunks:
            3,
        metadata: {},
        }),
    });

    // 2. Document analysis stream
    fetchMock.mockResolvedValueOnce({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Document analyzed",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    const {
        container,
    } =
        render(
        <App />
        );

    const documentInput =
        container.querySelector(
        'input[accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"]'
        );

    const file =
        new File(
        [
            "Document content",
        ],
        "report.txt",
        {
            type:
            "text/plain",
        }
        );

    await user.upload(
        documentInput,
        file
    );

    expect(
        await screen.findByText(
        "report.txt"
        )
    ).toBeInTheDocument();

    const textarea =
        screen.getByRole(
        "textbox"
        );

    await user.type(
        textarea,
        "Summarize this report"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Document analyzed"
        )
    ).toBeInTheDocument();

    expect(
        fetchMock
    ).toHaveBeenCalledTimes(
        2
    );

    const [
        url,
        options,
    ] =
        fetchMock.mock.calls[1];

    expect(
        url
    ).toBe(
        "http://localhost:3050/api/document/analyze"
    );

    expect(
        options.method
    ).toBe(
        "POST"
    );

    const body =
        JSON.parse(
        options.body
        );

    expect(
        body
    ).toEqual({
        documentId:
        "document-test-456",

        instruction:
        "Summarize this report",

        mode:
        "fast",

        model:
        "local",
    });
  });

  it("sends ATRAEL and QUALITY for document analysis", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    // 1. Upload document
    fetchMock.mockResolvedValueOnce({
        ok: true,

        json: async () => ({
        ok: true,
        documentId:
            "document-atrael-789",
        name:
            "analysis.txt",
        type:
            "text",
        words:
            120,
        chars:
            800,
        chunks:
            4,
        metadata: {},
        }),
    });

    // 2. Analysis stream
    fetchMock.mockResolvedValueOnce({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Atrael document analysis",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    const {
        container,
    } =
        render(
        <App />
        );

    await user.click(
      screen.getByRole("button", {
        name: /LOCAL.*Qwen 3\.5 4B/i,
      })
    );

    await user.click(
      screen.getByRole("button", {
        name: /FAST.*16K.*instant/i,
      })
    );

    const documentInput =
        container.querySelector(
        'input[accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"]'
        );

    const file =
        new File(
        [
            "Document content for Atrael",
        ],
        "analysis.txt",
        {
            type:
            "text/plain",
        }
        );

    await user.upload(
        documentInput,
        file
    );

    expect(
        await screen.findByText(
        "analysis.txt"
        )
    ).toBeInTheDocument();

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Analyze this deeply"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Atrael document analysis"
        )
    ).toBeInTheDocument();

    const [
        url,
        options,
    ] =
        fetchMock.mock.calls[1];

    expect(
        url
    ).toBe(
        "http://localhost:3050/api/document/analyze"
    );

    const body =
        JSON.parse(
        options.body
        );

    expect(
        body.documentId
    ).toBe(
        "document-atrael-789"
    );

    expect(
        body.instruction
    ).toBe(
        "Analyze this deeply"
    );

    expect(
        body.model
    ).toBe(
        "atrael"
    );

    expect(
        body.mode
    ).toBe(
        "quality"
    );
  });
  it("removes an uploaded document from the sidebar and backend", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    // 1. Upload
    fetchMock.mockResolvedValueOnce({
        ok: true,

        json: async () => ({
        ok: true,
        documentId:
            "document-remove-123",
        name:
            "remove-me.txt",
        type:
            "text",
        words:
            50,
        chars:
            300,
        chunks:
            2,
        metadata: {},
        }),
    });

    // 2. DELETE
    fetchMock.mockResolvedValueOnce({
        ok: true,
    });

    const {
        container,
    } =
        render(
        <App />
        );

    const documentInput =
        container.querySelector(
        'input[accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"]'
        );

    const file =
        new File(
        [
            "Temporary document",
        ],
        "remove-me.txt",
        {
            type:
            "text/plain",
        }
        );

    await user.upload(
        documentInput,
        file
    );

    expect(
        await screen.findByText(
        "remove-me.txt"
        )
    ).toBeInTheDocument();

    const documentCard =
        screen
        .getByText(
            "remove-me.txt"
        )
        .closest(
            ".selected-document"
        );

    const removeButton =
        documentCard.querySelector(
        "button"
        );

    await user.click(
        removeButton
    );

    expect(
        screen.queryByText(
        "remove-me.txt"
        )
    ).not.toBeInTheDocument();

    expect(
        fetchMock
    ).toHaveBeenCalledTimes(
        2
    );

    const [
        url,
        options,
    ] =
        fetchMock.mock.calls[1];

    expect(
        url
    ).toBe(
        "http://localhost:3050/api/files/document-remove-123"
    );

    expect(
        options.method
    ).toBe(
        "DELETE"
    );

    expect(
        screen.getByText(
        "No file selected"
        )
    ).toBeInTheDocument();
  });

  it("handles a document upload error without selecting the document", async () => {
    const user =
        userEvent.setup();

    const alertMock =
        vi.spyOn(
        window,
        "alert"
        ).mockImplementation(
        () => {}
        );

    vi.spyOn(
        console,
        "error"
    ).mockImplementation(
        () => {}
    );

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        ).mockResolvedValue({
        ok: false,

        json: async () => ({
            error:
            "Document could not be parsed.",
        }),
        });

    const {
        container,
    } =
        render(
        <App />
        );

    const documentInput =
        container.querySelector(
        'input[accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"]'
        );

    const file =
        new File(
        [
            "Broken document",
        ],
        "broken.txt",
        {
            type:
            "text/plain",
        }
        );

    await user.upload(
        documentInput,
        file
    );

    expect(
        alertMock
    ).toHaveBeenCalledWith(
        "Document could not be parsed."
    );

    expect(
        screen.queryByText(
        "broken.txt"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.getByText(
        "No file selected"
        )
    ).toBeInTheDocument();

    expect(
        fetchMock
    ).toHaveBeenCalledTimes(
        1
    );

    expect(
        screen.getByRole(
        "button",
        {
            name:
            /Document/i,
        }
        )
    ).toBeEnabled();
  });

  it("shows a chat error and restores the Send button", async () => {
    const user =
        userEvent.setup();

    vi.spyOn(
        console,
        "error"
    ).mockImplementation(
        () => {}
    );

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockResolvedValue({
        ok: false,

        text: async () =>
        "Ollama is not responding",
    });

    render(
        <App />
    );

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Hello"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "⚠️ Ollama is not responding"
        )
    ).toBeInTheDocument();

    expect(
        screen.queryByRole(
        "button",
        {
            name:
            /^Stop$/i,
        }
        )
    ).not.toBeInTheDocument();

    expect(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    ).toBeInTheDocument();
  });

  it("stops read aloud when Clear Chat is clicked", async () => {
    const user =
        userEvent.setup();

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "This response is being spoken",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    render(
        <App />
    );

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Speak"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "This response is being spoken"
        )
    ).toBeInTheDocument();

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /Read aloud/i,
        }
        )
    );

    const utterance =
        window.speechSynthesis.speak
        .mock.calls[0][0];

    await act(
        async () => {
        utterance.onstart();
        }
    );

    expect(
        screen.getByRole(
        "button",
        {
            name:
            /Stop/i,
        }
        )
    ).toBeInTheDocument();

    const cancelCallsBeforeClear =
        window.speechSynthesis.cancel
        .mock.calls.length;

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /Clear Chat/i,
        }
        )
    );

    expect(
        window.speechSynthesis.cancel
        .mock.calls.length
    ).toBe(
        cancelCallsBeforeClear + 1
    );
  });

  it("deletes the selected document from the backend when Clear Chat is clicked", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    // 1. Upload document
    fetchMock.mockResolvedValueOnce({
        ok: true,

        json: async () => ({
        ok: true,
        documentId:
            "document-clear-123",
        name:
            "clear-me.txt",
        type:
            "text",
        words:
            25,
        chars:
            150,
        chunks:
            1,
        metadata: {},
        }),
    });

    // 2. DELETE triggered by Clear Chat
    fetchMock.mockResolvedValueOnce({
        ok: true,
    });

    const {
        container,
    } =
        render(
        <App />
        );

    const documentInput =
        container.querySelector(
        'input[accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"]'
        );

    const file =
        new File(
        [
            "Temporary document",
        ],
        "clear-me.txt",
        {
            type:
            "text/plain",
        }
        );

    await user.upload(
        documentInput,
        file
    );

    expect(
        await screen.findByText(
        "clear-me.txt"
        )
    ).toBeInTheDocument();

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /Clear Chat/i,
        }
        )
    );

    expect(
        fetchMock
    ).toHaveBeenCalledTimes(
        2
    );

    const [
        deleteUrl,
        deleteOptions,
    ] =
        fetchMock.mock.calls[1];

    expect(
        deleteUrl
    ).toBe(
        "http://localhost:3050/api/files/document-clear-123"
    );

    expect(
        deleteOptions.method
    ).toBe(
        "DELETE"
    );

    expect(
        screen.queryByText(
        "clear-me.txt"
        )
    ).not.toBeInTheDocument();

    expect(
        screen.getByText(
        "No file selected"
        )
    ).toBeInTheDocument();
  });

  it("labels an ATRAEL response as Atrael instead of Qwen", async () => {
    const user =
        userEvent.setup();

    vi.spyOn(
        globalThis,
        "fetch"
    ).mockResolvedValue({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Response from the 27B model",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    const {
        container,
    } =
        render(
        <App />
        );

    await user.click(
      screen.getByRole("button", {
        name: /LOCAL.*Qwen 3\.5 4B/i,
      })
    );

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Who are you?"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Response from the 27B model"
        )
    ).toBeInTheDocument();

    const assistantRole =
        container.querySelector(
        ".message.assistant .role"
        );

    expect(
        assistantRole
    ).toHaveTextContent(
        "Atrael"
    );

    expect(
        assistantRole
    ).not.toHaveTextContent(
        "Qwen"
    );
  });

  it("preserves the model identity of previous assistant messages", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    // LOCAL response
    fetchMock.mockResolvedValueOnce({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Response from LOCAL",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    // ATRAEL response
    fetchMock.mockResolvedValueOnce({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Response from ATRAEL",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    const {
        container,
    } =
        render(
        <App />
        );

    const textarea =
        screen.getByRole(
        "textbox"
        );

    // First message uses LOCAL
    await user.type(
        textarea,
        "First question"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Response from LOCAL"
        )
    ).toBeInTheDocument();

    // Switch to ATRAEL
    await user.click(
      screen.getByRole("button", {
        name: /LOCAL.*Qwen 3\.5 4B/i,
      })
    );

    // Second message uses ATRAEL
    await user.type(
        textarea,
        "Second question"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Response from ATRAEL"
        )
    ).toBeInTheDocument();

    const assistantMessages =
        container.querySelectorAll(
        ".message.assistant"
        );

    expect(
        assistantMessages
    ).toHaveLength(2);

    expect(
        assistantMessages[0]
        .querySelector(
            ".role"
        )
    ).toHaveTextContent(
        "Qwen"
    );

    expect(
        assistantMessages[1]
        .querySelector(
            ".role"
        )
    ).toHaveTextContent(
        "Atrael"
    );
  });

  it("labels an ATRAEL document response as Atrael", async () => {
    const user =
        userEvent.setup();

    const fetchMock =
        vi.spyOn(
        globalThis,
        "fetch"
        );

    // 1. Upload
    fetchMock.mockResolvedValueOnce({
        ok: true,

        json: async () => ({
        ok: true,
        documentId:
            "document-atrael-label",
        name:
            "atrael-report.txt",
        type:
            "text",
        words:
            80,
        chars:
            500,
        chunks:
            2,
        metadata: {},
        }),
    });

    // 2. Document analysis
    fetchMock.mockResolvedValueOnce({
        ok: true,

        body: {
        getReader() {
            let sent =
            false;

            return {
            async read() {
                if (sent) {
                return {
                    done: true,
                    value: undefined,
                };
                }

                sent =
                true;

                const payload =
                [
                    JSON.stringify({
                    type:
                        "token",

                    content:
                        "Atrael analyzed the document",
                    }),

                    JSON.stringify({
                    type:
                        "done",
                    }),
                ].join("\n") +
                "\n";

                return {
                done: false,

                value:
                    new TextEncoder().encode(
                    payload
                    ),
                };
            },
            };
        },
        },
    });

    const {
        container,
    } =
        render(
        <App />
        );

    await user.click(
      screen.getByRole("button", {
        name: /LOCAL.*Qwen 3\.5 4B/i,
      })
    );

    const documentInput =
        container.querySelector(
        'input[accept=".pdf,.docx,.txt,.md,.xlsx,.xls,.csv"]'
        );

    await user.upload(
        documentInput,
        new File(
        [
            "Document for Atrael",
        ],
        "atrael-report.txt",
        {
            type:
            "text/plain",
        }
        )
    );

    expect(
        await screen.findByText(
        "atrael-report.txt"
        )
    ).toBeInTheDocument();

    await user.type(
        screen.getByRole(
        "textbox"
        ),
        "Analyze this"
    );

    await user.click(
        screen.getByRole(
        "button",
        {
            name:
            /^Send$/i,
        }
        )
    );

    expect(
        await screen.findByText(
        "Atrael analyzed the document"
        )
    ).toBeInTheDocument();

    const assistantRole =
        container.querySelector(
        ".message.assistant .role"
        );

    expect(
        assistantRole
    ).toHaveTextContent(
        "Atrael"
    );

    expect(
        assistantRole
    ).not.toHaveTextContent(
        "Qwen"
    );
  });
});