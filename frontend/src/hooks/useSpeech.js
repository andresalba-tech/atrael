import { useState, useEffect, useCallback } from "react";
import { cleanTextForSpeech, selectLocalVoice } from "../services/speechService";

export function useSpeech() {
  const [speakingMessage, setSpeakingMessage] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices() || [];
      setAvailableVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stopReading = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessage(null);
  }, []);

  const readAloud = useCallback((text, index) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    if (speakingMessage === index) {
      setSpeakingMessage(null);
      return;
    }

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = selectLocalVoice(availableVoices, cleanText);

    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    utterance.rate = 1;
    utterance.pitch = 0.9;
    utterance.volume = 1;

    utterance.onstart = () => {
      setSpeakingMessage(index);
    };

    utterance.onend = () => {
      setSpeakingMessage(null);
    };

    utterance.onerror = () => {
      setSpeakingMessage(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [availableVoices, speakingMessage]);

  return {
    speakingMessage,
    readAloud,
    stopReading,
  };
}
