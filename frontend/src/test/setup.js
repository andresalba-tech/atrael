import "@testing-library/jest-dom/vitest";

import {
  cleanup,
} from "@testing-library/react";

import {
  afterEach,
  vi,
} from "vitest";

afterEach(() => {
  cleanup();
});

Object.defineProperty(
  window,
  "speechSynthesis",
  {
    writable: true,

    value: {
      getVoices:
        vi.fn(() => []),

      addEventListener:
        vi.fn(),

      removeEventListener:
        vi.fn(),

      speak:
        vi.fn(),

      cancel:
        vi.fn(),
    },
  }
);

Object.defineProperty(
  HTMLElement.prototype,
  "scrollIntoView",
  {
    configurable: true,

    value:
      vi.fn(),
  }
);

class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.voice = null;
    this.lang = "";
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

Object.defineProperty(
  globalThis,
  "SpeechSynthesisUtterance",
  {
    configurable: true,
    writable: true,
    value: MockSpeechSynthesisUtterance,
  }
);