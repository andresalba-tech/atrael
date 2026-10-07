/**
 * Strips markdown and formatted syntax from text so TTS sounds natural.
 */
export function cleanTextForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, " Code block omitted. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s?/g, "")
    .replace(/[*_~>|]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MALE_IDENTIFIERS = [
  "jorge", "gonzalo", "alonso", "alvaro", "álvaro", "raul", "raúl",
  "mateo", "enrique", "manuel", "carlos", "pablo", "diego",
  "antonio", "antônio", "julio", "júlio", "duarte", "rodrigo", "tiago", "fabio", "fábio",
  "guy", "davis", "david", "mark", "george", "ryan", "andrew", "brian", "christopher",
  "male"
];

const FEMALE_IDENTIFIERS = [
  "dalia", "elvira", "elena", "sabina", "helena", "laura", "paloma", "sofia", "camila", "monica", "mónica",
  "francisca", "thalita", "raquel", "fernanda", "leticia", "letícia",
  "jenny", "aria", "zira", "ana", "sonia", "sara", "emma", "michelle",
  "female"
];

function isMaleVoice(voice) {
  const name = (voice.name || "").toLowerCase();
  const hasMaleId = MALE_IDENTIFIERS.some((id) => name.includes(id));
  const hasFemaleId = FEMALE_IDENTIFIERS.some((id) => name.includes(id));
  return hasMaleId && !hasFemaleId;
}

function pickBestVoice(voices) {
  if (!voices || voices.length === 0) return null;
  return (
    voices.find((v) => isMaleVoice(v) && v.name?.toLowerCase().includes("natural")) ||
    voices.find((v) => isMaleVoice(v)) ||
    voices.find((v) => v.name?.toLowerCase().includes("natural")) ||
    voices.find((v) => v.name?.toLowerCase().includes("microsoft")) ||
    voices[0]
  );
}

/**
 * Heuristic selection of local voice based on language and naturalness.
 */
export function selectLocalVoice(availableVoices, text) {
  if (!availableVoices || availableVoices.length === 0) {
    return null;
  }

  // Language detection using unambiguous tokens and frequency scoring
  const ptCharCount = (text.match(/[ãõçÃÕÇ]/g) || []).length;
  const esCharCount = (text.match(/[¿¡ñÑ]/g) || []).length;

  // English markers that never appear in Portuguese or Spanish:
  const englishWords =
    /\b(the|this|that|these|those|with|from|have|has|had|what|which|where|when|who|how|there|their|they|them|your|you|would|could|should|about|been|will|just|like|some|into|other|than|then|hello|please|because|think|know|make|good|first|after|before)\b/gi;

  // Spanish markers that do not collide with English:
  const spanishWords =
    /\b(el|los|las|del|al|por|como|esto|esta|estos|estas|puede|pueden|tiene|tienen|sus|pero|sobre|entre|cuando|todo|todos|también|tambien|hacer|desde|nosotros|ustedes|bien|hola|gracias|bueno|buena|buenas|buenos|porque|entonces|ahora|siempre|nunca)\b/gi;

  // Portuguese markers that do not collide with English:
  const portugueseWords =
    /\b(não|você|voce|vocês|voces|está|estão|estao|isso|isto|aquilo|uma|umas|dos|das|são|sao|mais|fazer|também|tambem|muito|muitos|obrigado|obrigada|qualquer|então|entao|quando|pelo|pela|pelos|pelas|ele|ela|eles|elas|seus|suas|olá|ola|abraço|abraco|com|conversa|têm)\b/gi;

  const enMatches = (text.match(englishWords) || []).length;
  const esMatches = (text.match(spanishWords) || []).length + (esCharCount * 2);
  const ptMatches = (text.match(portugueseWords) || []).length + (ptCharCount * 2);

  let preferredLanguage = "en";

  if (esMatches > enMatches && esMatches >= ptMatches) {
    preferredLanguage = "es";
  } else if (ptMatches > enMatches && ptMatches > esMatches) {
    preferredLanguage = "pt";
  } else if (enMatches >= esMatches && enMatches >= ptMatches && enMatches > 0) {
    preferredLanguage = "en";
  } else if (esCharCount > ptCharCount) {
    preferredLanguage = "es";
  } else if (ptCharCount > esCharCount) {
    preferredLanguage = "pt";
  }

  const langVoices = availableVoices.filter((voice) =>
    voice.lang?.toLowerCase().startsWith(preferredLanguage)
  );

  return pickBestVoice(langVoices.length > 0 ? langVoices : availableVoices);
}
