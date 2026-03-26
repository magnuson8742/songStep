import type { SongStepProject } from "../../domain/project/projectModel";
import type { GpRenderDebugInfo, GpScoreOverviewRuntimeInfo, GpTrackInfo } from "../gpRendering/alphaTabGpRenderer";

export interface ProjectScreenActions {
  statusMessage: string | null;
  tracks: GpTrackInfo[];
  selectedTrackIndex: number;
  requestedTrackIndex: number | null;
  lastClickedTrackIndex: number | null;
  clickCounter: number;
  lastClickTimestampIso: string | null;
  selectionFired: boolean;
  confirmedActiveTrackIndex: number | null;
  debugInfo: GpRenderDebugInfo | null;
  scoreTitle: string | null;
  sourceFileName: string;
  playbackPositionLabel: string | null;
  currentBar: number | null;
  currentTick: number | null;
  totalBars: number | null;
  tempoBpm: number | null;
  playbackIsPlaying: boolean | null;
  playerPositionPayloadShape: string | null;
  playerStatePayloadShape: string | null;
  currentBarSourcePath: string | null;
  playbackFollowTargetFound: boolean;
  playbackFollowSource: string | null;
  playbackBarAnchorCount: number;
  playbackBarAnchorSource: string | null;
  playbackAnchorStrategyAttempts: string | null;
  renderHostHasSvg: boolean;
  renderHostChildTags: string | null;
  renderHostTopTagClassCombos: string | null;
  renderHostElementCounts: string | null;
  scoreOverview: GpScoreOverviewRuntimeInfo | null;
  trackVolumeByIndex: Record<number, number>;
  trackBalanceByIndex: Record<number, number>;
  masterVolume: number;
  masterBalance: number;
  mutedTrackIndexes: number[];
  soloTrackIndexes: number[];
  onTrackSelectionChange: (trackIndex: number) => void;
  onToggleTrackMute: (trackIndex: number) => void;
  onToggleTrackSolo: (trackIndex: number) => void;
  onTrackVolumeChange: (trackIndex: number, volume: number) => void;
  onTrackBalanceChange: (trackIndex: number, balance: number) => void;
  onMasterVolumeChange: (volume: number) => void;
  onMasterBalanceChange: (balance: number) => void;
  onBackToHome: () => void;
  onSaveProject: () => Promise<void>;
  onSaveProjectAs: () => Promise<void>;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

const DEFAULT_TRACK_VOLUME = 80;
const DEFAULT_TRACK_BALANCE = 0;

function renderDebugValue(value: string | number | null): string {
  if (value === null || value === "") {
    return "-";
  }

  return String(value);
}

function formatRuntimeTrackList(debugRows: GpRenderDebugInfo["scoreTracks"] | undefined): string {
  if (!debugRows || debugRows.length === 0) {
    return "(empty)";
  }

  return debugRows
    .map(
      (row) =>
        `pos=${row.position} | track.index=${row.trackIndex} | name=${row.trackName || "(unnamed)"} | totalBars=${row.totalBars} | totalNotes=${row.totalNotes} | firstNonEmptyBarIndex=${row.firstNonEmptyBarIndex ?? "-"}`,
    )
    .join("\n");
}

function renderTrackStrip(
  tracks: GpTrackInfo[],
  confirmedActiveTrackIndex: number | null,
  mutedTrackIndexes: number[],
  soloTrackIndexes: number[],
  trackVolumeByIndex: Record<number, number>,
  trackBalanceByIndex: Record<number, number>,
): string {
  if (tracks.length === 0) {
    return '<p class="helperText">Loading tracks...</p>';
  }

  return tracks
    .map((track) => {
      const isActive = confirmedActiveTrackIndex === track.index;
      const activeClass = isActive ? "trackStripItem isActiveTrack" : "trackStripItem";

      return `
        <article class="${activeClass}" data-track-item-index="${track.index}" role="button" tabindex="0" aria-label="Select track ${track.name}">
          <div class="trackControlRow trackControlRowCompact" aria-label="Track controls for ${track.name}">
            <span class="trackNameCompact" title="${track.name}">${track.name}</span>
            <button class="secondaryButton trackControlButton ${soloTrackIndexes.includes(track.index) ? "isTrackToggleOn" : ""}" type="button" data-stop-track-select="true" data-track-action="toggle-solo" data-track-index="${track.index}">S</button>
            <button class="secondaryButton trackControlButton ${mutedTrackIndexes.includes(track.index) ? "isTrackToggleOn" : ""}" type="button" data-stop-track-select="true" data-track-action="toggle-mute" data-track-index="${track.index}">M</button>
            <label class="trackControlLabel trackControlLabelCompact">
              <input class="trackControlRange" type="range" min="0" max="100" value="${trackVolumeByIndex[track.index] ?? DEFAULT_TRACK_VOLUME}" data-stop-track-select="true" data-track-action="set-volume" data-track-volume-index="${track.index}" />
              <span class="trackControlValue" data-track-volume-value="${track.index}">${trackVolumeByIndex[track.index] ?? DEFAULT_TRACK_VOLUME}</span>
            </label>
            <label class="trackControlLabel trackControlLabelCompact">
              <input class="trackControlRange" type="range" min="-50" max="50" value="${trackBalanceByIndex[track.index] ?? DEFAULT_TRACK_BALANCE}" data-stop-track-select="true" data-track-action="set-balance" data-track-balance-index="${track.index}" />
              <span class="trackControlValue" data-track-balance-value="${track.index}">${trackBalanceByIndex[track.index] ?? DEFAULT_TRACK_BALANCE}</span>
            </label>
          </div>
        </article>
      `;
    })
    .join("");
}

function openDebugWindow(actions: ProjectScreenActions): void {
  const debugInfo = actions.debugInfo;
  const debugWindow = window.open("", "songstep-debug-window", "width=980,height=760,resizable,scrollbars");
  if (!debugWindow) {
    return;
  }

  const rows: Array<[string, string]> = [
    ["Selected track index", renderDebugValue(actions.selectedTrackIndex)],
    ["Requested track index", renderDebugValue(actions.requestedTrackIndex)],
    ["Last clicked track", renderDebugValue(actions.lastClickedTrackIndex)],
    ["Click counter", renderDebugValue(actions.clickCounter)],
    ["Last click timestamp", renderDebugValue(actions.lastClickTimestampIso)],
    ["Selection fired", actions.selectionFired ? "yes" : "no"],
    ["Confirmed active track", renderDebugValue(debugInfo?.confirmedActiveTrackName ?? null)],
    ["Confirmed active track index", renderDebugValue(debugInfo?.confirmedActiveTrackIndex ?? null)],
    ["Renderer busy", debugInfo?.rendererBusy ? "yes" : "no"],
    ["Render cycle counter", renderDebugValue(debugInfo?.renderCycleCounter ?? 0)],
    ["Render mode", renderDebugValue(debugInfo?.renderMode ?? null)],
    ["Current bar source", renderDebugValue(actions.currentBarSourcePath)],
    ["Current tick", renderDebugValue(actions.currentTick)],
    ["Anchor count", renderDebugValue(actions.playbackBarAnchorCount)],
    ["Anchor source", renderDebugValue(actions.playbackBarAnchorSource)],
    ["Anchor attempts", renderDebugValue(actions.playbackAnchorStrategyAttempts)],
    ["Render host has svg", actions.renderHostHasSvg ? "yes" : "no"],
  ];

  debugWindow.document.title = "SongStep Debug";
  debugWindow.document.body.innerHTML = `
    <main style="font-family: Inter, sans-serif; margin:0; padding:16px; background:#10141c; color:#e8eef9;">
      <h1 style="margin:0 0 12px;">SongStep Debug</h1>
      <dl style="display:grid; grid-template-columns:1fr auto; gap:6px 12px; margin:0;">
        ${rows.map(([label, value]) => `<dt style="color:#9fb1cc;">${label}</dt><dd style="margin:0;font-weight:600;">${value}</dd>`).join("")}
      </dl>
      <h2 style="margin:16px 0 8px;">Loaded score tracks</h2>
      <pre style="background:#0b0f16;border:1px solid #2a3446;padding:10px;overflow:auto;">${formatRuntimeTrackList(debugInfo?.scoreTracks)}</pre>
      <h2 style="margin:16px 0 8px;">Currently rendered api.tracks</h2>
      <pre style="background:#0b0f16;border:1px solid #2a3446;padding:10px;overflow:auto;">${formatRuntimeTrackList(debugInfo?.renderedTracks)}</pre>
    </main>
  `;
}

export function renderProjectScreen(
  container: HTMLElement,
  project: SongStepProject,
  actions: ProjectScreenActions,
): void {
  const statusBanner = actions.statusMessage
    ? `<p class="statusBanner playerStatusBanner" role="status" data-status-banner="true">${actions.statusMessage}</p>`
    : "";

  container.innerHTML = `
    <main class="playerLayoutShell">
      <header class="playerMenuBar">
        <div class="playerMenuGroup">
          <details class="playerMenuDetails">
            <summary>File</summary>
            <button type="button" class="playerMenuItem" data-action="save-project-as">Save Project As</button>
            <button type="button" class="playerMenuItem" data-action="back-home">Main Menu</button>
          </details>
          <details class="playerMenuDetails">
            <summary>Debug</summary>
            <button type="button" class="playerMenuItem" data-action="open-debug-window">Open Debug Window</button>
          </details>
        </div>
      </header>

      <section class="playerTopHeader">
        <div class="playerTopHeaderMain">
          <div class="playerTopMeta">
            <h1 class="playerTopTitle">${project.title}</h1>
            <p class="appSubtitle">Source: ${actions.sourceFileName}</p>
          </div>
          <div class="playerTransport">
            <button class="primaryButton" type="button" data-action="play">Play</button>
            <button class="secondaryButton" type="button" data-action="pause">Pause</button>
            <button class="secondaryButton" type="button" data-action="stop">Stop</button>
          </div>
        </div>
        <dl class="playerTopInfo">
          <dt>Song</dt>
          <dd data-player-field="score-title">${renderDebugValue(actions.scoreTitle)}</dd>
          <dt>Active track</dt>
          <dd data-player-field="active-track-name">${renderDebugValue(actions.confirmedActiveTrackIndex === null ? null : actions.tracks.find((track) => track.index === actions.confirmedActiveTrackIndex)?.name ?? null)}</dd>
          <dt>Bar</dt>
          <dd data-player-field="current-bar">${renderDebugValue(actions.currentBar)} / <span data-player-field="total-bars">${renderDebugValue(actions.totalBars)}</span></dd>
          <dt>Time</dt>
          <dd data-player-field="playback-position">${renderDebugValue(actions.playbackPositionLabel)}</dd>
          <dt>BPM</dt>
          <dd data-player-field="tempo">${actions.tempoBpm === null ? "-" : `${actions.tempoBpm} BPM`}</dd>
          <dt>State</dt>
          <dd data-player-field="playback-state">${actions.playbackIsPlaying === null ? "-" : actions.playbackIsPlaying ? "playing" : "paused/stopped"}</dd>
        </dl>
        ${statusBanner}
      </section>

      <section class="playerTabViewportShell">
        <div class="playerTabViewport">
          <div id="gpRenderHost" class="gpRenderHost" aria-label="GP tablature render area"></div>
        </div>
      </section>

      <section class="playerBottomDock">
        <div class="playerDockResizeHandle" data-dock-resize-handle="true" role="separator" aria-label="Resize bottom dock" aria-orientation="horizontal"></div>
        <div class="playerDockHeaders">
          <div class="playerDockLeftHeader">Tracks / Controls</div>
          <div class="playerDockRightHeader">Timeline</div>
        </div>
        <div class="playerDockTopBand">
          <div class="playerDockLeftTopHeader">
            <span class="playerDockLeftHeaderName">Name</span>
            <span class="playerDockLeftHeaderVolume">Volume</span>
            <span class="playerDockLeftHeaderBalance">Balance</span>
          </div>
          <div class="playerDockRightTopHeader" data-dock-horizontal-sync="true">
            <div class="arrangementOverview arrangementOverviewDock" data-arrangement-overview="true">
              <div class="arrangementBarHeader" data-arrangement-bar-header></div>
            </div>
          </div>
        </div>
        <div class="playerDockMiddleScroll" data-dock-middle-scroll="true">
          <div class="playerDockLeftMiddle" data-action="left-controls">
            <div class="trackStrip trackStripDock" aria-label="Track strip" data-action="track-strip">
              ${renderTrackStrip(
                actions.tracks,
                actions.confirmedActiveTrackIndex,
                actions.mutedTrackIndexes,
                actions.soloTrackIndexes,
                actions.trackVolumeByIndex,
                actions.trackBalanceByIndex,
              )}
            </div>
          </div>
          <div class="playerDockRightMiddle timelineViewport" data-dock-horizontal-sync="true">
            <div class="arrangementOverview arrangementOverviewDock" data-arrangement-overview="true">
              <p class="helperText" data-arrangement-empty>${actions.scoreOverview ? "" : "Overview loads with score runtime data."}</p>
              <div class="arrangementRows" data-arrangement-rows></div>
            </div>
          </div>
        </div>
        <div class="playerDockBottomBand">
          <div class="playerDockLeftBottomFooter" data-action="left-controls">
            <article class="trackStripItem masterTrackRow" data-stop-track-select="true" aria-label="Master row placeholder">
              <div class="trackControlRow trackControlRowCompact masterTrackControlRow">
                <span class="trackNameCompact">Master</span>
                <label class="trackControlLabel trackControlLabelCompact">
                  <input class="trackControlRange" type="range" min="0" max="100" value="${actions.masterVolume}" data-stop-track-select="true" data-master-action="set-volume" />
                  <span class="trackControlValue" data-master-volume-value="true">${actions.masterVolume}</span>
                </label>
                <label class="trackControlLabel trackControlLabelCompact">
                  <input class="trackControlRange" type="range" min="-50" max="50" value="${actions.masterBalance}" data-stop-track-select="true" data-master-action="set-balance" />
                  <span class="trackControlValue" data-master-balance-value="true">${actions.masterBalance}</span>
                </label>
              </div>
            </article>
          </div>
          <div class="playerDockRightBottomFooter" data-dock-horizontal-sync="true">
            <div class="arrangementOverview arrangementOverviewDock" data-arrangement-overview="true">
              <div class="arrangementMarkers" data-arrangement-markers></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;

  const saveProjectAsButton = container.querySelector<HTMLButtonElement>('[data-action="save-project-as"]');
  const playButton = container.querySelector<HTMLButtonElement>('[data-action="play"]');
  const pauseButton = container.querySelector<HTMLButtonElement>('[data-action="pause"]');
  const stopButton = container.querySelector<HTMLButtonElement>('[data-action="stop"]');
  const backHomeButton = container.querySelector<HTMLButtonElement>('[data-action="back-home"]');
  const openDebugWindowButton = container.querySelector<HTMLButtonElement>('[data-action="open-debug-window"]');
  const leftControls = container.querySelectorAll<HTMLElement>('[data-action="left-controls"]');

  const handleTrackSelection = (eventTarget: EventTarget | null): void => {
    const targetElement = eventTarget instanceof Element ? eventTarget : null;
    if (targetElement?.closest("[data-stop-track-select='true']")) {
      return;
    }

    const trackCard = targetElement?.closest<HTMLElement>("[data-track-item-index]");
    if (!trackCard) {
      return;
    }

    const trackIndex = Number(trackCard.dataset.trackItemIndex);
    if (Number.isNaN(trackIndex)) {
      return;
    }

    actions.onTrackSelectionChange(trackIndex);
  };

  leftControls.forEach((leftControl) => leftControl.addEventListener("click", (event) => {
    const targetElement = event.target instanceof Element ? event.target : null;
    const trackActionButton = targetElement?.closest<HTMLElement>("[data-track-action]");
    if (trackActionButton) {
      const trackIndex = Number(trackActionButton.dataset.trackIndex);
      if (Number.isNaN(trackIndex)) {
        return;
      }

      if (trackActionButton.dataset.trackAction === "toggle-mute") {
        actions.onToggleTrackMute(trackIndex);
        return;
      }

      if (trackActionButton.dataset.trackAction === "toggle-solo") {
        actions.onToggleTrackSolo(trackIndex);
        return;
      }

      if (trackActionButton.dataset.trackAction === "set-volume") {
        const slider = trackActionButton as HTMLInputElement;
        actions.onTrackVolumeChange(trackIndex, Number(slider.value));
        return;
      }

      if (trackActionButton.dataset.trackAction === "set-balance") {
        const knob = trackActionButton as HTMLInputElement;
        actions.onTrackBalanceChange(trackIndex, Number(knob.value));
      }
    }

    handleTrackSelection(event.target);
  }));

  leftControls.forEach((leftControl) => leftControl.addEventListener("input", (event) => {
    const targetElement = event.target instanceof HTMLInputElement ? event.target : null;
    if (!targetElement) {
      return;
    }

    if (targetElement.dataset.trackAction === "set-volume") {
      const trackIndex = Number(targetElement.dataset.trackVolumeIndex);
      if (Number.isNaN(trackIndex)) {
        return;
      }

      actions.onTrackVolumeChange(trackIndex, Number(targetElement.value));
      return;
    }

    if (targetElement.dataset.trackAction === "set-balance") {
      const trackIndex = Number(targetElement.dataset.trackBalanceIndex);
      if (Number.isNaN(trackIndex)) {
        return;
      }

      actions.onTrackBalanceChange(trackIndex, Number(targetElement.value));
      return;
    }

    if (targetElement.dataset.masterAction === "set-volume") {
      actions.onMasterVolumeChange(Number(targetElement.value));
      return;
    }

    if (targetElement.dataset.masterAction === "set-balance") {
      actions.onMasterBalanceChange(Number(targetElement.value));
    }
  }));

  leftControls.forEach((leftControl) => leftControl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const targetElement = event.target instanceof Element ? event.target : null;
    if (!targetElement?.closest("[data-track-item-index]")) {
      return;
    }

    event.preventDefault();
    handleTrackSelection(event.target);
  }));

  leftControls.forEach((leftControl) => leftControl.addEventListener("dblclick", (event) => {
    const targetElement = event.target instanceof HTMLInputElement ? event.target : null;
    if (!targetElement) {
      return;
    }

    if (targetElement.dataset.trackAction === "set-volume") {
      const trackIndex = Number(targetElement.dataset.trackVolumeIndex);
      if (Number.isNaN(trackIndex)) {
        return;
      }

      actions.onTrackVolumeChange(trackIndex, DEFAULT_TRACK_VOLUME);
      return;
    }

    if (targetElement.dataset.trackAction === "set-balance") {
      const trackIndex = Number(targetElement.dataset.trackBalanceIndex);
      if (Number.isNaN(trackIndex)) {
        return;
      }

      actions.onTrackBalanceChange(trackIndex, DEFAULT_TRACK_BALANCE);
      return;
    }

    if (targetElement.dataset.masterAction === "set-volume") {
      actions.onMasterVolumeChange(DEFAULT_TRACK_VOLUME);
      return;
    }

    if (targetElement.dataset.masterAction === "set-balance") {
      actions.onMasterBalanceChange(DEFAULT_TRACK_BALANCE);
    }
  }));

  saveProjectAsButton?.addEventListener("click", actions.onSaveProjectAs);
  playButton?.addEventListener("click", actions.onPlay);
  pauseButton?.addEventListener("click", actions.onPause);
  stopButton?.addEventListener("click", actions.onStop);
  backHomeButton?.addEventListener("click", actions.onBackToHome);
  openDebugWindowButton?.addEventListener("click", () => openDebugWindow(actions));
}
