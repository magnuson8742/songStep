import type { SongStepProject } from "../../domain/project/projectModel";
import type { GpRenderDebugInfo, GpTrackInfo } from "../gpRendering/alphaTabGpRenderer";

export interface ProjectScreenActions {
  statusMessage: string | null;
  tracks: GpTrackInfo[];
  selectedTrackIndex: number;
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
        <article class="${activeClass}" data-track-item-index="${track.index}">
          <button class="trackSelectButton" type="button" data-action="track-select-item" data-track-index="${track.index}">
            ${track.name}
          </button>
          <div class="trackControlRow" aria-label="Track controls for ${track.name}">
            <button class="secondaryButton trackControlButton" type="button" data-action="placeholder-solo">S</button>
            <button class="secondaryButton trackControlButton" type="button" data-action="placeholder-mute">M</button>
            <label class="trackControlLabel">
              Vol
              <input class="trackControlRange" type="range" min="0" max="100" value="80" data-action="placeholder-volume" />
            </label>
            <label class="trackControlLabel">
              Bal
              <input class="trackControlRange" type="range" min="-50" max="50" value="0" data-action="placeholder-balance" />
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
            <dt>Confirmed active track name</dt>
            <dd data-debug-field="confirmed-active-track-name">${renderDebugValue(debugInfo?.confirmedActiveTrackName ?? null)}</dd>
            <dt>Confirmed active track index</dt>
            <dd data-debug-field="confirmed-active-track-index">${renderDebugValue(debugInfo?.confirmedActiveTrackIndex ?? null)}</dd>
            <dt>Confirmed active track position</dt>
            <dd data-debug-field="confirmed-active-track-position">${renderDebugValue(debugInfo?.confirmedActiveTrackPosition ?? null)}</dd>
            <dt>Resolved track name</dt>
            <dd data-debug-field="resolved-track-name">${renderDebugValue(debugInfo?.resolvedTrackName ?? null)}</dd>
            <dt>Resolved track index</dt>
            <dd data-debug-field="resolved-track-index">${renderDebugValue(debugInfo?.resolvedTrackIndex ?? null)}</dd>
            <dt>Resolved track position</dt>
            <dd data-debug-field="resolved-track-position">${renderDebugValue(debugInfo?.resolvedTrackPosition ?? null)}</dd>
            <dt>Renderer reload happened</dt>
            <dd data-debug-field="renderer-reloaded">${debugInfo ? (debugInfo.rendererReloaded ? "yes" : "no") : "-"}</dd>
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

        <div class="trackStrip" aria-label="Track strip">
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
  const trackButtons = container.querySelectorAll<HTMLButtonElement>('[data-action="track-select-item"]');

  trackButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const trackIndex = Number(button.dataset.trackIndex);
      if (Number.isNaN(trackIndex)) {
        return;
      }

      actions.onTrackSelectionChange(trackIndex);
    });
  });

  saveProjectButton?.addEventListener("click", actions.onSaveProject);
  playButton?.addEventListener("click", actions.onPlay);
  pauseButton?.addEventListener("click", actions.onPause);
  backHomeButton?.addEventListener("click", actions.onBackToHome);
}
