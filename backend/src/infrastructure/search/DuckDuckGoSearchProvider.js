const ISearchProvider = require("../../domain/interfaces/ISearchProvider");

function decodeHtmlEntities(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function stripHtml(value = "") {
  return decodeHtmlEntities(
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function normalizeSearchUrl(href) {
  const decoded = decodeHtmlEntities(href || "");
  try {
    const absolute = decoded.startsWith("//") ? `https:${decoded}` : decoded;
    const url = new URL(absolute, "https://duckduckgo.com");
    const destination = url.searchParams.get("uddg");
    return destination || url.href;
  } catch {
    return decoded;
  }
}

class DuckDuckGoSearchProvider extends ISearchProvider {
  async search(query, limit = 5, recent = false) {
    if (!query) {
      return [];
    }

    const searchParams = {
      q: query,
      kl: "wt-wt",
      kp: "-1",
    };

    if (recent) {
      searchParams.df = "m";
    }

    const body = new URLSearchParams(searchParams);

    const response = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Web search failed with status ${response.status}`);
    }

    const html = await response.text();
    const links = [];
    const anchorRegex =
      /<a\b([^>]*)class="[^"]*result__a[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;

    let match;
    while ((match = anchorRegex.exec(html)) !== null) {
      const attributes = `${match[1]} ${match[2]}`;
      const hrefMatch = attributes.match(/\bhref="([^"]+)"/i);

      if (!hrefMatch) {
        continue;
      }

      links.push({
        title: stripHtml(match[3]),
        url: normalizeSearchUrl(hrefMatch[1]),
      });

      if (links.length >= limit) {
        break;
      }
    }

    const snippets = [
      ...html.matchAll(
        /<(?:a|div)\b[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/gi
      ),
    ].map((item) => stripHtml(item[1]));

    const results = links.map((result, index) => ({
      ...result,
      snippet: snippets[index] || "",
    }));

    if (results.length === 0) {
      throw new Error("No web search results were returned.");
    }

    return results;
  }
}

module.exports = DuckDuckGoSearchProvider;
