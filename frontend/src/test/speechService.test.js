import { describe, it, expect } from "vitest";
import { cleanTextForSpeech, selectLocalVoice } from "../services/speechService";

describe("speechService", () => {
  describe("cleanTextForSpeech", () => {
    it("returns empty string for null, undefined or empty input", () => {
      expect(cleanTextForSpeech("")).toBe("");
      expect(cleanTextForSpeech(null)).toBe("");
      expect(cleanTextForSpeech(undefined)).toBe("");
    });

    it("replaces fenced code blocks with readable placeholder", () => {
      const input = "Here is some code:\n```javascript\nconsole.log('hello');\n```\nEnjoy it.";
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toContain("Code block omitted.");
      expect(cleaned).not.toContain("console.log");
    });

    it("strips markdown headers, bold, italics and inline code marks", () => {
      const input = "# Main Title\nThis is **bold**, *italic*, and `inline code`.";
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toBe("Main Title This is bold, italic, and inline code.");
    });

    it("preserves link text but removes markdown link and image syntax", () => {
      const input = "Check ![image](http://example.com/pic.png) and visit [Google](https://google.com).";
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toBe("Check and visit Google.");
    });

    it("normalizes double newlines to sentence periods for natural speech pauses", () => {
      const input = "Paragraph one.\n\nParagraph two.";
      const cleaned = cleanTextForSpeech(input);
      expect(cleaned).toBe("Paragraph one.. Paragraph two.");
    });
  });

  describe("selectLocalVoice", () => {
    const mockVoices = [
      { name: "Microsoft David - English (United States)", lang: "en-US" },
      { name: "Microsoft Jorge Natural - Spanish (Spain)", lang: "es-ES" },
      { name: "Microsoft Francisca Natural - Portuguese (Brazil)", lang: "pt-BR" },
      { name: "Microsoft Antonio Natural - Portuguese (Portugal)", lang: "pt-PT" },
      { name: "Microsoft Guy Natural - English (United States)", lang: "en-US" },
    ];

    it("returns null if availableVoices is empty or null", () => {
      expect(selectLocalVoice([], "Hello world")).toBeNull();
      expect(selectLocalVoice(null, "Hello world")).toBeNull();
    });

    it("selects best matching English voice for English text", () => {
      const text = "Hello, this is a test to verify that the speech system sounds great and natural.";
      const voice = selectLocalVoice(mockVoices, text);
      expect(voice.lang).toBe("en-US");
      expect(voice.name).toContain("Guy"); // Guy Natural male matches top priority
    });

    it("selects Spanish voice for Spanish text", () => {
      const text = "Hola, esta es una prueba para verificar que el sistema en español funciona muy bien.";
      const voice = selectLocalVoice(mockVoices, text);
      expect(voice.lang).toBe("es-ES");
      expect(voice.name).toContain("Jorge");
    });

    it("selects Portuguese voice for Portuguese text", () => {
      const text = "Olá, esta é uma mensagem de teste com você para verificar que a voz está funcionando.";
      const voice = selectLocalVoice(mockVoices, text);
      expect(voice.lang).toBe("pt-PT"); // Antonio Natural male
    });

    it("falls back to the first available voice if preferred language has no matches", () => {
      const englishOnlyVoices = [
        { name: "Generic Voice", lang: "en-US" },
      ];
      const text = "Texto en español sin voces disponibles.";
      const voice = selectLocalVoice(englishOnlyVoices, text);
      expect(voice).toBe(englishOnlyVoices[0]);
    });
  });
});
