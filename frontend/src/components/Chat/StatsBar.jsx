export function StatsBar({ stats }) {
  if (!stats) return null;

  return (
    <section className="stats">
      <span className="speed">
        ⚡ {stats.tokensPerSecond?.toFixed(1) || "—"} tok/s
      </span>

      {stats.document ? (
        <>
          <span>Chunks: {stats.chunksProcessed}</span>
          <span>Relevant: {stats.relevantChunks}</span>
          <span>Total: {(stats.elapsedMs / 1000).toFixed(1)}s</span>
          <span>{stats.mode}</span>
        </>
      ) : (
        <>
          <span>
            First token:{" "}
            {stats.ttftMs ? (stats.ttftMs / 1000).toFixed(2) : "—"}s
          </span>
          <span>Prompt: {stats.promptTokens}</span>
          <span>Generated: {stats.generatedTokens}</span>
          <span>Context: {stats.context}</span>
          <span>{stats.mode}</span>
        </>
      )}
    </section>
  );
}
