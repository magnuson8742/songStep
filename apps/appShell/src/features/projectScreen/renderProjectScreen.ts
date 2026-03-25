import type { SongStepProject } from "../../domain/project/projectModel";
import type { GpRenderDebugInfo, GpTrackInfo } from "../gpRendering/alphaTabGpRenderer";

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
  totalBars: number | null;
  tempoBpm: number | null;
  playbackIsPlaying: boolean | null;
  mutedTrackIndexes: number[];
  soloTrackIndexes: number[];
  onTrackSelectionChange: (trackIndex: number) => void;
  onToggleTrackMute: (trackIndex: number) => void;
  onToggleTrackSolo: (trackIndex: number) => void;
  onBackToHome: () => void;
  onSaveProject: () => Promise<void>;
  onSaveProjectAs: () => Promise<void>;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

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
          <div class="trackTitleRow">
            <h3 class="trackTitle">${track.name}</h3>
            <span class="trackStateBadge" data-track-state-badge="true">${isActive ? "Active" : "Idle"}</span>
          </div>
          <div class="trackControlRow" aria-label="Track controls for ${track.name}">
            <button class="secondaryButton trackControlButton ${soloTrackIndexes.includes(track.index) ? "isTrackToggleOn" : ""}" type="button" data-stop-track-select="true" data-track-action="toggle-solo" data-track-index="${track.index}">S</button>
            <button class="secondaryButton trackControlButton ${mutedTrackIndexes.includes(track.index) ? "isTrackToggleOn" : ""}" type="button" data-stop-track-select="true" data-track-action="toggle-mute" data-track-index="${track.index}">M</button>
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderProjectScreen(
  container: HTMLElement,
  project: SongStepProject,
  actions: ProjectScreenActions,
): void {
  const statusBanner = actions.statusMessage
    ? `<p class="statusBanner" role="status" data-status-banner="true">${actions.statusMessage}</p>`
    : "";

  const debugInfo = actions.debugInfo;

  container.innerHTML = `
    <main class="appShell">
      <header class="appHeader projectHeader">
        <div>
          <h1 class="appTitle">${project.title}</h1>
          <p class="appSubtitle">Source file: ${actions.sourceFileName}</p>
          <p class="appSubtitle">Score title: <span data-player-field="score-title">${renderDebugValue(actions.scoreTitle)}</span></p>
        </div>
        <div class="projectTopActions">
          <button class="secondaryButton" type="button" data-action="back-home">Main Menu</button>
          <button class="primaryButton" type="button" data-action="save-project">Save Project</button>
          <button class="secondaryButton" type="button" data-action="save-project-as">Save As</button>
        </div>
      </header>

      ${statusBanner}

      <section class="homeCard">
        <div class="projectSectionHeader">
          <h2 class="sectionTitle">Tab area</h2>
          <p class="helperText">Active track follows renderer-confirmed runtime state.</p>
        </div>

        <div class="trackDebugCard" aria-label="Track switch debug info">
          <h3 class="trackDebugTitle">Track switch debug</h3>
          <dl class="trackDebugGrid">
            <dt>Selected track index (state)</dt>
            <dd data-debug-field="selected-track-index">${renderDebugValue(actions.selectedTrackIndex)}</dd>
            <dt>Requested track index</dt>
            <dd data-debug-field="requested-track-index">${renderDebugValue(actions.requestedTrackIndex)}</dd>
            <dt>Last clicked track index</dt>
            <dd data-debug-field="last-clicked-track-index">${renderDebugValue(actions.lastClickedTrackIndex)}</dd>
            <dt>Click counter</dt>
            <dd data-debug-field="click-counter">${renderDebugValue(actions.clickCounter)}</dd>
            <dt>Last click timestamp</dt>
            <dd data-debug-field="last-click-timestamp">${renderDebugValue(actions.lastClickTimestampIso)}</dd>
            <dt>onTrackSelectionChange fired</dt>
            <dd data-debug-field="selection-fired">${actions.selectionFired ? "yes" : "no"}</dd>
            <dt>Confirmed active track name</dt>
            <dd data-debug-field="confirmed-active-track-name">${renderDebugValue(debugInfo?.confirmedActiveTrackName ?? null)}</dd>
            <dt>Confirmed active track index</dt>
            <dd data-debug-field="confirmed-active-track-index">${renderDebugValue(debugInfo?.confirmedActiveTrackIndex ?? null)}</dd>
            <dt>Confirmed active track position</dt>
            <dd data-debug-field="confirmed-active-track-position">${renderDebugValue(debugInfo?.confirmedActiveTrackPosition ?? null)}</dd>
            <dt>Renderer busy</dt>
            <dd data-debug-field="renderer-busy">${debugInfo?.rendererBusy ? "yes" : "no"}</dd>
            <dt>Pending requested track index</dt>
            <dd data-debug-field="pending-requested-track-index">${renderDebugValue(debugInfo?.pendingRequestedTrackIndex ?? null)}</dd>
            <dt>Render cycle counter</dt>
            <dd data-debug-field="render-cycle-counter">${renderDebugValue(debugInfo?.renderCycleCounter ?? 0)}</dd>
            <dt>Last render started</dt>
            <dd data-debug-field="last-render-started-at">${renderDebugValue(debugInfo?.lastRenderStartedAtIso ?? null)}</dd>
            <dt>Last render finished</dt>
            <dd data-debug-field="last-render-finished-at">${renderDebugValue(debugInfo?.lastRenderFinishedAtIso ?? null)}</dd>
            <dt>Last failed requested track index</dt>
            <dd data-debug-field="last-failed-requested-track-index">${renderDebugValue(debugInfo?.lastFailedRequestedTrackIndex ?? null)}</dd>
            <dt>Last renderer error stage</dt>
            <dd data-debug-field="last-renderer-error-stage">${renderDebugValue(debugInfo?.lastRendererErrorStage ?? null)}</dd>
            <dt>Render timeout hit</dt>
            <dd data-debug-field="render-timeout-hit">${debugInfo ? (debugInfo.renderTimeoutHit ? "yes" : "no") : "-"}</dd>
            <dt>Last successful confirmed track index</dt>
            <dd data-debug-field="last-successful-confirmed-track-index">${renderDebugValue(debugInfo?.lastSuccessfulConfirmedTrackIndex ?? null)}</dd>
            <dt>Render mode</dt>
            <dd data-debug-field="render-mode">${renderDebugValue(debugInfo?.renderMode ?? null)}</dd>
            <dt>Is percussion</dt>
            <dd data-debug-field="is-percussion">${debugInfo ? (debugInfo.isPercussion ? "yes" : "no") : "-"}</dd>
            <dt>Effective stave profile</dt>
            <dd data-debug-field="effective-stave-profile">${renderDebugValue(debugInfo?.effectiveStaveProfile ?? null)}</dd>
            <dt>Heavy track detected</dt>
            <dd data-debug-field="heavy-track-detected">${debugInfo ? (debugInfo.heavyTrackDetected ? "yes" : "no") : "-"}</dd>
            <dt>Heavy track reason</dt>
            <dd data-debug-field="heavy-track-reason">${renderDebugValue(debugInfo?.heavyTrackReason ?? null)}</dd>
            <dt>api.score?.tracks.length</dt>
            <dd data-debug-field="score-track-count">${renderDebugValue(debugInfo?.scoreTrackCount ?? null)}</dd>
          </dl>

          <div class="trackDebugLists">
            <div class="trackDebugListBlock">
              <h4 class="trackDebugListTitle">Loaded score tracks</h4>
              <pre class="trackDebugPre" data-debug-field="score-tracks">${formatRuntimeTrackList(debugInfo?.scoreTracks)}</pre>
            </div>
            <div class="trackDebugListBlock">
              <h4 class="trackDebugListTitle">Currently rendered api.tracks</h4>
              <pre class="trackDebugPre" data-debug-field="rendered-tracks">${formatRuntimeTrackList(debugInfo?.renderedTracks)}</pre>
            </div>
          </div>
        </div>

        <div id="gpRenderHost" class="gpRenderHost" aria-label="GP tablature render area"></div>

        <div class="trackStrip" aria-label="Track strip" data-action="track-strip">
          ${renderTrackStrip(
            actions.tracks,
            actions.confirmedActiveTrackIndex,
            actions.mutedTrackIndexes,
            actions.soloTrackIndexes,
          )}
        </div>
      </section>

      <section class="homeCard">
        <h2 class="sectionTitle">Player</h2>
        <div class="homeActions" aria-label="Playback controls">
          <button class="primaryButton" type="button" data-action="play">Play</button>
          <button class="secondaryButton" type="button" data-action="pause">Pause</button>
          <button class="secondaryButton" type="button" data-action="stop">Stop</button>
        </div>
        <dl class="playerInfoGrid">
          <dt>Playback state</dt>
          <dd data-player-field="playback-state">${actions.playbackIsPlaying === null ? "-" : actions.playbackIsPlaying ? "playing" : "paused/stopped"}</dd>
          <dt>Playback position</dt>
          <dd data-player-field="playback-position">${renderDebugValue(actions.playbackPositionLabel)}</dd>
          <dt>Current bar</dt>
          <dd data-player-field="current-bar">${renderDebugValue(actions.currentBar)}</dd>
          <dt>Total bars</dt>
          <dd data-player-field="total-bars">${renderDebugValue(actions.totalBars)}</dd>
          <dt>Tempo</dt>
          <dd data-player-field="tempo">${actions.tempoBpm === null ? "-" : `${actions.tempoBpm} BPM`}</dd>
        </dl>
        <p class="helperText">Mute/Solo are UI state only in this step.</p>
      </section>
    </main>
  `;

  const saveProjectButton = container.querySelector<HTMLButtonElement>('[data-action="save-project"]');
  const saveProjectAsButton = container.querySelector<HTMLButtonElement>('[data-action="save-project-as"]');
  const playButton = container.querySelector<HTMLButtonElement>('[data-action="play"]');
  const pauseButton = container.querySelector<HTMLButtonElement>('[data-action="pause"]');
  const stopButton = container.querySelector<HTMLButtonElement>('[data-action="stop"]');
  const backHomeButton = container.querySelector<HTMLButtonElement>('[data-action="back-home"]');
  const trackStrip = container.querySelector<HTMLElement>('[data-action="track-strip"]');

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

  trackStrip?.addEventListener("click", (event) => {
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
    }

    handleTrackSelection(event.target);
  });

  trackStrip?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const targetElement = event.target instanceof Element ? event.target : null;
    if (!targetElement?.closest("[data-track-item-index]")) {
      return;
    }

    event.preventDefault();
    handleTrackSelection(event.target);
  });

  saveProjectButton?.addEventListener("click", actions.onSaveProject);
  saveProjectAsButton?.addEventListener("click", actions.onSaveProjectAs);
  playButton?.addEventListener("click", actions.onPlay);
  pauseButton?.addEventListener("click", actions.onPause);
  stopButton?.addEventListener("click", actions.onStop);
  backHomeButton?.addEventListener("click", actions.onBackToHome);
}
