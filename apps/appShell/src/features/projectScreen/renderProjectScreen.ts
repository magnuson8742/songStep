import type { SongStepProject } from "../../domain/project/projectModel";
import type { GpRenderDebugInfo, GpTrackInfo } from "../gpRendering/alphaTabGpRenderer";

export interface ProjectScreenActions {
  statusMessage: string | null;
  tracks: GpTrackInfo[];
  selectedTrackIndex: number;
  debugInfo: GpRenderDebugInfo | null;
  onTrackSelectionChange: (trackIndex: number) => void;
  onBackToHome: () => void;
  onSaveProject: () => Promise<void>;
  onPlay: () => void;
  onPause: () => void;
}

function renderTrackOptions(tracks: GpTrackInfo[], selectedTrackIndex: number): string {
  if (tracks.length === 0) {
    return '<option value="0">Loading tracks...</option>';
  }

  return tracks
    .map((track) => {
      const selectedAttribute = track.index === selectedTrackIndex ? "selected" : "";
      return `<option value="${track.index}" ${selectedAttribute}>${track.name}</option>`;
    })
    .join("");
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
        `pos=${row.position} | track.index=${row.trackIndex} | name=${row.trackName || "(unnamed)"}`,
    )
    .join("\n");
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
          <label class="trackSelectorLabel">
            Track
            <select class="fieldInput trackSelector" data-action="track-select">
              ${renderTrackOptions(actions.tracks, actions.selectedTrackIndex)}
            </select>
          </label>
        </div>

        <div class="trackDebugCard" aria-label="Track switch debug info">
          <h3 class="trackDebugTitle">Track switch debug</h3>
          <dl class="trackDebugGrid">
            <dt>Selected track index (state)</dt>
            <dd data-debug-field="selected-track-index">${renderDebugValue(actions.selectedTrackIndex)}</dd>
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

  const trackSelect = container.querySelector<HTMLSelectElement>('[data-action="track-select"]');
  const saveProjectButton = container.querySelector<HTMLButtonElement>('[data-action="save-project"]');
  const playButton = container.querySelector<HTMLButtonElement>('[data-action="play"]');
  const pauseButton = container.querySelector<HTMLButtonElement>('[data-action="pause"]');
  const backHomeButton = container.querySelector<HTMLButtonElement>('[data-action="back-home"]');

  trackSelect?.addEventListener("change", () => {
    const nextTrackIndex = Number(trackSelect.value);
    if (Number.isNaN(nextTrackIndex)) {
      return;
    }

    actions.onTrackSelectionChange(nextTrackIndex);
  });

  saveProjectButton?.addEventListener("click", actions.onSaveProject);
  playButton?.addEventListener("click", actions.onPlay);
  pauseButton?.addEventListener("click", actions.onPause);
  backHomeButton?.addEventListener("click", actions.onBackToHome);
}
