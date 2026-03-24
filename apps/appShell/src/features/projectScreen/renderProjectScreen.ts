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
  onTrackSelectionChange: (trackIndex: number) => void;
  onBackToHome: () => void;
  onSaveProject: () => Promise<void>;
  onPlay: () => void;
  onPause: () => void;
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

function renderTrackStrip(tracks: GpTrackInfo[], confirmedActiveTrackIndex: number | null): string {
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
            <span class="trackStateBadge">${isActive ? "Active" : "Idle"}</span>
          </div>
          <div class="trackControlRow" aria-label="Track controls for ${track.name}">
            <button class="secondaryButton trackControlButton" type="button" data-stop-track-select="true">S</button>
            <button class="secondaryButton trackControlButton" type="button" data-stop-track-select="true">M</button>
            <label class="trackControlLabel">
              Vol
              <input class="trackControlRange" type="range" min="0" max="100" value="80" data-stop-track-select="true" />
            </label>
            <label class="trackControlLabel">
              Bal
              <input class="trackControlRange" type="range" min="-50" max="50" value="0" data-stop-track-select="true" />
            </label>
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
    ? `<p class="statusBanner" role="status">${actions.statusMessage}</p>`
    : "";

  const debugInfo = actions.debugInfo;

  container.innerHTML = `
    <main class="appShell">
      <header class="appHeader projectHeader">
        <div>
          <h1 class="appTitle">${project.title}</h1>
          <p class="appSubtitle">Source file: ${project.sourceFile.fileName}</p>
        </div>
        <div class="projectTopActions">
          <button class="secondaryButton" type="button" data-action="back-home">Main Menu</button>
          <button class="primaryButton" type="button" data-action="save-project">Save Project</button>
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
          ${renderTrackStrip(actions.tracks, actions.confirmedActiveTrackIndex)}
        </div>
      </section>

      <section class="homeCard">
        <h2 class="sectionTitle">Playback controls</h2>
        <div class="homeActions" aria-label="Playback controls">
          <button class="primaryButton" type="button" data-action="play">Play</button>
          <button class="secondaryButton" type="button" data-action="pause">Pause</button>
        </div>
        <p class="helperText">Playback is currently a placeholder in MVP 0.1.</p>
      </section>
    </main>
  `;

  const saveProjectButton = container.querySelector<HTMLButtonElement>('[data-action="save-project"]');
  const playButton = container.querySelector<HTMLButtonElement>('[data-action="play"]');
  const pauseButton = container.querySelector<HTMLButtonElement>('[data-action="pause"]');
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
  playButton?.addEventListener("click", actions.onPlay);
  pauseButton?.addEventListener("click", actions.onPause);
  backHomeButton?.addEventListener("click", actions.onBackToHome);
}
