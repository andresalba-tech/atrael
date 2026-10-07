export function DocumentProgressBar({ documentProgress }) {
  if (!documentProgress) return null;

  const progressPercent =
    documentProgress.percent ??
    (documentProgress.current && documentProgress.total
      ? Math.round(
          (documentProgress.current / documentProgress.total) * 100
        )
      : 0);

  return (
    <section
      className="document-progress"
      style={{
        marginBottom: "10px",
      }}
    >
      <div className="document-progress-header">
        <strong>
          {documentProgress.stage === "analyzing" && "Analyzing document"}
          {documentProgress.stage === "consolidating" && "Consolidating findings"}
          {documentProgress.stage === "preparing-final-answer" &&
            "Preparing final answer"}
          {documentProgress.stage === "writing-final-answer" &&
            "Writing final answer"}
          {documentProgress.stage === "starting" && "Starting analysis"}
        </strong>

        {documentProgress.total && (
          <span>
            {documentProgress.current} / {documentProgress.total}
          </span>
        )}
      </div>

      {documentProgress.stage === "analyzing" && (
        <>
          <div className="progress-track">
            <div
              className="progress-value"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>

          <div className="progress-percent">{progressPercent}%</div>
        </>
      )}
    </section>
  );
}
