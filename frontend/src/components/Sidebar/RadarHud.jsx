export function RadarHud() {
  return (
    <div className="sidebar-hud" aria-hidden="true">
      <div className="radar-frame">
        <div className="radar-grid" />
        <div className="radar-sweep" />
        <div className="radar-crosshair" />
        <div className="radar-dot dot-1" />
        <div className="radar-dot dot-2" />
      </div>
      <div className="hud-readout">
        <span>SYS // NODE:3050</span>
        <span>GPU // RTX 4060 8GB</span>
        <span>NET // AIRGAPPED LOCAL</span>
      </div>
    </div>
  );
}
