import type { SongStepProject } from "../domain/project/projectModel";
import { renderHomeScreen } from "../features/homeScreen/renderHomeScreen";
import {
  renderNewProjectScreen,
  type NewProjectSubmitPayload,
} from "../features/newProject/renderNewProjectScreen";
import { renderOpenProjectScreen } from "../features/openProject/renderOpenProjectScreen";
import {
  createGpRenderer,
  type GpRenderDebugInfo,
  type GpRendererController,
  type GpScoreOverviewRuntimeInfo,
  type GpTrackInfo,
} from "../features/gpRendering/alphaTabGpRenderer";
import {
  createProjectFromSource,
  pickAndLoadProjectFromDisk,
  pickGpSourceFile,
  saveProjectAsToDisk,
  saveProjectToDisk,
} from "../features/projectPersistence/projectPersistence";
import { renderProjectScreen } from "../features/projectScreen/renderProjectScreen";
import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";

type AppView = "home" | "newProject" | "openProject" | "project";

interface PlaybackBarAnchor {
  barNumber: number;
  startX: number;
  endX: number;
  rowIndex: number;
  y: number;
  height: number;
}

const ENABLE_CUSTOM_PLAYHEAD = true;
const DEFAULT_BOTTOM_DOCK_HEIGHT_PX = 280;
const MIN_BOTTOM_DOCK_HEIGHT_PX = 180;
const MAX_BOTTOM_DOCK_HEIGHT_PX = 520;
const ARRANGEMENT_BAR_WIDTH_PX = 24;
const ARRANGEMENT_BAR_GAP_PX = 4;
const DEFAULT_TAB_ZOOM_PERCENT = 100;
const MIN_TAB_ZOOM_PERCENT = 60;
const MAX_TAB_ZOOM_PERCENT = 160;
const TAB_ZOOM_STEP_PERCENT = 10;
const SECTION_LABEL_VERTICAL_NUDGE_PX = 10;
const MIN_PLAYBACK_SPEED_PERCENT = 15;
const MAX_PLAYBACK_SPEED_PERCENT = 175;
const DEFAULT_PLAYBACK_SPEED_PERCENT = 100;
const PLAYBACK_SPEED_BUTTON_STEP_PERCENT = 5;

interface AppState {
  currentView: AppView;
  currentProject: SongStepProject | null;
  projectStatusMessage: string | null;
  gpTracks: GpTrackInfo[];
  selectedTrackIndex: number;
  requestedTrackIndex: number | null;
  lastClickedTrackIndex: number | null;
  clickCounter: number;
  lastClickTimestampIso: string | null;
  selectionFired: boolean;
  gpRenderer: GpRendererController | null;
  gpRenderDebugInfo: GpRenderDebugInfo | null;
  scoreTitle: string | null;
  totalBars: number | null;
  tempoBpm: number | null;
  playbackSpeedPercent: number;
  countInEnabled: boolean;
  countInInProgress: boolean;
  pendingCountInTimerId: number | null;
  metronomeEnabled: boolean;
  pendingMetronomeIntervalId: number | null;
  metronomeAudioContext: AudioContext | null;
  playbackPositionLabel: string | null;
  playbackCurrentBar: number | null;
  playbackCurrentTick: number | null;
  playbackCurrentBarStartTick: number | null;
  playbackCurrentBarEndTickExclusive: number | null;
  playbackIsPlaying: boolean | null;
  playbackTransportActive: boolean;
  playerPositionPayloadShape: string | null;
  playerStatePayloadShape: string | null;
  currentBarSourcePath: string | null;
  playbackFollowTargetFound: boolean;
  playbackFollowSource: string | null;
  lastPlaybackFollowRowIndex: number | null;
  playbackBarAnchorCount: number;
  playbackBarAnchorSource: string | null;
  playbackAnchorStrategyAttempts: string | null;
  renderHostHasSvg: boolean;
  renderHostChildTags: string | null;
  renderHostTopTagClassCombos: string | null;
  renderHostElementCounts: string | null;
  playbackPlayheadVisible: boolean;
  lastPlaybackVisualBarNumber: number | null;
  playbackBarAnchors: PlaybackBarAnchor[];
  selectedNavigationBar: number | null;
  selectedNavigationTick: number | null;
  selectedNavigationTrackIndex: number | null;
  selectionDivergenceSuppressTicks: number;
  manualNavigationVisualOverrideActive: boolean;
  pendingOverviewNavigationBar: number | null;
  pendingOverviewNavigationTrackIndex: number | null;
  pendingOverviewNavigationTick: number | null;
  loopEnabled: boolean;
  loopStartBar: number | null;
  loopStartTick: number | null;
  loopEndBar: number | null;
  loopEndTick: number | null;
  loopDragHandle: "start" | "end" | null;
  desiredTrackSwitchTick: number | null;
  desiredTrackSwitchBar: number | null;
  desiredTrackSwitchSourceTrackIndex: number | null;
  playbackAnchorRebuildToken: number;
  playbackAnchorRebuildScheduled: boolean;
  activeTrackName: string | null;
  scoreOverview: GpScoreOverviewRuntimeInfo | null;
  trackVolumeByIndex: Record<number, number>;
  trackBalanceByIndex: Record<number, number>;
  masterVolume: number;
  masterBalance: number;
  mutedTrackIndexes: number[];
  soloTrackIndexes: number[];
  bottomDockHeightPx: number;
  tabZoomPercent: number;
  latestAnchorStrategyDebug: Record<string, unknown>[];
  latestPercussionAnchorDebug: Record<string, unknown> | null;
  latestAnchorDebugSnapshot: Record<string, unknown> | null;
}

function triggerJsonDownload(fileName: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function summarizeCollection<T>(items: T[], headLimit: number, tailLimit: number): {
  totalCount: number;
  head: T[];
  tail: T[];
  sampled: T[];
} {
  const totalCount = items.length;
  const head = items.slice(0, headLimit);
  const tail = totalCount > headLimit ? items.slice(Math.max(totalCount - tailLimit, 0)) : [];
  const sampleStep = Math.max(Math.floor(totalCount / 20), 1);
  const sampled = items.filter((_, index) => index % sampleStep === 0).slice(0, 120);
  return { totalCount, head, tail, sampled };
}

function updateDebugField(rootElement: HTMLElement, fieldName: string, value: string): void {
  const field = rootElement.querySelector<HTMLElement>(`[data-debug-field="${fieldName}"]`);
  if (!field) {
    return;
  }

  field.textContent = value;
}

function formatRuntimeTrackList(debugRows: GpRenderDebugInfo["scoreTracks"]): string {
  if (debugRows.length === 0) {
    return "(empty)";
  }

  return debugRows
    .map((row) => `pos=${row.position} | track.index=${row.trackIndex} | name=${row.trackName || "(unnamed)"} | totalBars=${row.totalBars} | totalNotes=${row.totalNotes} | firstNonEmptyBarIndex=${row.firstNonEmptyBarIndex ?? "-"}`)
    .join("\n");
}

function updateProjectDebugInfoPanel(rootElement: HTMLElement, debugInfo: GpRenderDebugInfo | null): void {
  updateDebugField(rootElement, "selected-track-index", String(debugInfo?.selectedTrackIndex ?? "-"));
  updateDebugField(rootElement, "requested-track-index", "-");
  updateDebugField(rootElement, "last-clicked-track-index", "-");
  updateDebugField(rootElement, "click-counter", "0");
  updateDebugField(rootElement, "last-click-timestamp", "-");
  updateDebugField(rootElement, "selection-fired", "no");
  updateDebugField(rootElement, "confirmed-active-track-name", debugInfo?.confirmedActiveTrackName ?? "-");
  updateDebugField(rootElement, "confirmed-active-track-index", String(debugInfo?.confirmedActiveTrackIndex ?? "-"));
  updateDebugField(rootElement, "confirmed-active-track-position", String(debugInfo?.confirmedActiveTrackPosition ?? "-"));
  updateDebugField(rootElement, "resolved-track-name", debugInfo?.resolvedTrackName ?? "-");
  updateDebugField(rootElement, "resolved-track-index", String(debugInfo?.resolvedTrackIndex ?? "-"));
  updateDebugField(rootElement, "resolved-track-position", String(debugInfo?.resolvedTrackPosition ?? "-"));
  updateDebugField(rootElement, "renderer-reloaded", debugInfo ? (debugInfo.rendererReloaded ? "yes" : "no") : "-");
  updateDebugField(rootElement, "renderer-busy", debugInfo?.rendererBusy ? "yes" : "no");
  updateDebugField(rootElement, "pending-requested-track-index", String(debugInfo?.pendingRequestedTrackIndex ?? "-"));
  updateDebugField(rootElement, "render-cycle-counter", String(debugInfo?.renderCycleCounter ?? "0"));
  updateDebugField(rootElement, "last-render-started-at", debugInfo?.lastRenderStartedAtIso ?? "-");
  updateDebugField(rootElement, "last-render-finished-at", debugInfo?.lastRenderFinishedAtIso ?? "-");
  updateDebugField(rootElement, "last-failed-requested-track-index", String(debugInfo?.lastFailedRequestedTrackIndex ?? "-"));
  updateDebugField(rootElement, "last-renderer-error-stage", debugInfo?.lastRendererErrorStage ?? "-");
  updateDebugField(rootElement, "render-timeout-hit", debugInfo ? (debugInfo.renderTimeoutHit ? "yes" : "no") : "-");
  updateDebugField(
    rootElement,
    "last-successful-confirmed-track-index",
    String(debugInfo?.lastSuccessfulConfirmedTrackIndex ?? "-"),
  );
  updateDebugField(rootElement, "render-mode", debugInfo?.renderMode ?? "-");
  updateDebugField(rootElement, "is-percussion", debugInfo ? (debugInfo.isPercussion ? "yes" : "no") : "-");
  updateDebugField(rootElement, "effective-stave-profile", debugInfo?.effectiveStaveProfile ?? "-");
  updateDebugField(rootElement, "heavy-track-detected", debugInfo ? (debugInfo.heavyTrackDetected ? "yes" : "no") : "-");
  updateDebugField(rootElement, "heavy-track-reason", debugInfo?.heavyTrackReason ?? "-");
  updateDebugField(rootElement, "score-track-count", String(debugInfo?.scoreTrackCount ?? "-"));
  updateDebugField(rootElement, "player-position-payload-shape", "-");
  updateDebugField(rootElement, "player-state-payload-shape", "-");
  updateDebugField(rootElement, "current-bar-source-path", "-");
  updateDebugField(rootElement, "current-tick", "-");
  updateDebugField(rootElement, "playback-follow-target-found", "no");
  updateDebugField(rootElement, "playback-follow-source", ENABLE_CUSTOM_PLAYHEAD ? "-" : "disabled");
  updateDebugField(rootElement, "playback-bar-anchor-count", "0");
  updateDebugField(rootElement, "playback-bar-anchor-source", ENABLE_CUSTOM_PLAYHEAD ? "-" : "disabled");
  updateDebugField(rootElement, "playback-anchor-strategy-attempts", ENABLE_CUSTOM_PLAYHEAD ? "-" : "disabled");
  updateDebugField(rootElement, "render-host-has-svg", "no");
  updateDebugField(rootElement, "render-host-child-tags", "-");
  updateDebugField(rootElement, "render-host-tag-class", "-");
  updateDebugField(rootElement, "render-host-element-counts", "-");
  updateDebugField(rootElement, "score-tracks", formatRuntimeTrackList(debugInfo?.scoreTracks ?? []));
  updateDebugField(rootElement, "rendered-tracks", formatRuntimeTrackList(debugInfo?.renderedTracks ?? []));
}

function updateTrackStripActive(rootElement: HTMLElement, activeTrackIndex: number | null): void {
  const trackItems = rootElement.querySelectorAll<HTMLElement>("[data-track-item-index]");
  trackItems.forEach((item) => {
    const itemTrackIndex = Number(item.dataset.trackItemIndex);
    const isActive = activeTrackIndex !== null && itemTrackIndex === activeTrackIndex;
    item.classList.toggle("isActiveTrack", isActive);
  });
}

function updateTrackRowVisualState(state: AppState, rootElement: HTMLElement): void {
  const anySoloActive = state.soloTrackIndexes.length > 0;
  const trackItems = rootElement.querySelectorAll<HTMLElement>("[data-track-item-index]");
  trackItems.forEach((item) => {
    const trackIndex = Number(item.dataset.trackItemIndex);
    if (Number.isNaN(trackIndex)) {
      return;
    }
    const isMuted = state.mutedTrackIndexes.includes(trackIndex);
    const isSolo = state.soloTrackIndexes.includes(trackIndex);
    const isSoloExcluded = anySoloActive && !isSolo;
    item.classList.toggle("isTrackMutedVisual", isMuted);
    item.classList.toggle("isTrackSoloVisual", isSolo);
    item.classList.toggle("isTrackSoloExcludedVisual", isSoloExcluded);
  });
}

function renderPlayerFieldValue(value: string | number | null): string {
  if (value === null || value === "") {
    return "-";
  }

  return String(value);
}

function clampPlaybackSpeedPercent(speedPercent: number): number {
  if (!Number.isFinite(speedPercent)) {
    return DEFAULT_PLAYBACK_SPEED_PERCENT;
  }
  return Math.max(MIN_PLAYBACK_SPEED_PERCENT, Math.min(MAX_PLAYBACK_SPEED_PERCENT, Math.round(speedPercent)));
}

function formatEffectiveTempoBpm(tempoBpm: number | null, playbackSpeedPercent: number): string {
  if (tempoBpm === null) {
    return "-";
  }
  const effectiveBpm = (tempoBpm * playbackSpeedPercent) / 100;
  return `${Number(effectiveBpm.toFixed(1))} BPM`;
}

function updatePlaybackSpeedVisual(state: AppState, rootElement: HTMLElement): void {
  const speedPercentLabel = rootElement.querySelector<HTMLElement>("[data-playback-speed-percent='true']");
  if (speedPercentLabel) {
    speedPercentLabel.textContent = `${state.playbackSpeedPercent}%`;
  }

  const speedBpmLabel = rootElement.querySelector<HTMLElement>("[data-playback-speed-bpm='true']");
  if (speedBpmLabel) {
    speedBpmLabel.textContent = formatEffectiveTempoBpm(state.tempoBpm, state.playbackSpeedPercent);
  }

  const speedSlider = rootElement.querySelector<HTMLInputElement>("[data-action='set-playback-speed']");
  if (speedSlider) {
    speedSlider.value = String(state.playbackSpeedPercent);
  }
}

function updateCountInToggleVisual(state: AppState, rootElement: HTMLElement): void {
  const countInToggleButton = rootElement.querySelector<HTMLButtonElement>("[data-count-in-toggle-button='true']");
  if (!countInToggleButton) {
    return;
  }
  countInToggleButton.classList.remove("primaryButton", "secondaryButton");
  countInToggleButton.classList.add(state.countInEnabled ? "primaryButton" : "secondaryButton");
}

function updateMetronomeToggleVisual(state: AppState, rootElement: HTMLElement): void {
  const metronomeToggleButton = rootElement.querySelector<HTMLButtonElement>("[data-metronome-toggle-button='true']");
  if (!metronomeToggleButton) {
    return;
  }
  metronomeToggleButton.classList.remove("primaryButton", "secondaryButton");
  metronomeToggleButton.classList.add(state.metronomeEnabled ? "primaryButton" : "secondaryButton");
}

function resolveEffectiveTempoBpm(state: AppState): number {
  const effectiveTempoBpm = state.tempoBpm === null ? null : (state.tempoBpm * state.playbackSpeedPercent) / 100;
  if (!effectiveTempoBpm || effectiveTempoBpm <= 0) {
    return 120;
  }
  return effectiveTempoBpm;
}

function ensureMetronomeAudioContext(state: AppState): AudioContext | null {
  const ExistingAudioContext = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!ExistingAudioContext) {
    return null;
  }
  if (!state.metronomeAudioContext) {
    state.metronomeAudioContext = new ExistingAudioContext();
  }
  if (state.metronomeAudioContext.state === "suspended") {
    void state.metronomeAudioContext.resume().catch(() => undefined);
  }
  return state.metronomeAudioContext;
}

function playMetronomeClick(state: AppState, isDownbeat: boolean): void {
  const audioContext = ensureMetronomeAudioContext(state);
  if (!audioContext) {
    return;
  }
  const clickStart = audioContext.currentTime + 0.005;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = isDownbeat ? 1240 : 940;
  gain.gain.setValueAtTime(0.0001, clickStart);
  gain.gain.exponentialRampToValueAtTime(0.18, clickStart + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, clickStart + 0.06);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(clickStart);
  oscillator.stop(clickStart + 0.07);
}

function stopPlaybackMetronome(state: AppState): void {
  if (state.pendingMetronomeIntervalId !== null) {
    window.clearInterval(state.pendingMetronomeIntervalId);
    state.pendingMetronomeIntervalId = null;
  }
}

function startPlaybackMetronome(state: AppState): void {
  stopPlaybackMetronome(state);
  const beatDurationMs = Math.max(120, Math.round(60000 / resolveEffectiveTempoBpm(state)));
  let beatCounter = 0;
  playMetronomeClick(state, true);
  state.pendingMetronomeIntervalId = window.setInterval(() => {
    beatCounter += 1;
    playMetronomeClick(state, beatCounter % 4 === 0);
  }, beatDurationMs);
}

function clearCountInTimer(state: AppState): void {
  if (state.pendingCountInTimerId !== null) {
    window.clearTimeout(state.pendingCountInTimerId);
    state.pendingCountInTimerId = null;
  }
}

function cancelCountIn(state: AppState, rootElement: HTMLElement): void {
  clearCountInTimer(state);
  if (state.countInInProgress) {
    state.countInInProgress = false;
    state.projectStatusMessage = null;
    updateProjectStatusBanner(rootElement, "");
  }
  if (!state.metronomeEnabled) {
    stopPlaybackMetronome(state);
  }
}

function updatePlayerRuntimeFields(state: AppState, rootElement: HTMLElement): void {
  const setPlayerField = (fieldName: string, value: string): void => {
    const field = rootElement.querySelector<HTMLElement>(`[data-player-field="${fieldName}"]`);
    if (field) {
      field.textContent = value;
    }
  };

  setPlayerField("score-title", renderPlayerFieldValue(state.scoreTitle));
  setPlayerField("active-track-name", renderPlayerFieldValue(state.activeTrackName));
  setPlayerField(
    "playback-state",
    state.playbackIsPlaying === null ? "-" : state.playbackIsPlaying ? "playing" : "paused/stopped",
  );
  setPlayerField("playback-position", renderPlayerFieldValue(state.playbackPositionLabel));
  setPlayerField("current-bar", renderPlayerFieldValue(state.playbackCurrentBar));
  setPlayerField("total-bars", renderPlayerFieldValue(state.totalBars));
  setPlayerField("tempo", state.tempoBpm === null ? "-" : `${state.tempoBpm} BPM`);
  updatePlaybackSpeedVisual(state, rootElement);
}

function updateTrackToggleVisualState(state: AppState, rootElement: HTMLElement): void {
  const toggleButtons = rootElement.querySelectorAll<HTMLElement>("[data-track-action][data-track-index]");
  toggleButtons.forEach((button) => {
    const trackIndex = Number(button.dataset.trackIndex);
    if (Number.isNaN(trackIndex)) {
      return;
    }

    const isMute = button.dataset.trackAction === "toggle-mute";
    const isSolo = button.dataset.trackAction === "toggle-solo";
    const isOn = isMute
      ? state.mutedTrackIndexes.includes(trackIndex)
      : isSolo
        ? state.soloTrackIndexes.includes(trackIndex)
        : false;
    button.classList.toggle("isTrackToggleOn", isOn);
  });
  updateTrackRowVisualState(state, rootElement);
}

function updateTrackControlVisualState(state: AppState, rootElement: HTMLElement): void {
  const volumeInputs = rootElement.querySelectorAll<HTMLInputElement>("[data-track-volume-index]");
  volumeInputs.forEach((input) => {
    const trackIndex = Number(input.dataset.trackVolumeIndex);
    if (Number.isNaN(trackIndex)) {
      return;
    }

    const value = state.trackVolumeByIndex[trackIndex] ?? 80;
    input.value = String(value);
    const valueLabel = rootElement.querySelector<HTMLElement>(`[data-track-volume-value="${trackIndex}"]`);
    if (valueLabel) {
      valueLabel.textContent = `${value}`;
    }
  });

  const balanceInputs = rootElement.querySelectorAll<HTMLInputElement>("[data-track-balance-index]");
  balanceInputs.forEach((input) => {
    const trackIndex = Number(input.dataset.trackBalanceIndex);
    if (Number.isNaN(trackIndex)) {
      return;
    }

    const value = state.trackBalanceByIndex[trackIndex] ?? 0;
    input.value = String(value);
    const valueLabel = rootElement.querySelector<HTMLElement>(`[data-track-balance-value="${trackIndex}"]`);
    if (valueLabel) {
      valueLabel.textContent = `${value}`;
    }
  });

  const masterVolumeInput = rootElement.querySelector<HTMLInputElement>("[data-master-action='set-volume']");
  if (masterVolumeInput) {
    masterVolumeInput.value = String(state.masterVolume);
  }
  const masterBalanceInput = rootElement.querySelector<HTMLInputElement>("[data-master-action='set-balance']");
  if (masterBalanceInput) {
    masterBalanceInput.value = String(state.masterBalance);
  }
  const masterVolumeValue = rootElement.querySelector<HTMLElement>("[data-master-volume-value='true']");
  if (masterVolumeValue) {
    masterVolumeValue.textContent = String(state.masterVolume);
  }
  const masterBalanceValue = rootElement.querySelector<HTMLElement>("[data-master-balance-value='true']");
  if (masterBalanceValue) {
    masterBalanceValue.textContent = String(state.masterBalance);
  }
}

function updateArrangementOverview(state: AppState, rootElement: HTMLElement): void {
  const overviewContainers = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-arrangement-overview='true']"));
  const barHeaderContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-bar-header]");
  const rowsContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-rows]");
  const markersContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-markers]");
  const emptyState = rootElement.querySelector<HTMLElement>("[data-arrangement-empty]");

  if (overviewContainers.length === 0 || !barHeaderContainer || !rowsContainer || !markersContainer || !emptyState) {
    return;
  }

  const overview = state.scoreOverview;
  if (!overview || overview.trackRows.length === 0 || overview.totalBars <= 0) {
    overviewContainers.forEach((container) => {
      container.style.removeProperty("--arrangement-bar-count");
      container.style.removeProperty("--arrangement-grid-width");
    });
    barHeaderContainer.innerHTML = "";
    rowsContainer.innerHTML = "";
    markersContainer.innerHTML = "";
    markersContainer.style.height = "16px";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  const arrangementBarCount = Math.max(overview.totalBars, 1);
  const arrangementGridWidthPx =
    arrangementBarCount * ARRANGEMENT_BAR_WIDTH_PX + Math.max(arrangementBarCount - 1, 0) * ARRANGEMENT_BAR_GAP_PX;
  overviewContainers.forEach((container) => {
    container.style.setProperty("--arrangement-bar-count", String(arrangementBarCount));
    container.style.setProperty("--arrangement-grid-width", `${arrangementGridWidthPx}px`);
  });
  const barLabels = new Set<number>([0, overview.totalBars - 1]);
  for (let barIndex = 3; barIndex < overview.totalBars; barIndex += 4) {
    barLabels.add(barIndex);
  }
  barHeaderContainer.innerHTML = Array.from(barLabels)
    .sort((leftBar, rightBar) => leftBar - rightBar)
    .map((barIndex) => {
      const positionPercent = overview.totalBars > 1 ? (barIndex / (overview.totalBars - 1)) * 100 : 0;
      return `<span class="arrangementBarHeaderLabel" style="left:${positionPercent}%">${barIndex + 1}</span>`;
    })
    .join("");

  rowsContainer.innerHTML = overview.trackRows
    .map((row) => {
      const barCells = row.barActivity
        .map(
          (active, barIndex) =>
            `<span class="arrangementBarCell ${active ? "isBarActive" : "isBarEmpty"}" data-arrangement-bar-index="${barIndex}"></span>`,
        )
        .join("");
      return `
        <div class="arrangementRow" data-arrangement-track-index="${row.trackIndex}" aria-label="Timeline row for ${row.trackName}">
          <div class="arrangementBarRow">${barCells}</div>
        </div>
      `;
    })
    .join("");

  markersContainer.innerHTML = overview.sectionMarkers
    .map((marker) => {
      const positionPercent = overview.totalBars > 1 ? (marker.barIndex / (overview.totalBars - 1)) * 100 : 0;
      return `<span class="arrangementMarker" data-measure-only="true" style="left:${positionPercent}%">${marker.label}</span>`;
    })
    .join("");

  const markerNodes = Array.from(markersContainer.querySelectorAll<HTMLElement>("[data-measure-only='true']"));
  const laneEndPercents: number[] = [];
  const laneHeightPx = 18;
  const lanePaddingPx = 8;
  const markerAreaWidthPx = Math.max(markersContainer.scrollWidth, markersContainer.clientWidth, 1);

  markerNodes.forEach((markerNode) => {
    const leftPercent = Number(markerNode.style.left.replace("%", "")) || 0;
    const markerWidthPercent = ((markerNode.offsetWidth + lanePaddingPx) / markerAreaWidthPx) * 100;

    let laneIndex = laneEndPercents.findIndex((laneEndPercent) => leftPercent >= laneEndPercent);
    if (laneIndex < 0) {
      laneIndex = laneEndPercents.length;
      laneEndPercents.push(0);
    }

    laneEndPercents[laneIndex] = leftPercent + markerWidthPercent;
    markerNode.style.top = `${laneIndex * laneHeightPx}px`;
    markerNode.dataset.measureOnly = "false";
  });

  markersContainer.style.height = `${Math.max(laneEndPercents.length, 1) * laneHeightPx}px`;
  updateArrangementPlaybackHighlight(state, rootElement);
  updateArrangementSelectionHighlight(state, rootElement);
}

function nudgeRenderedSectionLabels(rootElement: HTMLElement, state: AppState): void {
  const sectionMarkers = state.scoreOverview?.sectionMarkers ?? [];
  if (sectionMarkers.length === 0) {
    return;
  }

  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return;
  }

  const sectionLabelSet = new Set(
    sectionMarkers.map((marker) => marker.label.trim().toLowerCase()).filter((label) => label.length > 0),
  );
  if (sectionLabelSet.size === 0) {
    return;
  }

  const svgTexts = Array.from(renderHost.querySelectorAll<SVGTextElement>("svg text"));
  svgTexts.forEach((textNode) => {
    if (textNode.dataset.sectionLabelNudged === "true") {
      return;
    }
    const textValue = textNode.textContent?.trim().toLowerCase() ?? "";
    if (textValue.length === 0 || !sectionLabelSet.has(textValue)) {
      return;
    }

    const currentY = textNode.getAttribute("y");
    if (currentY) {
      const numericY = Number(currentY);
      if (Number.isFinite(numericY)) {
        textNode.setAttribute("y", String(numericY - SECTION_LABEL_VERTICAL_NUDGE_PX));
        textNode.dataset.sectionLabelNudged = "true";
        return;
      }
    }

    textNode.style.transform = `translateY(-${SECTION_LABEL_VERTICAL_NUDGE_PX}px)`;
    textNode.dataset.sectionLabelNudged = "true";
  });
}

function getActiveManualNavigationTarget(state: AppState): { targetTrackIndex: number; targetBar: number; targetTick: number } | null {
  const confirmedTrackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
  if (
    state.pendingOverviewNavigationBar !== null &&
    state.pendingOverviewNavigationBar > 0 &&
    state.pendingOverviewNavigationTrackIndex === confirmedTrackIndex &&
    state.pendingOverviewNavigationTick !== null
  ) {
    return {
      targetTrackIndex: confirmedTrackIndex,
      targetBar: state.pendingOverviewNavigationBar,
      targetTick: state.pendingOverviewNavigationTick,
    };
  }

  if (
    state.selectedNavigationBar !== null &&
    state.selectedNavigationBar > 0 &&
    state.selectedNavigationTrackIndex === confirmedTrackIndex &&
    state.selectedNavigationTick !== null
  ) {
    return {
      targetTrackIndex: confirmedTrackIndex,
      targetBar: state.selectedNavigationBar,
      targetTick: state.selectedNavigationTick,
    };
  }

  return null;
}

function updateArrangementPlaybackHighlight(state: AppState, rootElement: HTMLElement): void {
  const arrangementCells = rootElement.querySelectorAll<HTMLElement>("[data-arrangement-bar-index]");
  arrangementCells.forEach((cell) => {
    cell.classList.remove("isPlaybackCurrentBar");
  });

  const activeTrackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
  const activeManualTarget = getActiveManualNavigationTarget(state);
  let playbackBar = state.playbackCurrentBar;
  if (state.manualNavigationVisualOverrideActive && activeManualTarget) {
    playbackBar = activeManualTarget.targetBar;
  }
  if (playbackBar === null || playbackBar <= 0) {
    return;
  }

  const playbackBarIndex = playbackBar - 1;
  const activeTrackRow = rootElement.querySelector<HTMLElement>(`[data-arrangement-track-index="${activeTrackIndex}"]`);
  if (!activeTrackRow) {
    return;
  }

  const activeTrackCell = activeTrackRow.querySelector<HTMLElement>(`[data-arrangement-bar-index="${playbackBarIndex}"]`);
  if (!activeTrackCell) {
    return;
  }

  activeTrackCell.classList.add("isPlaybackCurrentBar");
}

function updateArrangementSelectionHighlight(state: AppState, rootElement: HTMLElement): void {
  const arrangementCells = rootElement.querySelectorAll<HTMLElement>("[data-arrangement-bar-index]");
  arrangementCells.forEach((cell) => {
    cell.classList.remove("isSelectedNavigationBar");
  });

  if (
    state.selectedNavigationBar === null ||
    state.selectedNavigationBar <= 0 ||
    state.selectedNavigationTrackIndex === null
  ) {
    return;
  }

  const selectedBarIndex = state.selectedNavigationBar - 1;
  const selectedTrackRow = rootElement.querySelector<HTMLElement>(
    `[data-arrangement-track-index="${state.selectedNavigationTrackIndex}"]`,
  );
  if (!selectedTrackRow) {
    return;
  }

  const selectedCell = selectedTrackRow.querySelector<HTMLElement>(`[data-arrangement-bar-index="${selectedBarIndex}"]`);
  if (!selectedCell) {
    return;
  }

  selectedCell.classList.add("isSelectedNavigationBar");
}

function ensurePlaybackPlayheadElement(rootElement: HTMLElement): HTMLElement | null {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return null;
  }

  let playhead = renderHost.querySelector<HTMLElement>("[data-playback-playhead='true']");
  if (!playhead) {
    playhead = document.createElement("div");
    playhead.className = "playbackPlayhead";
    playhead.dataset.playbackPlayhead = "true";
    playhead.setAttribute("aria-hidden", "true");
    renderHost.append(playhead);
  }

  return playhead;
}

function ensurePlaybackHighlightElement(rootElement: HTMLElement): HTMLElement | null {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return null;
  }

  let highlight = renderHost.querySelector<HTMLElement>("[data-playback-highlight='true']");
  if (!highlight) {
    highlight = document.createElement("div");
    highlight.className = "playbackBarHighlight";
    highlight.dataset.playbackHighlight = "true";
    highlight.setAttribute("aria-hidden", "true");
    renderHost.append(highlight);
  }

  return highlight;
}

function ensureNavigationCursorElement(rootElement: HTMLElement): HTMLElement | null {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return null;
  }

  let cursor = renderHost.querySelector<HTMLElement>("[data-navigation-cursor='true']");
  if (!cursor) {
    cursor = document.createElement("div");
    cursor.className = "navigationSelectionCursor";
    cursor.dataset.navigationCursor = "true";
    cursor.setAttribute("aria-hidden", "true");
    renderHost.append(cursor);
  }

  return cursor;
}

function ensureNavigationHighlightElement(rootElement: HTMLElement): HTMLElement | null {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return null;
  }

  let highlight = renderHost.querySelector<HTMLElement>("[data-navigation-highlight='true']");
  if (!highlight) {
    highlight = document.createElement("div");
    highlight.className = "navigationSelectionHighlight";
    highlight.dataset.navigationHighlight = "true";
    highlight.setAttribute("aria-hidden", "true");
    renderHost.append(highlight);
  }

  return highlight;
}

function hidePlaybackPlayhead(rootElement: HTMLElement, state: AppState): void {
  const playhead = rootElement.querySelector<HTMLElement>("[data-playback-playhead='true']");
  if (playhead) {
    playhead.style.display = "none";
  }
  const highlight = rootElement.querySelector<HTMLElement>("[data-playback-highlight='true']");
  if (highlight) {
    highlight.style.display = "none";
  }

  state.playbackPlayheadVisible = false;
  state.lastPlaybackVisualBarNumber = null;
}

function hideNavigationSelection(rootElement: HTMLElement): void {
  const cursor = rootElement.querySelector<HTMLElement>("[data-navigation-cursor='true']");
  if (cursor) {
    cursor.style.display = "none";
  }
  const highlight = rootElement.querySelector<HTMLElement>("[data-navigation-highlight='true']");
  if (highlight) {
    highlight.style.display = "none";
  }
}

function updateNavigationSelectionVisual(state: AppState, rootElement: HTMLElement): void {
  if (state.selectedNavigationBar === null || state.selectedNavigationBar <= 0) {
    hideNavigationSelection(rootElement);
    return;
  }

  const selectedAnchor = state.playbackBarAnchors.find((anchor) => anchor.barNumber === state.selectedNavigationBar);
  if (!selectedAnchor) {
    hideNavigationSelection(rootElement);
    return;
  }

  const highlight = ensureNavigationHighlightElement(rootElement);
  const cursor = ensureNavigationCursorElement(rootElement);
  if (!highlight || !cursor) {
    return;
  }

  const regionWidth = Math.max(selectedAnchor.endX - selectedAnchor.startX, 8);
  let progress = 0;
  if (state.selectedNavigationTick !== null && state.gpRenderer) {
    const barTickRange = state.gpRenderer.getBarTickRange(selectedAnchor.barNumber);
    if (barTickRange && barTickRange.endTickExclusive !== null && barTickRange.endTickExclusive > barTickRange.startTick) {
      progress = (state.selectedNavigationTick - barTickRange.startTick) / (barTickRange.endTickExclusive - barTickRange.startTick);
    }
  }
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const cursorX = selectedAnchor.startX + regionWidth * clampedProgress;

  highlight.style.left = `${selectedAnchor.startX}px`;
  highlight.style.top = `${selectedAnchor.y}px`;
  highlight.style.width = `${regionWidth}px`;
  highlight.style.height = `${Math.max(selectedAnchor.height, 28)}px`;
  highlight.style.display = "block";

  cursor.style.left = `${cursorX}px`;
  cursor.style.top = `${selectedAnchor.y}px`;
  cursor.style.height = `${Math.max(selectedAnchor.height, 28)}px`;
  cursor.style.display = "block";
}

function updateRenderHostDomDiagnostics(state: AppState, rootElement: HTMLElement, renderHost: HTMLElement): void {
  const hasSvg = renderHost.querySelector("svg") !== null;
  const firstLevelChildTags = Array.from(renderHost.children, (child) => child.tagName.toLowerCase())
    .slice(0, 4)
    .join(", ");

  state.renderHostHasSvg = hasSvg;
  state.renderHostChildTags = firstLevelChildTags || null;
  state.renderHostTopTagClassCombos = null;
  state.renderHostElementCounts = null;
  updateDebugField(rootElement, "render-host-has-svg", hasSvg ? "yes" : "no");
  updateDebugField(rootElement, "render-host-child-tags", firstLevelChildTags || "-");
  updateDebugField(rootElement, "render-host-tag-class", "minimal");
  updateDebugField(rootElement, "render-host-element-counts", "minimal");
}

function buildAnchorDebugSnapshot(state: AppState, rootElement: HTMLElement): Record<string, unknown> {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  const renderHostRect = renderHost?.getBoundingClientRect() ?? null;
  const svgRoot = renderHost?.querySelector<SVGSVGElement>("svg") ?? null;
  const svgViewBox = svgRoot?.getAttribute("viewBox") ?? null;
  const renderedBounds = state.gpRenderer?.getRenderedBarBounds() ?? [];
  const summarizedRendererBounds = summarizeCollection(renderedBounds, 200, 100);
  const summarizeStrategyResult = (strategyResult: Record<string, unknown>): Record<string, unknown> => {
    const normalizedAnchors = Array.isArray(strategyResult.normalizedAnchors)
      ? summarizeCollection(strategyResult.normalizedAnchors as Record<string, unknown>[], 200, 80)
      : strategyResult.normalizedAnchors;
    const rowSummaries = Array.isArray(strategyResult.rowSummaries)
      ? summarizeCollection(strategyResult.rowSummaries as Record<string, unknown>[], 80, 40)
      : strategyResult.rowSummaries;
    return {
      ...strategyResult,
      normalizedAnchors,
      rowSummaries,
    };
  };
  const rowCounts = state.playbackBarAnchors.reduce<Record<string, number>>((acc, anchor) => {
    const key = String(anchor.rowIndex);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const currentTrackOverview =
    state.scoreOverview?.trackRows.find((row) => row.trackIndex === state.selectedTrackIndex) ??
    state.scoreOverview?.trackRows[state.gpRenderDebugInfo?.confirmedActiveTrackPosition ?? -1] ??
    null;

  return {
    exportedAtIso: new Date().toISOString(),
    debugVersion: "anchor-debug-v2",
    sourceFileName: state.currentProject?.sourceFile.fileName ?? null,
    selectedTrackIndex: state.selectedTrackIndex,
    confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
    renderMode: state.gpRenderDebugInfo?.renderMode ?? null,
    isPercussion: state.gpRenderDebugInfo?.isPercussion ?? null,
    effectiveStaveProfile: state.gpRenderDebugInfo?.effectiveStaveProfile ?? null,
    highLevel: {
      scoreTitle: state.scoreTitle,
      selectedTrackIndex: state.selectedTrackIndex,
      confirmedActiveTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
      confirmedActiveTrackName: state.gpRenderDebugInfo?.confirmedActiveTrackName ?? null,
      renderMode: state.gpRenderDebugInfo?.renderMode ?? null,
      isPercussion: state.gpRenderDebugInfo?.isPercussion ?? null,
      effectiveStaveProfile: state.gpRenderDebugInfo?.effectiveStaveProfile ?? null,
      totalBars: state.totalBars,
      tempoBpm: state.tempoBpm,
      playbackBarAnchorSource: state.playbackBarAnchorSource,
      playbackAnchorStrategyAttempts: state.playbackAnchorStrategyAttempts,
    },
    rendererBounds: {
      rawCount: renderedBounds.length,
      sampleFirst200: renderedBounds.slice(0, 200),
      sampleLast100: renderedBounds.slice(Math.max(renderedBounds.length - 100, 0)),
      sampled: summarizedRendererBounds.sampled,
    },
    finalAnchors: {
      count: state.playbackBarAnchors.length,
      minBarNumber: state.playbackBarAnchors[0]?.barNumber ?? null,
      maxBarNumber: state.playbackBarAnchors[state.playbackBarAnchors.length - 1]?.barNumber ?? null,
      rowCounts,
      anchors: state.playbackBarAnchors,
    },
    strategyDiagnostics: state.latestAnchorStrategyDebug.map((strategyResult) => summarizeStrategyResult(strategyResult)),
    percussionFallbackDiagnostics: state.latestPercussionAnchorDebug,
    renderHostDiagnostics: {
      rect: renderHostRect
        ? {
            left: renderHostRect.left,
            top: renderHostRect.top,
            width: renderHostRect.width,
            height: renderHostRect.height,
          }
        : null,
      scrollLeft: renderHost?.scrollLeft ?? null,
      scrollTop: renderHost?.scrollTop ?? null,
      hasSvg: svgRoot !== null,
      svgViewBox,
      childTagCounts:
        renderHost === null
          ? {}
          : Array.from(renderHost.children).reduce<Record<string, number>>((acc, child) => {
              const key = child.tagName.toLowerCase();
              acc[key] = (acc[key] ?? 0) + 1;
              return acc;
            }, {}),
      svgCounts: {
        lines: renderHost?.querySelectorAll("svg line").length ?? 0,
        rects: renderHost?.querySelectorAll("svg rect").length ?? 0,
        texts: renderHost?.querySelectorAll("svg text").length ?? 0,
        dataBarIndex: renderHost?.querySelectorAll("svg [data-bar-index]").length ?? 0,
      },
      renderHostHasSvg: state.renderHostHasSvg,
      renderHostChildTags: state.renderHostChildTags,
      renderHostTopTagClassCombos: state.renderHostTopTagClassCombos,
      renderHostElementCounts: state.renderHostElementCounts,
    },
    overviewSync: {
      totalBars: state.scoreOverview?.totalBars ?? null,
      currentTrackOverview:
        currentTrackOverview === null
          ? null
          : {
              trackIndex: currentTrackOverview.trackIndex,
              trackName: currentTrackOverview.trackName,
              totalBarSlots: currentTrackOverview.barActivity.length,
              activeBarCount: currentTrackOverview.barActivity.filter(Boolean).length,
            },
      sectionMarkers: state.scoreOverview?.sectionMarkers ?? [],
    },
  };
}

function rebuildPercussionPlaybackBarAnchors(
  renderHost: HTMLElement,
  totalBars: number,
): { anchors: PlaybackBarAnchor[] | null; diagnostics: string; details: Record<string, unknown> } {
  const renderHostRect = renderHost.getBoundingClientRect();
  const rawLabels = Array.from(renderHost.querySelectorAll<SVGTextElement>("svg text"))
    .map((textNode) => {
      const rawText = textNode.textContent?.trim() ?? "";
      if (!/^\d+$/.test(rawText)) {
        return null;
      }
      const barNumber = Number(rawText);
      if (!Number.isFinite(barNumber) || barNumber <= 0 || (totalBars > 0 && barNumber > totalBars)) {
        return null;
      }
      const rect = textNode.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }
      return {
        barNumber,
        x: rect.left - renderHostRect.left + renderHost.scrollLeft,
        y: rect.top - renderHostRect.top + renderHost.scrollTop,
      };
    })
    .filter((label): label is { barNumber: number; x: number; y: number } => label !== null);
  const labelsByBar = new Map<number, { barNumber: number; x: number; y: number }>();
  rawLabels.forEach((label) => {
    const existing = labelsByBar.get(label.barNumber);
    if (!existing || label.y < existing.y) {
      labelsByBar.set(label.barNumber, label);
    }
  });
  const labels = Array.from(labelsByBar.values()).sort((left, right) => left.barNumber - right.barNumber);

  const horizontalBands = Array.from(renderHost.querySelectorAll<SVGLineElement>("svg line"))
    .map((line) => {
      const x1 = Number(line.getAttribute("x1"));
      const y1 = Number(line.getAttribute("y1"));
      const x2 = Number(line.getAttribute("x2"));
      const y2 = Number(line.getAttribute("y2"));
      if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
        return null;
      }
      const horizontalSpan = Math.abs(x2 - x1);
      const verticalDelta = Math.abs(y2 - y1);
      if (horizontalSpan < 48 || verticalDelta > 1.4) {
        return null;
      }
      const rect = line.getBoundingClientRect();
      return {
        top: rect.top - renderHostRect.top + renderHost.scrollTop,
        bottom: rect.bottom - renderHostRect.top + renderHost.scrollTop,
      };
    })
    .filter((band): band is { top: number; bottom: number } => band !== null);
  const rowBands: Array<{ yMin: number; yMax: number; yCenter: number }> = [];
  horizontalBands.forEach((band) => {
    const yCenter = (band.top + band.bottom) / 2;
    const existingIndex = rowBands.findIndex((row) => Math.abs(row.yCenter - yCenter) <= 10);
    if (existingIndex >= 0) {
      const row = rowBands[existingIndex] as { yMin: number; yMax: number; yCenter: number };
      row.yMin = Math.min(row.yMin, band.top);
      row.yMax = Math.max(row.yMax, band.bottom);
      row.yCenter = (row.yMin + row.yMax) / 2;
    } else {
      rowBands.push({ yMin: band.top, yMax: band.bottom, yCenter });
    }
  });

  const verticalCandidates = Array.from(renderHost.querySelectorAll<SVGLineElement>("svg line"))
    .map((line) => {
      const x1 = Number(line.getAttribute("x1"));
      const y1 = Number(line.getAttribute("y1"));
      const x2 = Number(line.getAttribute("x2"));
      const y2 = Number(line.getAttribute("y2"));
      if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
        return null;
      }
      const verticalDelta = Math.abs(y2 - y1);
      const horizontalDelta = Math.abs(x2 - x1);
      if (verticalDelta < 24 || horizontalDelta > 1.4) {
        return null;
      }
      const rect = line.getBoundingClientRect();
      return {
        x: rect.left - renderHostRect.left + renderHost.scrollLeft,
        top: rect.top - renderHostRect.top + renderHost.scrollTop,
        bottom: rect.bottom - renderHostRect.top + renderHost.scrollTop,
        height: rect.height,
      };
    })
    .filter((candidate): candidate is { x: number; top: number; bottom: number; height: number } => candidate !== null);

  const snappedAnchors: PlaybackBarAnchor[] = [];
  const sortedRows = [...rowBands].sort((left, right) => left.yCenter - right.yCenter);
  sortedRows.forEach((row, rowIndex) => {
    const labelsOnRow = labels.filter((label) => Math.abs(label.y - row.yCenter) <= 30);
    if (labelsOnRow.length === 0) {
      return;
    }
    const rowHeight = Math.max(row.yMax - row.yMin, 18);
    const boundaries = verticalCandidates
      .filter((candidate) => {
        const overlapTop = Math.max(candidate.top, row.yMin - 6);
        const overlapBottom = Math.min(candidate.bottom, row.yMax + 6);
        return overlapBottom - overlapTop >= rowHeight * 0.6 || candidate.height >= rowHeight * 0.8;
      })
      .map((candidate) => candidate.x)
      .sort((left, right) => left - right);
    if (boundaries.length < 2) {
      return;
    }
    const collapsedBoundaries: number[] = [];
    boundaries.forEach((x) => {
      const previous = collapsedBoundaries[collapsedBoundaries.length - 1];
      if (previous === undefined || Math.abs(previous - x) > 4) {
        collapsedBoundaries.push(x);
      } else {
        collapsedBoundaries[collapsedBoundaries.length - 1] = (previous + x) / 2;
      }
    });
    const labelsByX = [...labelsOnRow].sort((left, right) => left.x - right.x);
    let minBoundaryIndex = 0;
    labelsByX.forEach((label) => {
      let bestBoundaryIndex = minBoundaryIndex;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (let index = minBoundaryIndex; index < collapsedBoundaries.length; index += 1) {
        const boundary = collapsedBoundaries[index] as number;
        const distance = Math.abs(boundary - label.x);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestBoundaryIndex = index;
        }
      }
      const startBoundaryIndex = Math.max(bestBoundaryIndex, minBoundaryIndex);
      const endBoundaryIndex = startBoundaryIndex + 1;
      const startX = collapsedBoundaries[startBoundaryIndex];
      const endX = collapsedBoundaries[endBoundaryIndex];
      if (startX === undefined || endX === undefined || endX <= startX + 6) {
        return;
      }
      snappedAnchors.push({
        barNumber: label.barNumber,
        startX,
        endX,
        rowIndex,
        y: row.yMin,
        height: Math.max(row.yMax - row.yMin, 28),
      });
      minBoundaryIndex = startBoundaryIndex + 1;
    });
  });

  const sortedAnchors = snappedAnchors.sort((left, right) => left.barNumber - right.barNumber);
  const validateAnchors = (anchors: PlaybackBarAnchor[]): boolean => {
    const matchesTotal = totalBars > 0 ? anchors.length === totalBars : true;
    const contiguous = anchors.every((anchor, index) => anchor.barNumber === index + 1);
    const rowMonotonic = anchors.every((anchor, index) => {
      const next = anchors[index + 1];
      return !next || next.rowIndex >= anchor.rowIndex;
    });
    const validGeometry = anchors.every(
      (anchor) =>
        Number.isFinite(anchor.startX) &&
        Number.isFinite(anchor.endX) &&
        Number.isFinite(anchor.y) &&
        Number.isFinite(anchor.height) &&
        anchor.endX > anchor.startX,
    );
    return anchors.length > 0 && matchesTotal && contiguous && rowMonotonic && validGeometry;
  };
  const stageAValid = validateAnchors(sortedAnchors);
  if (stageAValid) {
    const diagnostics = `strategy=percussion-authoritative | levelA=pass,levelB=skipped,levelC=skipped,chosenLevel=A,labelsFound=${labels.length},rowCount=${sortedRows.length},normalizedBars=${sortedAnchors.length},totalBars=${totalBars > 0 ? totalBars : "-"},matchesTotal=${totalBars > 0 ? "yes" : "-"},validation=pass`;
    return {
      anchors: sortedAnchors,
      diagnostics,
      details: {
        labelsFound: labels.length,
        rowCount: sortedRows.length,
        stageA: { validation: "pass", anchors: sortedAnchors },
        stageB: { validation: "skipped", anchors: [] },
        stageC: { validation: "skipped", anchors: [] },
      },
    };
  }

  const fallbackAnchors: PlaybackBarAnchor[] = [];
  sortedRows.forEach((row, rowIndex) => {
    const labelsOnRow = labels.filter((label) => Math.abs(label.y - row.yCenter) <= 30).sort((left, right) => left.x - right.x);
    if (labelsOnRow.length === 0) {
      return;
    }
    const rowBoundaries = verticalCandidates
      .filter((candidate) => candidate.top <= row.yMax + 6 && candidate.bottom >= row.yMin - 6)
      .map((candidate) => candidate.x)
      .sort((left, right) => left - right);
    const rowLeftBoundary = rowBoundaries[0] ?? labelsOnRow[0]!.x - 40;
    const rowRightBoundary = rowBoundaries[rowBoundaries.length - 1] ?? labelsOnRow[labelsOnRow.length - 1]!.x + 40;
    labelsOnRow.forEach((label, index) => {
      const previous = labelsOnRow[index - 1];
      const next = labelsOnRow[index + 1];
      const startX = previous ? (previous.x + label.x) / 2 : rowLeftBoundary;
      const endX = next ? (label.x + next.x) / 2 : rowRightBoundary;
      if (endX <= startX + 6) {
        return;
      }
      fallbackAnchors.push({
        barNumber: label.barNumber,
        startX,
        endX,
        rowIndex,
        y: row.yMin,
        height: Math.max(row.yMax - row.yMin, 28),
      });
    });
  });
  const fallbackSorted = fallbackAnchors.sort((left, right) => left.barNumber - right.barNumber);
  const stageBValid = validateAnchors(fallbackSorted);
  if (stageBValid) {
    const diagnostics = `strategy=percussion-authoritative | levelA=fail,levelB=pass,levelC=skipped,chosenLevel=B,labelsFound=${labels.length},rowCount=${sortedRows.length},normalizedBars=${fallbackSorted.length},totalBars=${totalBars > 0 ? totalBars : "-"},matchesTotal=${totalBars > 0 ? (fallbackSorted.length === totalBars ? "yes" : "no") : "-"},validation=pass`;
    return {
      anchors: fallbackSorted,
      diagnostics,
      details: {
        labelsFound: labels.length,
        rowCount: sortedRows.length,
        stageA: { validation: "fail", anchors: sortedAnchors },
        stageB: { validation: "pass", anchors: fallbackSorted },
        stageC: { validation: "skipped", anchors: [] },
      },
    };
  }

  const emergencyRows =
    sortedRows.length > 0
      ? sortedRows
      : labels.length > 0
        ? labels.reduce<Array<{ yMin: number; yMax: number; yCenter: number }>>((rows, label) => {
            const index = rows.findIndex((row) => Math.abs(row.yCenter - label.y) <= 28);
            if (index >= 0) {
              const row = rows[index] as { yMin: number; yMax: number; yCenter: number };
              row.yMin = Math.min(row.yMin, label.y - 10);
              row.yMax = Math.max(row.yMax, label.y + 18);
              row.yCenter = (row.yMin + row.yMax) / 2;
            } else {
              rows.push({ yMin: label.y - 10, yMax: label.y + 18, yCenter: label.y });
            }
            return rows;
          }, [])
        : [];
  const stageCAnchors: PlaybackBarAnchor[] = [];
  if (totalBars > 0 && emergencyRows.length > 0) {
    const rowCount = emergencyRows.length;
    let currentBar = 1;
    emergencyRows
      .sort((left, right) => left.yCenter - right.yCenter)
      .forEach((row, rowIndex) => {
        if (currentBar > totalBars) {
          return;
        }
        const barsRemaining = totalBars - currentBar + 1;
        const rowsRemaining = rowCount - rowIndex;
        const barsInRow = Math.max(1, Math.ceil(barsRemaining / rowsRemaining));
        const overlappingVerticals = verticalCandidates
          .filter((candidate) => candidate.top <= row.yMax + 6 && candidate.bottom >= row.yMin - 6)
          .map((candidate) => candidate.x)
          .sort((left, right) => left - right);
        const rowLeft = overlappingVerticals[0] ?? (labels.find((label) => Math.abs(label.y - row.yCenter) <= 30)?.x ?? 0) - 40;
        let rowLabelRightX: number | null = null;
        for (let index = labels.length - 1; index >= 0; index -= 1) {
          const label = labels[index];
          if (label && Math.abs(label.y - row.yCenter) <= 30) {
            rowLabelRightX = label.x;
            break;
          }
        }
        const rowRight =
          overlappingVerticals[overlappingVerticals.length - 1] ??
          (rowLabelRightX ?? rowLeft + 320) + 40;
        const rowWidth = Math.max(rowRight - rowLeft, 120);
        const slotWidth = rowWidth / barsInRow;
        for (let slot = 0; slot < barsInRow && currentBar <= totalBars; slot += 1) {
          stageCAnchors.push({
            barNumber: currentBar,
            startX: rowLeft + slot * slotWidth,
            endX: rowLeft + (slot + 1) * slotWidth,
            rowIndex,
            y: row.yMin,
            height: Math.max(row.yMax - row.yMin, 28),
          });
          currentBar += 1;
        }
      });
  }
  const stageCSorted = stageCAnchors.sort((left, right) => left.barNumber - right.barNumber);
  const stageCValid = validateAnchors(stageCSorted);
  const diagnostics = `strategy=percussion-authoritative | levelA=fail,levelB=fail,levelC=${stageCValid ? "pass" : "fail"},chosenLevel=${stageCValid ? "C" : "none"},labelsFound=${labels.length},rowCount=${emergencyRows.length},normalizedBars=${stageCValid ? stageCSorted.length : 0},totalBars=${totalBars > 0 ? totalBars : "-"},matchesTotal=${totalBars > 0 ? (stageCSorted.length === totalBars ? "yes" : "no") : "-"},validation=${stageCValid ? "pass" : "fail"},rejectionReason=${stageCValid ? "-" : "allStagesFailed"}`;
  return {
    anchors: stageCValid ? stageCSorted : null,
    diagnostics,
    details: {
      labelsFound: labels.length,
      rowCount: emergencyRows.length,
      stageA: { validation: "fail", anchors: sortedAnchors },
      stageB: { validation: "fail", anchors: fallbackSorted },
      stageC: { validation: stageCValid ? "pass" : "fail", anchors: stageCSorted },
    },
  };
}


function resolveRendererPlaybackBarAnchors(state: AppState, renderHost: HTMLElement): PlaybackBarAnchor[] {
  const rawBounds = state.gpRenderer?.getRenderedBarBounds() ?? [];
  if (rawBounds.length === 0) {
    state.playbackAnchorStrategyAttempts =
      "chosenSource=renderer+svg-separators,rawBoundsCount=0,representativeBarsCount=0,rowCount=0,rawVerticalCount=0,spanningVerticalCount=0,separatorCount=0,usedFallbackMidpoints=no,validation=fail,normalizedBy=separator-partition";
    return [];
  }

  const totalBars = state.totalBars ?? 0;
  const descriptors = rawBounds
    .filter((bound) => {
      const hasDescriptor =
        Number.isFinite(bound.barNumber) &&
        Number.isFinite(bound.representativeX) &&
        Number.isFinite(bound.representativeY) &&
        Number.isFinite(bound.rawTop) &&
        Number.isFinite(bound.rawBottom) &&
        Number.isFinite(bound.rowHint) &&
        bound.barNumber > 0;
      if (!hasDescriptor) {
        return false;
      }
      if (totalBars > 0 && bound.barNumber > totalBars) {
        return false;
      }
      return true;
    })
    .map((bound) => ({
      barNumber: Math.round(bound.barNumber),
      representativeX: bound.representativeX,
      representativeY: bound.representativeY,
      rawTop: Math.min(bound.rawTop, bound.rawBottom),
      rawBottom: Math.max(bound.rawBottom, bound.rawTop),
      rowHint: Number.isFinite(bound.rowHint) ? Math.max(0, Math.round(bound.rowHint)) : 0,
    }))
    .sort((left, right) => left.barNumber - right.barNumber);

  if (descriptors.length === 0) {
    return [];
  }

  const deduped = new Map<
    number,
    { barNumber: number; representativeX: number; representativeY: number; rawTop: number; rawBottom: number; rowHint: number }
  >();
  descriptors.forEach((bound) => {
    const existing = deduped.get(bound.barNumber);
    if (!existing) {
      deduped.set(bound.barNumber, bound);
      return;
    }
    const leftRepresentativeX = Math.min(existing.representativeX, bound.representativeX);
    const conservativeTop = Math.max(existing.rawTop, bound.rawTop);
    const conservativeBottom = Math.min(existing.rawBottom, bound.rawBottom);
    deduped.set(bound.barNumber, {
      barNumber: bound.barNumber,
      representativeX: leftRepresentativeX,
      representativeY: (existing.representativeY + bound.representativeY) / 2,
      rawTop: conservativeTop,
      rawBottom: conservativeBottom > conservativeTop ? conservativeBottom : Math.max(existing.rawBottom, bound.rawBottom),
      rowHint: Math.min(existing.rowHint, bound.rowHint),
    });
  });

  const representativeBars = Array.from(deduped.values()).sort((left, right) => left.barNumber - right.barNumber);
  const contiguous = representativeBars.every((bar, index) => bar.barNumber === index + 1);
  const matchesTotal = totalBars > 0 ? representativeBars.length === totalBars : true;
  if (!contiguous || !matchesTotal) {
    state.playbackAnchorStrategyAttempts = `chosenSource=renderer+svg-separators,rawBoundsCount=${rawBounds.length},representativeBarsCount=${representativeBars.length},rowCount=0,rawVerticalCount=0,spanningVerticalCount=0,separatorCount=0,usedFallbackMidpoints=no,validation=fail,normalizedBy=separator-partition`;
    return [];
  }

  const quantile = (values: number[], ratio: number): number | null => {
    if (values.length === 0) {
      return null;
    }
    const sorted = [...values].sort((left, right) => left - right);
    const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)));
    return sorted[index] ?? null;
  };

  const renderHostRect = renderHost.getBoundingClientRect();
  const toLocalRect = (rect: DOMRect): { left: number; right: number; top: number; bottom: number; width: number; height: number } => ({
    left: rect.left - renderHostRect.left + renderHost.scrollLeft,
    right: rect.right - renderHostRect.left + renderHost.scrollLeft,
    top: rect.top - renderHostRect.top + renderHost.scrollTop,
    bottom: rect.bottom - renderHostRect.top + renderHost.scrollTop,
    width: rect.width,
    height: rect.height,
  });

  const horizontalSegments = [
    ...Array.from(renderHost.querySelectorAll<SVGLineElement>("svg line"))
      .filter((line) => {
        const x1 = Number(line.getAttribute("x1"));
        const y1 = Number(line.getAttribute("y1"));
        const x2 = Number(line.getAttribute("x2"));
        const y2 = Number(line.getAttribute("y2"));
        if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
          return false;
        }
        return Math.abs(y2 - y1) <= 1.6 && Math.abs(x2 - x1) >= 48;
      })
      .map((line) => toLocalRect(line.getBoundingClientRect())),
    ...Array.from(renderHost.querySelectorAll<SVGRectElement>("svg rect"))
      .filter((rect) => {
        const width = Number(rect.getAttribute("width"));
        const height = Number(rect.getAttribute("height"));
        return Number.isFinite(width) && Number.isFinite(height) && width >= 48 && height > 0 && height <= 4;
      })
      .map((rect) => toLocalRect(rect.getBoundingClientRect())),
  ];
  const verticalSeparators = [
    ...Array.from(renderHost.querySelectorAll<SVGLineElement>("svg line"))
      .filter((line) => {
        const x1 = Number(line.getAttribute("x1"));
        const y1 = Number(line.getAttribute("y1"));
        const x2 = Number(line.getAttribute("x2"));
        const y2 = Number(line.getAttribute("y2"));
        if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
          return false;
        }
        return Math.abs(x2 - x1) <= 1.8 && Math.abs(y2 - y1) >= 14;
      })
      .map((line) => toLocalRect(line.getBoundingClientRect())),
    ...Array.from(renderHost.querySelectorAll<SVGRectElement>("svg rect"))
      .filter((rect) => {
        const width = Number(rect.getAttribute("width"));
        const height = Number(rect.getAttribute("height"));
        return Number.isFinite(width) && Number.isFinite(height) && width <= 5 && height >= 14;
      })
      .map((rect) => toLocalRect(rect.getBoundingClientRect())),
  ];

  const clusterRowsFromDescriptors = (): Array<{ rowKey: number; bars: typeof representativeBars; yCenter: number }> => {
    const rows: Array<{ rowKey: number; bars: typeof representativeBars; yCenter: number; yMin: number; yMax: number }> = [];
    representativeBars.forEach((bar) => {
      const existingRowIndex = rows.findIndex((row) => Math.abs(row.yCenter - bar.representativeY) <= 30);
      if (existingRowIndex >= 0) {
        const row = rows[existingRowIndex];
        if (!row) {
          return;
        }
        row.bars.push(bar);
        row.yMin = Math.min(row.yMin, bar.rawTop);
        row.yMax = Math.max(row.yMax, bar.rawBottom);
        row.yCenter = (row.yMin + row.yMax) / 2;
        return;
      }
      rows.push({
        rowKey: rows.length,
        bars: [bar],
        yCenter: bar.representativeY,
        yMin: bar.rawTop,
        yMax: bar.rawBottom,
      });
    });
    return rows
      .sort((left, right) => left.yCenter - right.yCenter)
      .map((row, rowIndex) => ({ rowKey: rowIndex, bars: row.bars, yCenter: row.yCenter }));
  };

  const rowsByHint = new Map<number, typeof representativeBars>();
  representativeBars.forEach((bar) => {
    const rowBars = rowsByHint.get(bar.rowHint) ?? [];
    rowBars.push(bar);
    rowsByHint.set(bar.rowHint, rowBars);
  });
  const hintedRows = Array.from(rowsByHint.entries())
    .map(([rowKey, bars]) => ({
      rowKey,
      bars: [...bars].sort((left, right) => left.representativeX - right.representativeX),
      yCenter: quantile(bars.map((bar) => bar.representativeY), 0.5) ?? 0,
    }))
    .sort((left, right) => left.yCenter - right.yCenter);
  const rowGroups =
    hintedRows.length >= 2 || representativeBars.length <= 4
      ? hintedRows.map((row, rowIndex) => ({ ...row, rowKey: rowIndex }))
      : clusterRowsFromDescriptors();

  const normalizedAnchors: PlaybackBarAnchor[] = [];
  let usedSeparatorCount = 0;
  let rawVerticalCount = 0;
  let spanningVerticalCount = 0;
  let usedFallbackMidpoints = false;

  rowGroups.forEach((row, rowIndex) => {
    const rowBars = [...row.bars].sort((left, right) => left.representativeX - right.representativeX);
    if (rowBars.length === 0) {
      return;
    }
    const rowRepXs = rowBars.map((bar) => bar.representativeX);
    const rowYCenter = quantile(rowBars.map((bar) => bar.representativeY), 0.5) ?? row.yCenter;

    const rowHorizontal = horizontalSegments.filter((segment) => Math.abs((segment.top + segment.bottom) / 2 - rowYCenter) <= 56);
    const rowTopFromStructure = rowHorizontal.length > 0 ? Math.min(...rowHorizontal.map((segment) => segment.top)) : null;
    const rowBottomFromStructure = rowHorizontal.length > 0 ? Math.max(...rowHorizontal.map((segment) => segment.bottom)) : null;
    const rowTopFromBounds = quantile(rowBars.map((bar) => bar.rawTop), 0.4) ?? (rowYCenter - 18);
    const rowBottomFromBounds = quantile(rowBars.map((bar) => bar.rawBottom), 0.75) ?? (rowYCenter + 18);
    const rowTop = rowTopFromStructure !== null ? rowTopFromStructure - 2 : rowTopFromBounds;
    const rowBottom = rowBottomFromStructure !== null ? rowBottomFromStructure + 2 : Math.max(rowBottomFromBounds, rowTop + 24);
    const rowHeight = Math.max(rowBottom - rowTop, 24);

    const rowVerticalRaw = verticalSeparators.filter((segment) => segment.bottom >= rowTop - 6 && segment.top <= rowBottom + 6);
    rawVerticalCount += rowVerticalRaw.length;
    const rowSeparatorsRaw = rowVerticalRaw
      .filter((segment) => {
        const overlapTop = Math.max(segment.top, rowTop);
        const overlapBottom = Math.min(segment.bottom, rowBottom);
        const overlapHeight = Math.max(overlapBottom - overlapTop, 0);
        const overlapRatio = overlapHeight / rowHeight;
        const spanRatio = segment.height / rowHeight;
        return overlapRatio >= 0.82 && spanRatio >= 0.82;
      })
      .map((segment) => (segment.left + segment.right) / 2)
      .sort((left, right) => left - right);
    spanningVerticalCount += rowSeparatorsRaw.length;
    const dedupedSeparators = rowSeparatorsRaw.filter((value, index) => {
      if (index === 0) {
        return true;
      }
      const previous = rowSeparatorsRaw[index - 1];
      return previous === undefined ? true : Math.abs(value - previous) > 3;
    });

    const expectedBoundaries = rowBars.length + 1;
    let selectedBoundaries: number[] = [];
    if (dedupedSeparators.length >= expectedBoundaries) {
      let bestWindow = dedupedSeparators.slice(0, expectedBoundaries);
      let bestScore = Number.POSITIVE_INFINITY;
      for (let start = 0; start <= dedupedSeparators.length - expectedBoundaries; start += 1) {
        const window = dedupedSeparators.slice(start, start + expectedBoundaries);
        const windowLeft = window[0] ?? 0;
        const windowRight = window[window.length - 1] ?? windowLeft;
        const spanScore = Math.abs(windowLeft - (rowRepXs[0] ?? windowLeft)) + Math.abs(windowRight - (rowRepXs[rowRepXs.length - 1] ?? windowRight));
        if (spanScore < bestScore) {
          bestScore = spanScore;
          bestWindow = window;
        }
      }
      selectedBoundaries = bestWindow;
    } else {
      usedFallbackMidpoints = true;
      const rowLeft = quantile(rowRepXs, 0.05) ?? rowRepXs[0] ?? 0;
      const rowRight = quantile(rowRepXs, 0.95) ?? rowRepXs[rowRepXs.length - 1] ?? rowLeft + 24;
      const fallbackBoundaries: number[] = [rowLeft];
      for (let index = 0; index < rowBars.length - 1; index += 1) {
        const current = rowBars[index];
        const next = rowBars[index + 1];
        if (!current || !next) {
          continue;
        }
        fallbackBoundaries.push((current.representativeX + next.representativeX) / 2);
      }
      fallbackBoundaries.push(Math.max(rowRight, fallbackBoundaries[fallbackBoundaries.length - 1] ?? rowRight));
      selectedBoundaries = fallbackBoundaries;
    }

    usedSeparatorCount += dedupedSeparators.length;
    if (selectedBoundaries.length < expectedBoundaries) {
      return;
    }

    rowBars.forEach((bar, barIndex) => {
      const startX = selectedBoundaries[barIndex];
      const endX = selectedBoundaries[barIndex + 1];
      if (startX === undefined || endX === undefined) {
        return;
      }
      normalizedAnchors.push({
        barNumber: bar.barNumber,
        startX,
        endX: Math.max(endX, startX + 8),
        y: rowTop,
        height: rowHeight,
        rowIndex,
      });
    });
  });

  const byBarOrder = [...normalizedAnchors].sort((left, right) => left.barNumber - right.barNumber);
  const rowMonotonic = byBarOrder.every((anchor, index) => {
    const next = byBarOrder[index + 1];
    return !next || next.rowIndex >= anchor.rowIndex;
  });
  const sameRowNonOverlap = byBarOrder.every((anchor, index) => {
    const next = byBarOrder[index + 1];
    if (!next || next.rowIndex !== anchor.rowIndex) {
      return true;
    }
    return next.startX >= anchor.endX - 1;
  });
  const positiveWidths = byBarOrder.every((anchor) => anchor.endX > anchor.startX + 2);
  const normalizedContiguous = byBarOrder.every((anchor, index) => anchor.barNumber === index + 1);
  const normalizedMatchesTotal = totalBars > 0 ? byBarOrder.length === totalBars : true;
  const validationPass = normalizedContiguous && normalizedMatchesTotal && rowMonotonic && sameRowNonOverlap && positiveWidths;
  state.playbackAnchorStrategyAttempts = `chosenSource=renderer+svg-separators,rawBoundsCount=${rawBounds.length},representativeBarsCount=${representativeBars.length},rowCount=${rowGroups.length},rawVerticalCount=${rawVerticalCount},spanningVerticalCount=${spanningVerticalCount},separatorCount=${usedSeparatorCount},usedFallbackMidpoints=${usedFallbackMidpoints ? "yes" : "no"},validation=${validationPass ? "pass" : "fail"},normalizedBy=separator-partition`;
  if (!validationPass) {
    return [];
  }

  return byBarOrder;
}
function rebuildPlaybackBarAnchors(state: AppState, rootElement: HTMLElement): void {
  if (!ENABLE_CUSTOM_PLAYHEAD) {
    state.latestAnchorStrategyDebug = [];
    state.latestPercussionAnchorDebug = null;
    state.playbackBarAnchors = [];
    state.playbackBarAnchorCount = 0;
    state.playbackBarAnchorSource = "disabled";
    updateDebugField(rootElement, "playback-bar-anchor-count", "0");
    updateDebugField(rootElement, "playback-bar-anchor-source", "disabled");
    state.playbackAnchorStrategyAttempts = "disabled";
    updateDebugField(rootElement, "playback-anchor-strategy-attempts", "disabled");
    state.renderHostHasSvg = false;
    updateDebugField(rootElement, "render-host-has-svg", "disabled");
    state.renderHostChildTags = null;
    updateDebugField(rootElement, "render-host-child-tags", "disabled");
    state.renderHostTopTagClassCombos = null;
    updateDebugField(rootElement, "render-host-tag-class", "disabled");
    state.renderHostElementCounts = null;
    updateDebugField(rootElement, "render-host-element-counts", "disabled");
    return;
  }

  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    state.latestAnchorStrategyDebug = [];
    state.latestPercussionAnchorDebug = null;
    state.playbackBarAnchors = [];
    state.playbackBarAnchorCount = 0;
    state.playbackBarAnchorSource = null;
    updateDebugField(rootElement, "playback-bar-anchor-count", "0");
    updateDebugField(rootElement, "playback-bar-anchor-source", "-");
    state.playbackAnchorStrategyAttempts = null;
    updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
    return;
  }

  const isPercussionDefaultLayout =
    state.gpRenderDebugInfo?.isPercussion === true || state.gpRenderDebugInfo?.effectiveStaveProfile === "Default";
  const totalBars = state.totalBars ?? 0;
  const strategyAttempts: string[] = [];
  const strategyDebugResults: Record<string, unknown>[] = [];
  state.latestPercussionAnchorDebug = null;
  updateRenderHostDomDiagnostics(state, rootElement, renderHost);
  if (!isPercussionDefaultLayout) {
    const rendererAnchors = resolveRendererPlaybackBarAnchors(state, renderHost);
    if (rendererAnchors.length > 0) {
      state.latestAnchorStrategyDebug = [
        {
          source: "renderer:boundsLookup",
          validation: "pass",
          rawElementCount: rendererAnchors.length,
          normalizedAnchors: rendererAnchors,
        },
      ];
      state.playbackBarAnchors = rendererAnchors;
      state.playbackBarAnchorCount = rendererAnchors.length;
      state.playbackBarAnchorSource = "renderer:boundsLookup";
      updateDebugField(rootElement, "playback-bar-anchor-count", String(state.playbackBarAnchorCount));
      updateDebugField(rootElement, "playback-bar-anchor-source", state.playbackBarAnchorSource);
      updateDebugField(
        rootElement,
        "playback-anchor-strategy-attempts",
        state.playbackAnchorStrategyAttempts ?? `chosenSource=renderer-bounds,rawBoundsCount=${rendererAnchors.length}`,
      );
      return;
    }
  } else {
    strategyAttempts.push("renderer:boundsLookup skipped for percussion/default");
  }

  const selectorStrategies = [
    {
      source: "dom:[data-bar-index]",
      resolveAnchors: () => Array.from(renderHost.querySelectorAll<HTMLElement>("svg [data-bar-index]")),
    },
    {
      source: "geometry:svg-line-vertical",
      resolveAnchors: () =>
        Array.from(renderHost.querySelectorAll<SVGLineElement>("svg line")).filter((line) => {
          const x1 = Number(line.getAttribute("x1"));
          const y1 = Number(line.getAttribute("y1"));
          const x2 = Number(line.getAttribute("x2"));
          const y2 = Number(line.getAttribute("y2"));
          if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
            return false;
          }

          const verticalDelta = Math.abs(y2 - y1);
          const horizontalDelta = Math.abs(x2 - x1);
          return verticalDelta >= 18 && horizontalDelta <= 1.2;
        }),
    },
    {
      source: "geometry:svg-rect-vertical",
      resolveAnchors: () =>
        Array.from(renderHost.querySelectorAll<SVGRectElement>("svg rect")).filter((rect) => {
          const width = Number(rect.getAttribute("width"));
          const height = Number(rect.getAttribute("height"));
          if (!Number.isFinite(width) || !Number.isFinite(height)) {
            return false;
          }

          return width >= 0.6 && width <= 6 && height >= 18;
        }),
    },
  ] as const;
  const renderHostRect = renderHost.getBoundingClientRect();

  for (const strategy of selectorStrategies) {
    const elements = strategy.resolveAnchors();
    const strategyDebug: Record<string, unknown> = {
      source: strategy.source,
      rawElementCount: elements.length,
      validation: "pending",
      normalizedAnchors: [],
    };
    strategyDebugResults.push(strategyDebug);
    if (strategy.source === "dom:[data-bar-index]" && totalBars > 0) {
      const noisyThreshold = Math.max(totalBars * 120, 4000);
      if (elements.length > noisyThreshold) {
        strategyAttempts.push(`${strategy.source}:noisySkip=yes,elements=${elements.length},threshold=${noisyThreshold}`);
        strategyDebug.validation = "noisySkip";
        continue;
      }
    }
    strategyAttempts.push(`${strategy.source} => ${elements.length}`);
    if (elements.length === 0) {
      strategyDebug.validation = "empty";
      continue;
    }

    const rawAnchors = elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 2 && rect.height < 6) {
          return null;
        }

        const unsafeElement = element as HTMLElement;
        const rawBarIndex =
          unsafeElement instanceof HTMLElement && unsafeElement.dataset
            ? Number(unsafeElement.dataset.barIndex)
            : Number.NaN;
        const barNumber = Number.isFinite(rawBarIndex) ? rawBarIndex + 1 : null;

        return {
          x: rect.left - renderHostRect.left + renderHost.scrollLeft,
          y: rect.top - renderHostRect.top + renderHost.scrollTop,
          height: Math.max(rect.height, 28),
          right: rect.right - renderHostRect.left + renderHost.scrollLeft,
          barNumber,
        };
      })
      .filter((anchor): anchor is { x: number; y: number; height: number; right: number; barNumber: number | null } => anchor !== null)
      .sort((left, right) => (left.y === right.y ? left.x - right.x : left.y - right.y));

    if (rawAnchors.length === 0) {
      strategyDebug.validation = "rawEmpty";
      continue;
    }
    strategyDebug.rawAnchorCount = rawAnchors.length;

    if (strategy.source === "dom:[data-bar-index]") {
      const glyphsByBarNumber = new Map<number, Array<{ left: number; right: number; top: number; bottom: number }>>();
      rawAnchors.forEach((anchor) => {
        if (!anchor.barNumber || anchor.barNumber <= 0) {
          return;
        }
        const glyphs = glyphsByBarNumber.get(anchor.barNumber) ?? [];
        glyphs.push({
          left: anchor.x,
          right: anchor.right,
          top: anchor.y,
          bottom: anchor.y + anchor.height,
        });
        glyphsByBarNumber.set(anchor.barNumber, glyphs);
      });

      const barRepresentatives = Array.from(glyphsByBarNumber.entries())
        .map(([barNumber, glyphs]) => {
          const sortedTops = glyphs.map((glyph) => glyph.top).sort((left, right) => left - right);
          const medianTop =
            sortedTops.length > 0 ? sortedTops[Math.floor(sortedTops.length / 2)] : glyphs[0]?.top ?? 0;
          const left = glyphs.reduce((value, glyph) => Math.min(value, glyph.left), Number.POSITIVE_INFINITY);
          const right = glyphs.reduce((value, glyph) => Math.max(value, glyph.right), Number.NEGATIVE_INFINITY);
          const top = glyphs.reduce((value, glyph) => Math.min(value, glyph.top), Number.POSITIVE_INFINITY);
          const bottom = glyphs.reduce((value, glyph) => Math.max(value, glyph.bottom), Number.NEGATIVE_INFINITY);
          const width = Math.max(right - left, 12);
          return {
            barNumber,
            left,
            right,
            centerX: left + width / 2,
            representativeY: medianTop,
            top,
            bottom,
          };
        })
        .sort((left, right) => left.barNumber - right.barNumber);
      const limitedBars =
        totalBars > 0 ? barRepresentatives.filter((bar) => bar.barNumber <= totalBars) : barRepresentatives;
      if (limitedBars.length > 0) {
        const rowTolerance = 22;
        const rowSummaries: Array<{
          yCenter: number;
          yMin: number;
          yMax: number;
          rowStartX: number;
          rowEndX: number;
          bars: Array<{
            barNumber: number;
            left: number;
            right: number;
            centerX: number;
            top: number;
            bottom: number;
          }>;
        }> = [];
        const rowIndexByBarNumber = new Map<number, number>();
        limitedBars.forEach((bar) => {
          const rowIndex = rowSummaries.findIndex((row) => Math.abs(row.yCenter - bar.representativeY) <= rowTolerance);
          if (rowIndex >= 0) {
            const row = rowSummaries[rowIndex] as {
              yCenter: number;
              yMin: number;
              yMax: number;
              rowStartX: number;
              rowEndX: number;
              bars: Array<{
                barNumber: number;
                left: number;
                right: number;
                centerX: number;
                top: number;
                bottom: number;
              }>;
            };
            row.yMin = Math.min(row.yMin, bar.top);
            row.yMax = Math.max(row.yMax, bar.bottom);
            row.yCenter = (row.yMin + row.yMax) / 2;
            row.rowStartX = Math.min(row.rowStartX, bar.left);
            row.rowEndX = Math.max(row.rowEndX, bar.right);
            row.bars.push({
              barNumber: bar.barNumber,
              left: bar.left,
              right: bar.right,
              centerX: bar.centerX,
              top: bar.top,
              bottom: bar.bottom,
            });
            rowIndexByBarNumber.set(bar.barNumber, rowIndex);
            return;
          }

          rowSummaries.push({
            yCenter: bar.representativeY,
            yMin: bar.top,
            yMax: bar.bottom,
            rowStartX: bar.left,
            rowEndX: bar.right,
            bars: [
              {
                barNumber: bar.barNumber,
                left: bar.left,
                right: bar.right,
                centerX: bar.centerX,
                top: bar.top,
                bottom: bar.bottom,
              },
            ],
          });
          rowIndexByBarNumber.set(bar.barNumber, rowSummaries.length - 1);
        });

        const normalizedAnchors: PlaybackBarAnchor[] = [];
        rowSummaries.forEach((row, rowIndex) => {
          const sortedRowBars = [...row.bars].sort((left, right) => left.left - right.left);
          if (sortedRowBars.length === 0) {
            return;
          }
          const rowStart = Math.min(row.rowStartX - 6, sortedRowBars[0]?.left ?? row.rowStartX);
          const rowEnd = Math.max(row.rowEndX + 6, sortedRowBars[sortedRowBars.length - 1]?.right ?? row.rowEndX);

          sortedRowBars.forEach((bar, position) => {
            const previousBar = sortedRowBars[position - 1];
            const nextBar = sortedRowBars[position + 1];
            const startBoundary =
              previousBar === undefined ? rowStart : (previousBar.centerX + bar.centerX) / 2;
            const endBoundary =
              nextBar === undefined ? rowEnd : (bar.centerX + nextBar.centerX) / 2;
            const startX = Math.min(startBoundary, endBoundary - 12);
            const endX = Math.max(endBoundary, startBoundary + 12);
            normalizedAnchors.push({
              barNumber: bar.barNumber,
              startX,
              endX,
              rowIndex,
              y: row.yMin,
              height: Math.max(row.yMax - row.yMin, 28),
            });
          });
        });
        const validatedAnchors = normalizedAnchors.sort((left, right) => left.barNumber - right.barNumber);
        const validationErrors: string[] = [];
        if (totalBars > 0 && validatedAnchors.length !== totalBars) {
          validationErrors.push("countMismatch");
        }
        for (let index = 0; index < validatedAnchors.length; index += 1) {
          const anchor = validatedAnchors[index];
          if (!anchor) {
            continue;
          }
          const expectedBar = index + 1;
          if (totalBars > 0 && anchor.barNumber !== expectedBar) {
            validationErrors.push("barSequence");
            break;
          }
          const validGeometry =
            Number.isFinite(anchor.startX) &&
            Number.isFinite(anchor.endX) &&
            Number.isFinite(anchor.y) &&
            Number.isFinite(anchor.height) &&
            anchor.endX > anchor.startX + 2 &&
            anchor.height > 0;
          if (!validGeometry || anchor.rowIndex < 0) {
            validationErrors.push("invalidGeometry");
            break;
          }

          const nextAnchor = validatedAnchors[index + 1];
          if (!nextAnchor) {
            continue;
          }
          if (nextAnchor.barNumber <= anchor.barNumber) {
            validationErrors.push("barOrder");
            break;
          }
          if (nextAnchor.rowIndex < anchor.rowIndex) {
            validationErrors.push("rowOrder");
            break;
          }
          if (nextAnchor.rowIndex === anchor.rowIndex && anchor.endX > nextAnchor.startX + 4) {
            validationErrors.push("rowOverlap");
            break;
          }
        }

        if (validationErrors.length > 0) {
          strategyDebug.validation = "fail";
          strategyDebug.normalizedAnchors = validatedAnchors;
          strategyDebug.validationErrors = validationErrors;
          strategyAttempts.push(
            `${strategy.source}:validation=fail,normalizedBars=${validatedAnchors.length},totalBars=${totalBars > 0 ? totalBars : "-"},reason=${validationErrors.join("+")},fallbackUsed=yes`,
          );
          continue;
        }

        const chosenGenericSource = isPercussionDefaultLayout ? "generic-shared" : strategy.source;
        state.playbackBarAnchors = validatedAnchors;
        state.playbackBarAnchorCount = state.playbackBarAnchors.length;
        state.playbackBarAnchorSource = chosenGenericSource;
        const firstBar = state.playbackBarAnchors[0]?.barNumber ?? null;
        const lastBar = state.playbackBarAnchors[state.playbackBarAnchors.length - 1]?.barNumber ?? null;
        const barsMatchTotal = totalBars > 0 ? state.playbackBarAnchors.length === totalBars : null;
        state.playbackAnchorStrategyAttempts = `chosenSource=${chosenGenericSource} | ${strategyAttempts.join(" | ")} | diag:noisySkip=no,normalizedBars=${state.playbackBarAnchors.length},firstBar=${firstBar ?? "-"},lastBar=${lastBar ?? "-"},rows=${rowSummaries.length},matchesTotal=${barsMatchTotal === null ? "-" : barsMatchTotal ? "yes" : "no"},validation=pass,fallbackUsed=no,totalBars=${totalBars > 0 ? totalBars : "-"}`;
        strategyDebug.validation = "pass";
        strategyDebug.normalizedAnchors = validatedAnchors;
        strategyDebug.rowCount = rowSummaries.length;
        state.latestAnchorStrategyDebug = strategyDebugResults;
        updateDebugField(rootElement, "playback-bar-anchor-count", String(state.playbackBarAnchorCount));
        updateDebugField(rootElement, "playback-bar-anchor-source", chosenGenericSource);
        updateDebugField(rootElement, "playback-anchor-strategy-attempts", state.playbackAnchorStrategyAttempts);
        return;
      }
    }

    const dedupedAnchors = rawAnchors.filter((anchor, index) => {
      if (index === 0) {
        return true;
      }

      const previous = rawAnchors[index - 1];
      if (!previous) {
        return true;
      }

      return Math.abs(anchor.x - previous.x) > 8 || Math.abs(anchor.y - previous.y) > 8;
    });
    const rowTolerance = 10;
    const rawRowGroups: Array<{ yCenter: number; yMin: number; yMax: number; anchorIndexes: number[] }> = [];
    for (let index = 0; index < dedupedAnchors.length; index += 1) {
      const anchor = dedupedAnchors[index];
      if (!anchor) {
        continue;
      }

      const existingRowIndex = rawRowGroups.findIndex((row) => Math.abs(row.yCenter - anchor.y) <= rowTolerance);
      if (existingRowIndex >= 0) {
        const existingRow = rawRowGroups[existingRowIndex];
        if (existingRow) {
          existingRow.yMin = Math.min(existingRow.yMin, anchor.y);
          existingRow.yMax = Math.max(existingRow.yMax, anchor.y);
          existingRow.yCenter = (existingRow.yMin + existingRow.yMax) / 2;
          existingRow.anchorIndexes.push(index);
        }
      } else {
        rawRowGroups.push({
          yCenter: anchor.y,
          yMin: anchor.y,
          yMax: anchor.y,
          anchorIndexes: [index],
        });
      }
    }

    const filteredAnchorsWithRow: Array<{ x: number; y: number; height: number; rawRowIndex: number }> = [];
    const rawRowTerminalBoundaryByIndex: Array<number | null> = new Array(rawRowGroups.length).fill(null);
    let droppedTerminalCount = 0;
    rawRowGroups.forEach((row, rawRowIndex) => {
      const rowIndexesSortedByX = [...row.anchorIndexes].sort((left, right) => {
        const leftAnchor = dedupedAnchors[left];
        const rightAnchor = dedupedAnchors[right];
        if (!leftAnchor || !rightAnchor) {
          return left - right;
        }

        return leftAnchor.x - rightAnchor.x;
      });

      if (rowIndexesSortedByX.length <= 1) {
        rowIndexesSortedByX.forEach((anchorIndex) => {
          const anchor = dedupedAnchors[anchorIndex];
          if (!anchor) {
            return;
          }

          filteredAnchorsWithRow.push({
            x: anchor.x,
            y: anchor.y,
            height: anchor.height,
            rawRowIndex,
          });
        });
        return;
      }

      const keptIndexes = rowIndexesSortedByX.slice(0, -1);
      const droppedTerminalIndex = rowIndexesSortedByX[rowIndexesSortedByX.length - 1];
      const droppedTerminalAnchor = droppedTerminalIndex === undefined ? null : dedupedAnchors[droppedTerminalIndex] ?? null;
      rawRowTerminalBoundaryByIndex[rawRowIndex] = droppedTerminalAnchor ? droppedTerminalAnchor.x : null;
      keptIndexes.forEach((anchorIndex) => {
        const anchor = dedupedAnchors[anchorIndex];
        if (!anchor) {
          return;
        }

        filteredAnchorsWithRow.push({
          x: anchor.x,
          y: anchor.y,
          height: anchor.height,
          rawRowIndex,
        });
      });
      droppedTerminalCount += 1;
    });

    const filteredAnchors = [...filteredAnchorsWithRow].sort((left, right) =>
      left.y === right.y ? left.x - right.x : left.y - right.y,
    );
    const limitedAnchors = totalBars > 0 ? filteredAnchors.slice(0, totalBars) : filteredAnchors;
    if (limitedAnchors.length === 0) {
      strategyDebug.validation = "limitedEmpty";
      continue;
    }

    const rowSummaries: Array<{
      yCenter: number;
      yMin: number;
      yMax: number;
      maxHeight: number;
      rowRightX: number | null;
      rowTerminalBoundaryX: number | null;
      anchorIndexes: number[];
    }> = [];
    const anchorRowIndexes = new Array<number>(limitedAnchors.length).fill(-1);
    for (let index = 0; index < limitedAnchors.length; index += 1) {
      const anchor = limitedAnchors[index];
      if (!anchor) {
        continue;
      }

      const existingRowIndex = rowSummaries.findIndex((row) => Math.abs(row.yCenter - anchor.y) <= rowTolerance);
      if (existingRowIndex >= 0) {
        const existingRow = rowSummaries[existingRowIndex];
        if (existingRow) {
          existingRow.yMin = Math.min(existingRow.yMin, anchor.y);
          existingRow.yMax = Math.max(existingRow.yMax, anchor.y);
          existingRow.maxHeight = Math.max(existingRow.maxHeight, anchor.height);
          existingRow.yCenter = (existingRow.yMin + existingRow.yMax) / 2;
          existingRow.rowTerminalBoundaryX =
            existingRow.rowTerminalBoundaryX ?? rawRowTerminalBoundaryByIndex[anchor.rawRowIndex] ?? null;
          existingRow.anchorIndexes.push(index);
          anchorRowIndexes[index] = existingRowIndex;
        }
      } else {
        rowSummaries.push({
          yCenter: anchor.y,
          yMin: anchor.y,
          yMax: anchor.y,
          maxHeight: anchor.height,
          rowRightX: null,
          rowTerminalBoundaryX: rawRowTerminalBoundaryByIndex[anchor.rawRowIndex] ?? null,
          anchorIndexes: [index],
        });
        anchorRowIndexes[index] = rowSummaries.length - 1;
      }
    }

    const horizontalLineCandidates = Array.from(renderHost.querySelectorAll<SVGLineElement>("svg line"))
      .filter((line) => {
        const x1 = Number(line.getAttribute("x1"));
        const y1 = Number(line.getAttribute("y1"));
        const x2 = Number(line.getAttribute("x2"));
        const y2 = Number(line.getAttribute("y2"));
        if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
          return false;
        }

        const horizontalSpan = Math.abs(x2 - x1);
        const verticalDelta = Math.abs(y2 - y1);
        return horizontalSpan >= 36 && verticalDelta <= 1.2;
      })
      .map((line) => line.getBoundingClientRect())
      .filter((rect) => rect.width >= 24);

    const horizontalRectCandidates = Array.from(renderHost.querySelectorAll<SVGRectElement>("svg rect"))
      .filter((rect) => {
        const width = Number(rect.getAttribute("width"));
        const height = Number(rect.getAttribute("height"));
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
          return false;
        }

        return width >= 24 && height > 0 && height <= 4;
      })
      .map((rect) => rect.getBoundingClientRect());

    const rowBoundCandidates = [...horizontalLineCandidates, ...horizontalRectCandidates].map((rect) => ({
      top: rect.top - renderHostRect.top + renderHost.scrollTop,
      bottom: rect.bottom - renderHostRect.top + renderHost.scrollTop,
      right: rect.right - renderHostRect.left + renderHost.scrollLeft,
    }));

    rowSummaries.forEach((row) => {
      const rowTop = row.yMin - 8;
      const rowBottom = row.yMax + row.maxHeight + 8;
      let rowRightX = Number.NEGATIVE_INFINITY;

      rowBoundCandidates.forEach((candidate) => {
        const overlapsRow = candidate.bottom >= rowTop && candidate.top <= rowBottom;
        if (!overlapsRow) {
          return;
        }

        rowRightX = Math.max(rowRightX, candidate.right);
      });

      const structuralRightX = Number.isFinite(rowRightX) ? rowRightX : null;
      const sortedAnchorIndexes = [...row.anchorIndexes].sort((left, right) => left - right);
      const rowGaps: number[] = [];
      sortedAnchorIndexes.forEach((anchorIndex, position) => {
        const nextAnchorIndex = sortedAnchorIndexes[position + 1];
        if (nextAnchorIndex === undefined) {
          return;
        }

        const leftAnchor = limitedAnchors[anchorIndex];
        const rightAnchor = limitedAnchors[nextAnchorIndex];
        if (!leftAnchor || !rightAnchor) {
          return;
        }

        const gap = rightAnchor.x - leftAnchor.x;
        if (gap > 12) {
          rowGaps.push(gap);
        }
      });

      const sortedRowGaps = [...rowGaps].sort((left, right) => left - right);
      const rowMedianGap = sortedRowGaps.length > 0 ? sortedRowGaps[Math.floor(sortedRowGaps.length / 2)] : null;
      const lastAnchorIndex = sortedAnchorIndexes[sortedAnchorIndexes.length - 1];
      const lastAnchor = lastAnchorIndex === undefined ? null : limitedAnchors[lastAnchorIndex] ?? null;
      const conservativeGap = Math.min(Math.max((rowMedianGap ?? 72) * 0.9, 24), 160);
      const conservativeRightX = lastAnchor ? lastAnchor.x + conservativeGap : null;

      if (structuralRightX === null) {
        row.rowRightX = conservativeRightX;
        return;
      }
      if (conservativeRightX === null) {
        row.rowRightX = structuralRightX;
        return;
      }

      row.rowRightX = Math.min(structuralRightX, conservativeRightX);
    });

    const sameSystemGaps: number[] = [];
    for (let index = 0; index < limitedAnchors.length - 1; index += 1) {
      const currentAnchor = limitedAnchors[index];
      const nextAnchor = limitedAnchors[index + 1];
      if (!currentAnchor || !nextAnchor) {
        continue;
      }

      const currentRow = anchorRowIndexes[index];
      const nextRow = anchorRowIndexes[index + 1];
      if (currentRow < 0 || nextRow < 0 || currentRow !== nextRow) {
        continue;
      }

      const gap = nextAnchor.x - currentAnchor.x;
      if (gap > 12) {
        sameSystemGaps.push(gap);
      }
    }

    const sortedGaps = [...sameSystemGaps].sort((left, right) => left - right);
    const medianGap = sortedGaps.length > 0 ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 72;
    const fallbackGap = Math.min(Math.max(medianGap, 32), 220);

    const chosenGenericSource = isPercussionDefaultLayout ? "generic-shared" : strategy.source;
    state.playbackBarAnchors = limitedAnchors.map((anchor, index) => {
      const nextAnchor = limitedAnchors[index + 1];
      const currentRowIndex = anchorRowIndexes[index];
      const nextRowIndex = anchorRowIndexes[index + 1] ?? -1;
      const sameSystemNext =
        nextAnchor && currentRowIndex >= 0 && currentRowIndex === nextRowIndex && nextAnchor.x > anchor.x + 8
          ? nextAnchor
          : null;
      const rowRightX = currentRowIndex >= 0 ? rowSummaries[currentRowIndex]?.rowRightX ?? null : null;
      const rowTerminalBoundaryX = currentRowIndex >= 0 ? rowSummaries[currentRowIndex]?.rowTerminalBoundaryX ?? null : null;
      const fallbackEndX = anchor.x + fallbackGap;
      const rowBoundaryEndX =
        rowTerminalBoundaryX !== null
          ? Math.max(anchor.x + 12, rowTerminalBoundaryX - 2)
          : rowRightX !== null
            ? Math.max(anchor.x + 12, rowRightX - 2)
            : fallbackEndX;
      const endX = sameSystemNext
        ? Math.max(anchor.x + 12, sameSystemNext.x - 2)
        : rowBoundaryEndX;
      return {
        barNumber: index + 1,
        startX: anchor.x,
        endX,
        rowIndex: currentRowIndex,
        y: anchor.y,
        height: anchor.height,
      };
    });
    state.playbackBarAnchorCount = state.playbackBarAnchors.length;
    state.playbackBarAnchorSource = chosenGenericSource;
    const rowsWithTerminalBoundary = rowSummaries.filter((row) => row.rowTerminalBoundaryX !== null).length;
    state.playbackAnchorStrategyAttempts = `chosenSource=${chosenGenericSource} | ${strategyAttempts.join(" | ")} | diag:raw=${rawAnchors.length},dedup=${dedupedAnchors.length},filtered=${filteredAnchors.length},used=${limitedAnchors.length},rows=${rowSummaries.length},dropped=${droppedTerminalCount},rowTerminal=${rowsWithTerminalBoundary},totalBars=${totalBars > 0 ? totalBars : "-"}`;
    strategyDebug.validation = "pass";
    strategyDebug.dedupCount = dedupedAnchors.length;
    strategyDebug.filteredCount = filteredAnchors.length;
    strategyDebug.rowCount = rowSummaries.length;
    strategyDebug.normalizedAnchors = state.playbackBarAnchors;
    strategyDebug.rowSummaries = rowSummaries;
    state.latestAnchorStrategyDebug = strategyDebugResults;
    updateDebugField(rootElement, "playback-bar-anchor-count", String(state.playbackBarAnchorCount));
    updateDebugField(rootElement, "playback-bar-anchor-source", chosenGenericSource);
    updateDebugField(rootElement, "playback-anchor-strategy-attempts", state.playbackAnchorStrategyAttempts);
    return;
  }

  if (isPercussionDefaultLayout) {
    const percussionResult = rebuildPercussionPlaybackBarAnchors(renderHost, totalBars);
    state.latestPercussionAnchorDebug = percussionResult.details;
    if (percussionResult.anchors !== null) {
      state.playbackBarAnchors = percussionResult.anchors;
      state.playbackBarAnchorCount = percussionResult.anchors.length;
      state.playbackBarAnchorSource = "percussion-fallback";
      state.playbackAnchorStrategyAttempts = `${strategyAttempts.join(" | ")} | chosenSource=percussion-fallback`;
      updateDebugField(rootElement, "playback-bar-anchor-count", String(state.playbackBarAnchorCount));
      updateDebugField(rootElement, "playback-bar-anchor-source", state.playbackBarAnchorSource);
      updateDebugField(rootElement, "playback-anchor-strategy-attempts", state.playbackAnchorStrategyAttempts);
      return;
    }
    strategyAttempts.push(`${percussionResult.diagnostics},chosenSource=percussion-fallback,validation=fail`);
  }

  state.latestAnchorStrategyDebug = strategyDebugResults;

  state.playbackBarAnchors = [];
  state.playbackBarAnchorCount = 0;
  state.playbackBarAnchorSource = null;
  state.playbackAnchorStrategyAttempts = strategyAttempts.join(" | ");
  updateDebugField(rootElement, "playback-bar-anchor-count", "0");
  updateDebugField(rootElement, "playback-bar-anchor-source", "-");
  updateDebugField(
    rootElement,
    "playback-anchor-strategy-attempts",
    state.playbackAnchorStrategyAttempts && state.playbackAnchorStrategyAttempts.length > 0
      ? state.playbackAnchorStrategyAttempts
      : "-",
  );
}

function schedulePlaybackBarAnchorRebuild(state: AppState, rootElement: HTMLElement): void {
  if (!ENABLE_CUSTOM_PLAYHEAD) {
    return;
  }

  state.playbackAnchorRebuildToken += 1;
  if (state.playbackAnchorRebuildScheduled) {
    return;
  }

  state.playbackAnchorRebuildScheduled = true;
  const scheduledToken = state.playbackAnchorRebuildToken;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      state.playbackAnchorRebuildScheduled = false;
      if (scheduledToken !== state.playbackAnchorRebuildToken) {
        schedulePlaybackBarAnchorRebuild(state, rootElement);
        return;
      }

      try {
        rebuildPlaybackBarAnchors(state, rootElement);
      } catch {
        state.playbackBarAnchors = [];
        state.playbackBarAnchorCount = 0;
        state.playbackBarAnchorSource = null;
        state.playbackAnchorStrategyAttempts = "error";
        updateDebugField(rootElement, "playback-bar-anchor-count", "0");
        updateDebugField(rootElement, "playback-bar-anchor-source", "-");
        updateDebugField(rootElement, "playback-anchor-strategy-attempts", "error");
        hidePlaybackPlayhead(rootElement, state);
        return;
      }

      updatePlaybackPlayheadFromRuntime(state, rootElement);
      updateNavigationSelectionVisual(state, rootElement);
    });
  });
}

function invalidatePlaybackBarAnchorRebuild(state: AppState): void {
  state.playbackAnchorRebuildToken += 1;
}

function updatePlaybackPlayheadFromRuntime(state: AppState, rootElement: HTMLElement): void {
  if (!ENABLE_CUSTOM_PLAYHEAD) {
    hidePlaybackPlayhead(rootElement, state);
    return;
  }

  const activeManualTarget = getActiveManualNavigationTarget(state);
  let effectiveCurrentBar = state.playbackCurrentBar;
  let effectiveCurrentTick = state.playbackCurrentTick;
  let effectiveBarStartTick = state.playbackCurrentBarStartTick;
  let effectiveBarEndTickExclusive = state.playbackCurrentBarEndTickExclusive;
  if (state.manualNavigationVisualOverrideActive && activeManualTarget) {
    effectiveCurrentBar = activeManualTarget.targetBar;
    effectiveCurrentTick = activeManualTarget.targetTick;
    const activeManualTargetBarRange = state.gpRenderer?.getBarTickRange(activeManualTarget.targetBar) ?? null;
    effectiveBarStartTick = activeManualTargetBarRange?.startTick ?? activeManualTarget.targetTick;
    effectiveBarEndTickExclusive =
      activeManualTargetBarRange?.endTickExclusive ?? Math.max(activeManualTarget.targetTick + 1, effectiveBarStartTick + 1);
  }

  if (effectiveCurrentBar === null || effectiveCurrentBar <= 0) {
    hidePlaybackPlayhead(rootElement, state);
    return;
  }

  const anchorForCurrentBar = state.playbackBarAnchors.find((item) => item.barNumber === effectiveCurrentBar);
  if (!anchorForCurrentBar) {
    hidePlaybackPlayhead(rootElement, state);
    return;
  }

  const barTickSpan =
    effectiveBarStartTick !== null && effectiveBarEndTickExclusive !== null
      ? effectiveBarEndTickExclusive - effectiveBarStartTick
      : null;
  if (
    effectiveCurrentTick === null ||
    effectiveBarStartTick === null ||
    effectiveBarEndTickExclusive === null ||
    barTickSpan === null ||
    barTickSpan <= 0
  ) {
    hidePlaybackPlayhead(rootElement, state);
    return;
  }

  const selectedAnchor = anchorForCurrentBar;
  const currentBarNumber = effectiveCurrentBar;
  const selectedAnchorBarNumber = currentBarNumber;
  const previousBarNumber = state.lastPlaybackVisualBarNumber;
  const previousBarAnchor =
    previousBarNumber === null ? null : state.playbackBarAnchors.find((item) => item.barNumber === previousBarNumber) ?? null;

  const playhead = ensurePlaybackPlayheadElement(rootElement);
  const highlight = ensurePlaybackHighlightElement(rootElement);
  if (!playhead || !highlight) {
    state.playbackPlayheadVisible = false;
    return;
  }

  const barStartTick = effectiveBarStartTick;
  const barEndTickExclusive = effectiveBarEndTickExclusive;
  const normalizedProgress = (effectiveCurrentTick - barStartTick) / (barEndTickExclusive - barStartTick);
  const clampedProgress = Math.min(Math.max(normalizedProgress, 0), 1);
  const rowBreakTransition =
    previousBarNumber !== null &&
    previousBarNumber !== selectedAnchorBarNumber &&
    previousBarAnchor !== null &&
    previousBarAnchor.rowIndex >= 0 &&
    selectedAnchor.rowIndex >= 0 &&
    previousBarAnchor.rowIndex !== selectedAnchor.rowIndex;
  if (rowBreakTransition) {
    console.info(
      "[songStep] row-break mapping diagnostics:",
      JSON.stringify({
        currentTick: effectiveCurrentTick,
        playbackCurrentBar: currentBarNumber,
        selectedVisualAnchorBar: selectedAnchorBarNumber,
        previousVisualBar: previousBarNumber,
        currentAnchorRow: selectedAnchor.rowIndex,
        previousAnchorRow: previousBarAnchor?.rowIndex ?? null,
        barStartTick: effectiveBarStartTick,
        barEndTickExclusive: effectiveBarEndTickExclusive,
        mappingCorrectionActive: false,
        mappingOffset: 0,
      }),
    );
  }
  const effectiveProgress = rowBreakTransition ? 0 : clampedProgress;
  const regionWidth = Math.max(selectedAnchor.endX - selectedAnchor.startX, 8);
  const playheadX = selectedAnchor.startX + regionWidth * effectiveProgress;

  highlight.style.left = `${selectedAnchor.startX}px`;
  highlight.style.top = `${selectedAnchor.y}px`;
  highlight.style.width = `${regionWidth}px`;
  highlight.style.height = `${Math.max(selectedAnchor.height, 28)}px`;
  highlight.style.display = "block";

  playhead.style.left = `${playheadX}px`;
  playhead.style.top = `${selectedAnchor.y}px`;
  playhead.style.height = `${Math.max(selectedAnchor.height, 28)}px`;
  playhead.style.display = "block";
  state.playbackPlayheadVisible = true;
  state.lastPlaybackVisualBarNumber = selectedAnchorBarNumber;
}

function updatePlaybackFollowDiagnostics(
  rootElement: HTMLElement,
  followTargetFound: boolean,
  followSource: string | null,
): void {
  updateDebugField(rootElement, "playback-follow-target-found", followTargetFound ? "yes" : "no");
  updateDebugField(rootElement, "playback-follow-source", followSource ?? "-");
}

function isPlaybackInteractionActive(state: AppState): boolean {
  return state.playbackTransportActive || state.playbackIsPlaying === true;
}

function updatePlaybackFollowInRenderHost(state: AppState, rootElement: HTMLElement): void {
  const tabViewport = rootElement.querySelector<HTMLElement>(".playerTabViewport");
  if (!tabViewport) {
    state.playbackFollowTargetFound = false;
    state.playbackFollowSource = "missing-viewport";
    updatePlaybackFollowDiagnostics(rootElement, false, "missing-viewport");
    return;
  }

  if (!isPlaybackInteractionActive(state) || state.playbackCurrentBar === null || state.playbackCurrentBar <= 0) {
    state.lastPlaybackFollowRowIndex = null;
    state.playbackFollowTargetFound = false;
    state.playbackFollowSource = "inactive";
    updatePlaybackFollowDiagnostics(rootElement, false, "inactive");
    return;
  }

  const activeAnchor = state.playbackBarAnchors.find((anchor) => anchor.barNumber === state.playbackCurrentBar) ?? null;
  if (!activeAnchor || activeAnchor.rowIndex < 0) {
    state.playbackFollowTargetFound = false;
    state.playbackFollowSource = "missing-active-row";
    updatePlaybackFollowDiagnostics(rootElement, false, "missing-active-row");
    return;
  }

  if (state.lastPlaybackFollowRowIndex === activeAnchor.rowIndex) {
    state.playbackFollowTargetFound = true;
    state.playbackFollowSource = "row-unchanged";
    updatePlaybackFollowDiagnostics(rootElement, true, "row-unchanged");
    return;
  }

  const rowsByIndex = new Map<number, { minY: number; maxY: number }>();
  state.playbackBarAnchors.forEach((anchor) => {
    if (anchor.rowIndex < 0) {
      return;
    }
    const existingRow = rowsByIndex.get(anchor.rowIndex);
    if (!existingRow) {
      rowsByIndex.set(anchor.rowIndex, {
        minY: anchor.y,
        maxY: anchor.y + anchor.height,
      });
      return;
    }
    existingRow.minY = Math.min(existingRow.minY, anchor.y);
    existingRow.maxY = Math.max(existingRow.maxY, anchor.y + anchor.height);
  });

  const orderedRows = Array.from(rowsByIndex.entries())
    .sort((left, right) => left[1].minY - right[1].minY)
    .map(([rowIndex, bounds]) => ({
      rowIndex,
      minY: bounds.minY,
      maxY: bounds.maxY,
    }));
  const activeRowOrderIndex = orderedRows.findIndex((row) => row.rowIndex === activeAnchor.rowIndex);
  if (activeRowOrderIndex < 0) {
    state.playbackFollowTargetFound = false;
    state.playbackFollowSource = "row-order-missing";
    updatePlaybackFollowDiagnostics(rootElement, false, "row-order-missing");
    return;
  }

  const targetTopRowOrderIndex = Math.max(0, activeRowOrderIndex - 1);
  const targetTopRow = orderedRows[targetTopRowOrderIndex];
  const targetScrollTop = Math.max(0, targetTopRow.minY - 8);
  const maxScrollTop = Math.max(0, tabViewport.scrollHeight - tabViewport.clientHeight);
  const clampedTargetScrollTop = Math.min(targetScrollTop, maxScrollTop);
  if (Math.abs(tabViewport.scrollTop - clampedTargetScrollTop) > 4) {
    tabViewport.scrollTop = clampedTargetScrollTop;
  }

  state.lastPlaybackFollowRowIndex = activeAnchor.rowIndex;
  state.playbackFollowTargetFound = true;
  state.playbackFollowSource = "row-transition-follow";
  updatePlaybackFollowDiagnostics(rootElement, true, "row-transition-follow");
}

function updateLoopControlsVisual(rootElement: HTMLElement, state: AppState): void {
  const loopToggleButton = rootElement.querySelector<HTMLButtonElement>("[data-loop-toggle-button='true']");
  if (loopToggleButton) {
    loopToggleButton.classList.remove("primaryButton", "secondaryButton");
    loopToggleButton.classList.add(state.loopEnabled ? "primaryButton" : "secondaryButton");
  }

  const loopStartLabel = rootElement.querySelector<HTMLElement>("[data-loop-start-label='true']");
  if (loopStartLabel) {
    loopStartLabel.textContent = `A: ${state.loopStartBar === null ? "-" : String(state.loopStartBar)}`;
  }
  const loopEndLabel = rootElement.querySelector<HTMLElement>("[data-loop-end-label='true']");
  if (loopEndLabel) {
    loopEndLabel.textContent = `B: ${state.loopEndBar === null ? "-" : String(state.loopEndBar)}`;
  }
}

function updateProjectStatusBanner(rootElement: HTMLElement, message: string): void {
  let statusBanner = rootElement.querySelector<HTMLElement>("[data-status-banner='true']");
  if (!statusBanner) {
    const appShell = rootElement.querySelector<HTMLElement>(".appShell");
    const appHeader = rootElement.querySelector<HTMLElement>(".appHeader");
    if (!appShell || !appHeader) {
      return;
    }

    statusBanner = document.createElement("p");
    statusBanner.className = "statusBanner";
    statusBanner.setAttribute("role", "status");
    statusBanner.dataset.statusBanner = "true";
    appShell.insertBefore(statusBanner, appHeader.nextSibling);
  }

  statusBanner.textContent = message;
}

function isSameTrackList(current: GpTrackInfo[], next: GpTrackInfo[]): boolean {
  if (current.length !== next.length) {
    return false;
  }

  return current.every((track, index) => {
    const nextTrack = next[index];
    return nextTrack && track.index === nextTrack.index && track.name === nextTrack.name;
  });
}

function setupBottomDockResize(rootElement: HTMLElement, state: AppState): void {
  const layoutShell = rootElement.querySelector<HTMLElement>(".playerLayoutShell");
  const resizeHandle = rootElement.querySelector<HTMLElement>("[data-dock-resize-handle='true']");
  const headers = rootElement.querySelector<HTMLElement>(".playerDockHeaders");
  const topBand = rootElement.querySelector<HTMLElement>(".playerDockTopBand");
  const middleScroll = rootElement.querySelector<HTMLElement>(".playerDockMiddleScroll");
  const bottomBand = rootElement.querySelector<HTMLElement>(".playerDockBottomBand");
  if (!layoutShell || !resizeHandle || !headers || !topBand || !middleScroll || !bottomBand) {
    return;
  }

  const resolveDynamicDockMaxHeight = (): number => {
    const middleContentHeight = Math.max(middleScroll.scrollHeight, middleScroll.clientHeight, MIN_BOTTOM_DOCK_HEIGHT_PX);
    const measuredContentHeight =
      resizeHandle.offsetHeight + headers.offsetHeight + topBand.offsetHeight + middleContentHeight + bottomBand.offsetHeight;
    return Math.min(MAX_BOTTOM_DOCK_HEIGHT_PX, Math.max(MIN_BOTTOM_DOCK_HEIGHT_PX, measuredContentHeight));
  };

  const applyDockHeight = (): void => {
    const dynamicMaxHeight = resolveDynamicDockMaxHeight();
    state.bottomDockHeightPx = Math.min(Math.max(state.bottomDockHeightPx, MIN_BOTTOM_DOCK_HEIGHT_PX), dynamicMaxHeight);
    layoutShell.style.setProperty("--player-dock-height", `${state.bottomDockHeightPx}px`);
  };
  applyDockHeight();

  let activePointerId: number | null = null;
  let dragStartY = 0;
  let dragStartHeight = state.bottomDockHeightPx;
  let previousUserSelect = "";

  const finishDrag = (pointerId: number | null): void => {
    if (pointerId !== null) {
      resizeHandle.releasePointerCapture?.(pointerId);
    }
    activePointerId = null;
    document.body.style.userSelect = previousUserSelect;
    rootElement.classList.remove("isDockResizing");
  };

  resizeHandle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    activePointerId = event.pointerId;
    dragStartY = event.clientY;
    dragStartHeight = state.bottomDockHeightPx;
    previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    rootElement.classList.add("isDockResizing");
    resizeHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  resizeHandle.addEventListener("pointermove", (event) => {
    if (activePointerId === null || event.pointerId !== activePointerId) {
      return;
    }
    const dragDeltaY = dragStartY - event.clientY;
    const dynamicMaxHeight = resolveDynamicDockMaxHeight();
    const nextHeight = Math.min(
      Math.max(dragStartHeight + dragDeltaY, MIN_BOTTOM_DOCK_HEIGHT_PX),
      dynamicMaxHeight,
    );
    state.bottomDockHeightPx = nextHeight;
    applyDockHeight();
    event.preventDefault();
  });

  resizeHandle.addEventListener("pointerup", (event) => {
    if (activePointerId === null || event.pointerId !== activePointerId) {
      return;
    }
    finishDrag(event.pointerId);
  });
  resizeHandle.addEventListener("pointercancel", (event) => {
    if (activePointerId === null || event.pointerId !== activePointerId) {
      return;
    }
    finishDrag(event.pointerId);
  });
}

function setupBottomDockHorizontalSync(rootElement: HTMLElement): void {
  const scrollers = Array.from(rootElement.querySelectorAll<HTMLElement>("[data-dock-horizontal-sync='true']"));
  if (scrollers.length < 2) {
    return;
  }

  let syncing = false;
  scrollers.forEach((scroller) => {
    scroller.addEventListener("scroll", () => {
      if (syncing) {
        return;
      }
      syncing = true;
      const { scrollLeft } = scroller;
      scrollers.forEach((otherScroller) => {
        if (otherScroller === scroller) {
          return;
        }
        otherScroller.scrollLeft = scrollLeft;
      });
      syncing = false;
    });
  });
}

function setupTabViewportZoomWheel(rootElement: HTMLElement, state: AppState): void {
  const tabViewport = rootElement.querySelector<HTMLElement>(".playerTabViewport");
  if (!tabViewport) {
    return;
  }

  tabViewport.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      const zoomDirection = event.deltaY < 0 ? 1 : -1;
      const nextZoomPercent = Math.max(
        MIN_TAB_ZOOM_PERCENT,
        Math.min(MAX_TAB_ZOOM_PERCENT, state.tabZoomPercent + zoomDirection * TAB_ZOOM_STEP_PERCENT),
      );
      if (nextZoomPercent === state.tabZoomPercent) {
        return;
      }
      state.tabZoomPercent = nextZoomPercent;
      state.gpRenderer?.setZoom(nextZoomPercent);
    },
    { passive: false },
  );
}

function applyNavigationSelection(
  state: AppState,
  rootElement: HTMLElement,
  barNumber: number,
  tick: number | null,
  trackIndex: number,
): void {
  state.selectedNavigationBar = barNumber;
  state.selectedNavigationTick = tick;
  state.selectedNavigationTrackIndex = trackIndex;
  state.selectionDivergenceSuppressTicks = 8;
  state.manualNavigationVisualOverrideActive = true;
  updateArrangementSelectionHighlight(state, rootElement);
  updateNavigationSelectionVisual(state, rootElement);
}

function resetPlaybackFollowBaselineAfterSeek(state: AppState): void {
  state.lastPlaybackVisualBarNumber = null;
  state.lastPlaybackFollowRowIndex = null;
}

function haltPlaybackTransportAfterSeek(state: AppState, rootElement: HTMLElement): void {
  if (!isPlaybackInteractionActive(state) || !state.gpRenderer) {
    return;
  }
  state.gpRenderer.pause();
  state.playbackTransportActive = false;
  state.playbackIsPlaying = false;
  state.playbackFollowTargetFound = false;
  state.playbackFollowSource = "seek-paused";
  updatePlaybackFollowDiagnostics(rootElement, false, "seek-paused");
  resetPlaybackFollowBaselineAfterSeek(state);
}

function clearNavigationSelectionState(state: AppState, rootElement: HTMLElement): void {
  state.selectedNavigationBar = null;
  state.selectedNavigationTick = null;
  state.selectedNavigationTrackIndex = null;
  state.selectionDivergenceSuppressTicks = 0;
  state.manualNavigationVisualOverrideActive = false;
  updateArrangementSelectionHighlight(state, rootElement);
  hideNavigationSelection(rootElement);
}

function clearLoopState(state: AppState): void {
  state.loopEnabled = false;
  state.loopStartBar = null;
  state.loopStartTick = null;
  state.loopEndBar = null;
  state.loopEndTick = null;
  state.loopDragHandle = null;
}

function updateLoopHandlesVisual(state: AppState, rootElement: HTMLElement): void {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return;
  }

  const existingHandles = renderHost.querySelectorAll<HTMLElement>("[data-loop-handle]");
  const existingRegionSegments = renderHost.querySelectorAll<HTMLElement>("[data-loop-region-segment='true']");
  if (!state.loopEnabled || state.loopStartBar === null || state.loopEndBar === null) {
    existingHandles.forEach((handle) => handle.remove());
    existingRegionSegments.forEach((segment) => segment.remove());
    return;
  }

  const startAnchor = state.playbackBarAnchors.find((anchor) => anchor.barNumber === state.loopStartBar) ?? null;
  const endAnchor = state.playbackBarAnchors.find((anchor) => anchor.barNumber === state.loopEndBar) ?? null;
  if (!startAnchor || !endAnchor) {
    existingHandles.forEach((handle) => handle.remove());
    existingRegionSegments.forEach((segment) => segment.remove());
    return;
  }

  existingRegionSegments.forEach((segment) => segment.remove());

  const orderedLoopStartBar = Math.min(state.loopStartBar, state.loopEndBar);
  const orderedLoopEndBar = Math.max(state.loopStartBar, state.loopEndBar);
  const orderedStartAnchor = orderedLoopStartBar === state.loopStartBar ? startAnchor : endAnchor;
  const orderedEndAnchor = orderedLoopEndBar === state.loopEndBar ? endAnchor : startAnchor;
  const rowsByIndex = new Map<number, { rowStartX: number; rowEndX: number; rowTop: number; rowBottom: number }>();
  state.playbackBarAnchors.forEach((anchor) => {
    if (anchor.rowIndex < 0) {
      return;
    }
    const existing = rowsByIndex.get(anchor.rowIndex);
    const top = anchor.y;
    const bottom = anchor.y + anchor.height;
    if (!existing) {
      rowsByIndex.set(anchor.rowIndex, {
        rowStartX: anchor.startX,
        rowEndX: anchor.endX,
        rowTop: top,
        rowBottom: bottom,
      });
      return;
    }
    existing.rowStartX = Math.min(existing.rowStartX, anchor.startX);
    existing.rowEndX = Math.max(existing.rowEndX, anchor.endX);
    existing.rowTop = Math.min(existing.rowTop, top);
    existing.rowBottom = Math.max(existing.rowBottom, bottom);
  });

  const segmentRowIndexes =
    orderedStartAnchor.rowIndex >= 0 && orderedEndAnchor.rowIndex >= 0
      ? Array.from(
          { length: orderedEndAnchor.rowIndex - orderedStartAnchor.rowIndex + 1 },
          (_, offset) => orderedStartAnchor.rowIndex + offset,
        )
      : [];

  segmentRowIndexes.forEach((rowIndex, segmentIndex) => {
    const rowBounds = rowsByIndex.get(rowIndex);
    if (!rowBounds) {
      return;
    }

    const isSingleRowLoop = orderedStartAnchor.rowIndex === orderedEndAnchor.rowIndex;
    const isFirstRow = segmentIndex === 0;
    const isLastRow = segmentIndex === segmentRowIndexes.length - 1;
    const segmentLeft =
      isSingleRowLoop || isFirstRow
        ? orderedStartAnchor.startX
        : rowBounds.rowStartX;
    const segmentRight =
      isSingleRowLoop || isLastRow
        ? orderedEndAnchor.endX
        : rowBounds.rowEndX;
    const segmentWidth = Math.max(segmentRight - segmentLeft, 6);
    const segmentHeight = Math.max(rowBounds.rowBottom - rowBounds.rowTop, 28);

    const segment = document.createElement("div");
    segment.dataset.loopRegionSegment = "true";
    segment.className = "loopRegionOverlay";
    segment.style.left = `${segmentLeft}px`;
    segment.style.top = `${rowBounds.rowTop}px`;
    segment.style.width = `${segmentWidth}px`;
    segment.style.height = `${segmentHeight}px`;
    renderHost.append(segment);
  });

  const ensureHandle = (kind: "start" | "end", x: number, top: number, height: number): void => {
    let handle = renderHost.querySelector<HTMLElement>(`[data-loop-handle='${kind}']`);
    if (!handle) {
      handle = document.createElement("div");
      handle.className = `loopHandle loopHandle${kind === "start" ? "Start" : "End"}`;
      handle.dataset.loopHandle = kind;
      handle.setAttribute("role", "button");
      handle.setAttribute("aria-label", kind === "start" ? "Loop start handle" : "Loop end handle");
      renderHost.append(handle);
    }
    handle.style.left = `${x - 4}px`;
    handle.style.top = `${top}px`;
    handle.style.height = `${Math.max(height, 28)}px`;
  };

  ensureHandle("start", startAnchor.startX, startAnchor.y, startAnchor.height);
  ensureHandle("end", endAnchor.endX, endAnchor.y, endAnchor.height);
}

function setupLoopHandleDrag(rootElement: HTMLElement, state: AppState): void {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return;
  }

  let activePointerId: number | null = null;
  let activeDragRowIndex: number | null = null;

  renderHost.addEventListener("pointerdown", (event) => {
    const targetElement = event.target;
    if (!(targetElement instanceof HTMLElement)) {
      return;
    }
    const loopHandle = targetElement.closest<HTMLElement>("[data-loop-handle]");
    if (!loopHandle || !state.loopEnabled) {
      return;
    }
    const handleType = loopHandle.dataset.loopHandle;
    if (handleType !== "start" && handleType !== "end") {
      return;
    }
    activePointerId = event.pointerId;
    state.loopDragHandle = handleType;
    const activeBarNumber = handleType === "start" ? state.loopStartBar : state.loopEndBar;
    const activeAnchor = activeBarNumber
      ? state.playbackBarAnchors.find((anchor) => anchor.barNumber === activeBarNumber) ?? null
      : null;
    activeDragRowIndex = activeAnchor && activeAnchor.rowIndex >= 0 ? activeAnchor.rowIndex : null;
    renderHost.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  renderHost.addEventListener("pointermove", (event) => {
    if (
      activePointerId === null ||
      event.pointerId !== activePointerId ||
      !state.loopEnabled ||
      !state.loopDragHandle ||
      state.playbackBarAnchors.length === 0 ||
      state.gpRenderer === null
    ) {
      return;
    }

    const hostRect = renderHost.getBoundingClientRect();
    const localX = event.clientX - hostRect.left + renderHost.scrollLeft;
    const localY = event.clientY - hostRect.top + renderHost.scrollTop;
    const rowBounds = new Map<number, { top: number; bottom: number }>();
    state.playbackBarAnchors.forEach((anchor) => {
      if (anchor.rowIndex < 0) {
        return;
      }
      const existing = rowBounds.get(anchor.rowIndex);
      const top = anchor.y;
      const bottom = anchor.y + anchor.height;
      if (!existing) {
        rowBounds.set(anchor.rowIndex, { top, bottom });
        return;
      }
      existing.top = Math.min(existing.top, top);
      existing.bottom = Math.max(existing.bottom, bottom);
    });

    const pointerRowIndex =
      Array.from(rowBounds.entries()).find(([, bounds]) => localY >= bounds.top && localY <= bounds.bottom)?.[0] ?? null;
    if (pointerRowIndex !== null) {
      activeDragRowIndex = pointerRowIndex;
    }

    const candidateAnchors =
      activeDragRowIndex !== null
        ? state.playbackBarAnchors.filter((anchor) => anchor.rowIndex === activeDragRowIndex)
        : state.playbackBarAnchors;
    const anchorsForSelection = candidateAnchors.length > 0 ? candidateAnchors : state.playbackBarAnchors;
    const nearestAnchor = anchorsForSelection.reduce<PlaybackBarAnchor | null>((closest, anchor) => {
      if (!closest) {
        return anchor;
      }
      const currentDistance = Math.abs(localX - (anchor.startX + anchor.endX) / 2);
      const closestDistance = Math.abs(localX - (closest.startX + closest.endX) / 2);
      return currentDistance < closestDistance ? anchor : closest;
    }, null);
    if (!nearestAnchor) {
      return;
    }

    if (state.loopDragHandle === "start") {
      if (state.loopEndBar !== null && nearestAnchor.barNumber >= state.loopEndBar) {
        return;
      }
      const range = state.gpRenderer.getBarTickRange(nearestAnchor.barNumber);
      if (!range) {
        return;
      }
      state.loopStartBar = nearestAnchor.barNumber;
      state.loopStartTick = range.startTick;
    } else {
      if (state.loopStartBar !== null && nearestAnchor.barNumber <= state.loopStartBar) {
        return;
      }
      const range = state.gpRenderer.getBarTickRange(nearestAnchor.barNumber);
      if (!range) {
        return;
      }
      state.loopEndBar = nearestAnchor.barNumber;
      state.loopEndTick = range.endTickExclusive ?? range.startTick + 1;
    }

    updateLoopHandlesVisual(state, rootElement);
    updateLoopControlsVisual(rootElement, state);
  });

  const finishDrag = (event: PointerEvent): void => {
    if (activePointerId === null || event.pointerId !== activePointerId) {
      return;
    }
    renderHost.releasePointerCapture(event.pointerId);
    activePointerId = null;
    activeDragRowIndex = null;
    state.loopDragHandle = null;
  };

  renderHost.addEventListener("pointerup", finishDrag);
  renderHost.addEventListener("pointercancel", finishDrag);
}

function seekToBarAndApplyNavigationSelection(
  state: AppState,
  rootElement: HTMLElement,
  trackIndex: number,
  barNumber: number,
): boolean {
  if (!state.gpRenderer) {
    return false;
  }
  const tick = state.gpRenderer.seekToBarStart(barNumber);
  if (tick === null) {
    return false;
  }

  applyNavigationSelection(state, rootElement, barNumber, tick, trackIndex);
  haltPlaybackTransportAfterSeek(state, rootElement);
  return true;
}

function tryCompletePendingOverviewNavigationAfterRender(
  state: AppState,
  rootElement: HTMLElement,
  committedTrackIndex: number | null,
): void {
  if (state.pendingOverviewNavigationBar === null || state.pendingOverviewNavigationTrackIndex === null) {
    return;
  }
  if (!state.gpRenderer) {
    return;
  }
  if (committedTrackIndex === null || committedTrackIndex !== state.pendingOverviewNavigationTrackIndex) {
    return;
  }

  if (state.pendingOverviewNavigationTick !== null) {
    return;
  }

  const pendingBar = state.pendingOverviewNavigationBar;
  const seekSucceeded = seekToBarAndApplyNavigationSelection(state, rootElement, committedTrackIndex, pendingBar);
  state.pendingOverviewNavigationBar = null;
  state.pendingOverviewNavigationTrackIndex = null;
  state.pendingOverviewNavigationTick = null;
  if (!seekSucceeded) {
    clearNavigationSelectionState(state, rootElement);
  }
}

function setupNotationBarNavigation(rootElement: HTMLElement, state: AppState): void {
  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return;
  }

  renderHost.addEventListener("click", (event) => {
    if (!state.gpRenderer || state.playbackBarAnchors.length === 0) {
      return;
    }

    const hostRect = renderHost.getBoundingClientRect();
    const clickX = event.clientX - hostRect.left + renderHost.scrollLeft;
    const clickY = event.clientY - hostRect.top + renderHost.scrollTop;
    const clickedAnchor = state.playbackBarAnchors.find((anchor) => {
      const isInsideY = clickY >= anchor.y - 4 && clickY <= anchor.y + Math.max(anchor.height, 28) + 4;
      const isInsideX = clickX >= anchor.startX && clickX <= anchor.endX;
      return isInsideX && isInsideY;
    });

    if (!clickedAnchor) {
      return;
    }

    const activeTrackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
    if (state.loopEnabled && (state.loopStartTick === null || state.loopEndTick === null)) {
      const loopRange = state.gpRenderer.getBarTickRange(clickedAnchor.barNumber);
      if (loopRange) {
        state.loopStartBar = clickedAnchor.barNumber;
        state.loopStartTick = loopRange.startTick;
        state.loopEndBar = clickedAnchor.barNumber;
        state.loopEndTick = loopRange.endTickExclusive ?? loopRange.startTick + 1;
        updateLoopHandlesVisual(state, rootElement);
        updateLoopControlsVisual(rootElement, state);
      }
    }
    const clickedSameBar =
      state.selectedNavigationBar === clickedAnchor.barNumber && state.selectedNavigationTrackIndex === activeTrackIndex;
    const regionWidth = Math.max(clickedAnchor.endX - clickedAnchor.startX, 1);
    const clickProgress = (clickX - clickedAnchor.startX) / regionWidth;
    const targetTick = clickedSameBar
      ? state.gpRenderer.resolveNearestTickInBar(clickedAnchor.barNumber, clickProgress)
      : state.gpRenderer.seekToBarStart(clickedAnchor.barNumber);
    if (targetTick === null && !clickedSameBar) {
      return;
    }
    if (clickedSameBar) {
      if (targetTick === null) {
        return;
      }
      if (state.selectedNavigationTick !== null && Math.abs(targetTick - state.selectedNavigationTick) < 1) {
        return;
      }
      const didSeek = state.gpRenderer.seekToTick(targetTick);
      if (!didSeek) {
        return;
      }
      applyNavigationSelection(state, rootElement, clickedAnchor.barNumber, targetTick, activeTrackIndex);
      haltPlaybackTransportAfterSeek(state, rootElement);
      return;
    }

    applyNavigationSelection(state, rootElement, clickedAnchor.barNumber, targetTick, activeTrackIndex);
    haltPlaybackTransportAfterSeek(state, rootElement);
  });
}

function setupArrangementBarNavigation(rootElement: HTMLElement, state: AppState): void {
  const rowsContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-rows]");
  if (!rowsContainer) {
    return;
  }

  rowsContainer.addEventListener("click", (event) => {
    if (!state.gpRenderer) {
      return;
    }
    const targetElement = event.target;
    if (!(targetElement instanceof HTMLElement)) {
      return;
    }

    const clickedBarCell = targetElement.closest<HTMLElement>("[data-arrangement-bar-index]");
    const clickedTrackRow = targetElement.closest<HTMLElement>("[data-arrangement-track-index]");
    if (!clickedBarCell || !clickedTrackRow) {
      return;
    }

    const clickedTrackIndex = Number(clickedTrackRow.dataset.arrangementTrackIndex);
    const clickedBarIndex = Number(clickedBarCell.dataset.arrangementBarIndex);
    if (!Number.isFinite(clickedTrackIndex) || !Number.isFinite(clickedBarIndex)) {
      return;
    }

    const targetBarNumber = clickedBarIndex + 1;
    if (state.loopEnabled && (state.loopStartTick === null || state.loopEndTick === null)) {
      const loopRange = state.gpRenderer.getBarTickRange(targetBarNumber);
      if (loopRange) {
        state.loopStartBar = targetBarNumber;
        state.loopStartTick = loopRange.startTick;
        state.loopEndBar = targetBarNumber;
        state.loopEndTick = loopRange.endTickExclusive ?? loopRange.startTick + 1;
        updateLoopHandlesVisual(state, rootElement);
        updateLoopControlsVisual(rootElement, state);
      }
    }
    const confirmedTrackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
    if (clickedTrackIndex === confirmedTrackIndex) {
      state.pendingOverviewNavigationBar = null;
      state.pendingOverviewNavigationTrackIndex = null;
      state.pendingOverviewNavigationTick = null;
      seekToBarAndApplyNavigationSelection(state, rootElement, clickedTrackIndex, targetBarNumber);
      return;
    }

    const targetTick = state.gpRenderer.getBarTickRange(targetBarNumber)?.startTick ?? null;
    if (targetTick === null) {
      return;
    }

    state.pendingOverviewNavigationBar = targetBarNumber;
    state.pendingOverviewNavigationTrackIndex = clickedTrackIndex;
    state.pendingOverviewNavigationTick = targetTick;
    clearNavigationSelectionState(state, rootElement);
    state.manualNavigationVisualOverrideActive = true;
    haltPlaybackTransportAfterSeek(state, rootElement);
    state.requestedTrackIndex = clickedTrackIndex;
    state.gpRenderer.selectTrack(clickedTrackIndex, targetTick);
  });
}

export function startApp(rootElement: HTMLElement): void {
  const state: AppState = {
    currentView: "home",
    currentProject: null,
    projectStatusMessage: null,
    gpTracks: [],
    selectedTrackIndex: 0,
    requestedTrackIndex: null,
    lastClickedTrackIndex: null,
    clickCounter: 0,
    lastClickTimestampIso: null,
    selectionFired: false,
    gpRenderer: null,
    gpRenderDebugInfo: null,
    scoreTitle: null,
    totalBars: null,
    tempoBpm: null,
    playbackSpeedPercent: DEFAULT_PLAYBACK_SPEED_PERCENT,
    countInEnabled: false,
    countInInProgress: false,
    pendingCountInTimerId: null,
    metronomeEnabled: false,
    pendingMetronomeIntervalId: null,
    metronomeAudioContext: null,
    playbackPositionLabel: null,
    playbackCurrentBar: null,
    playbackCurrentTick: null,
    playbackCurrentBarStartTick: null,
    playbackCurrentBarEndTickExclusive: null,
    playbackIsPlaying: null,
    playbackTransportActive: false,
    playerPositionPayloadShape: null,
    playerStatePayloadShape: null,
    currentBarSourcePath: null,
    playbackFollowTargetFound: false,
    playbackFollowSource: null,
    lastPlaybackFollowRowIndex: null,
    playbackBarAnchorCount: 0,
    playbackBarAnchorSource: null,
    playbackAnchorStrategyAttempts: null,
    renderHostHasSvg: false,
    renderHostChildTags: null,
    renderHostTopTagClassCombos: null,
    renderHostElementCounts: null,
    playbackPlayheadVisible: false,
    lastPlaybackVisualBarNumber: null,
    playbackBarAnchors: [],
    selectedNavigationBar: null,
    selectedNavigationTick: null,
    selectedNavigationTrackIndex: null,
    selectionDivergenceSuppressTicks: 0,
    manualNavigationVisualOverrideActive: false,
    pendingOverviewNavigationBar: null,
    pendingOverviewNavigationTrackIndex: null,
    pendingOverviewNavigationTick: null,
    loopEnabled: false,
    loopStartBar: null,
    loopStartTick: null,
    loopEndBar: null,
    loopEndTick: null,
    loopDragHandle: null,
    desiredTrackSwitchTick: null,
    desiredTrackSwitchBar: null,
    desiredTrackSwitchSourceTrackIndex: null,
    playbackAnchorRebuildToken: 0,
    playbackAnchorRebuildScheduled: false,
    activeTrackName: null,
    scoreOverview: null,
    trackVolumeByIndex: {},
    trackBalanceByIndex: {},
    masterVolume: 80,
    masterBalance: 0,
    mutedTrackIndexes: [],
    soloTrackIndexes: [],
    bottomDockHeightPx: DEFAULT_BOTTOM_DOCK_HEIGHT_PX,
    tabZoomPercent: DEFAULT_TAB_ZOOM_PERCENT,
    latestAnchorStrategyDebug: [],
    latestPercussionAnchorDebug: null,
    latestAnchorDebugSnapshot: null,
  };

  const cleanupRenderer = (): void => {
    clearCountInTimer(state);
    state.countInInProgress = false;
    stopPlaybackMetronome(state);
    invalidatePlaybackBarAnchorRebuild(state);
    state.pendingOverviewNavigationBar = null;
    state.pendingOverviewNavigationTrackIndex = null;
    state.pendingOverviewNavigationTick = null;
    state.manualNavigationVisualOverrideActive = false;
    state.desiredTrackSwitchTick = null;
    state.desiredTrackSwitchBar = null;
    state.desiredTrackSwitchSourceTrackIndex = null;
    if (!state.gpRenderer) {
      return;
    }

    state.gpRenderer.destroy();
    state.gpRenderer = null;
  };

  const exportAnchorDebugSnapshot = async (): Promise<void> => {
    const trackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `songstep-anchor-debug-track-${trackIndex}-${timestamp}.json`;
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
      const snapshot = buildAnchorDebugSnapshot(state, rootElement);
      state.latestAnchorDebugSnapshot = snapshot;
      const debugDirectory = "C:\\Programs\\songStep\\debug";
      const fullPath = `${debugDirectory}\\${fileName}`;
      await mkdir(debugDirectory, { recursive: true });
      await writeTextFile(fullPath, JSON.stringify(snapshot, null, 2));
      state.projectStatusMessage = `Anchor debug exported to ${fullPath}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const snapshot = state.latestAnchorDebugSnapshot ?? buildAnchorDebugSnapshot(state, rootElement);
        triggerJsonDownload(fileName, snapshot);
        state.projectStatusMessage = `Anchor debug file-write failed (${message}). Browser fallback download started for ${fileName}.`;
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        state.projectStatusMessage = `Anchor debug export failed: ${message}. Fallback failed: ${fallbackMessage}`;
      }
    }
    render();
  };

  const render = (): void => {
    if (state.currentView !== "project") {
      cleanupRenderer();
    }

    if (state.currentView === "home") {
      renderHomeScreen(rootElement, {
        onNewProject: () => {
          state.currentView = "newProject";
          render();
        },
        onOpenProject: () => {
          state.currentView = "openProject";
          render();
        },
      });
      return;
    }

    if (state.currentView === "newProject") {
      renderNewProjectScreen(rootElement, {
        onBack: () => {
          state.currentView = "home";
          render();
        },
        onPickGpFile: () => pickGpSourceFile(),
        onCreateProject: async (payload: NewProjectSubmitPayload) => {
          const project = await createProjectFromSource(payload.sourceFile, payload.projectTitle);
          state.currentProject = project;
          state.currentView = "project";
          state.projectStatusMessage = "New project created. Loading GP tracks...";
          state.gpTracks = [];
          state.selectedTrackIndex = project.viewState.selectedTrackIndex;
          state.requestedTrackIndex = null;
          state.gpRenderDebugInfo = null;
          state.scoreTitle = null;
          state.totalBars = null;
          state.tempoBpm = null;
          state.playbackPositionLabel = null;
          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playbackCurrentBarStartTick = null;
          state.playbackCurrentBarEndTickExclusive = null;
          state.playbackIsPlaying = null;
          state.playbackTransportActive = false;
          state.playerPositionPayloadShape = null;
          state.playerStatePayloadShape = null;
          state.currentBarSourcePath = null;
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
          state.lastPlaybackFollowRowIndex = null;
          state.playbackPlayheadVisible = false;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          state.renderHostHasSvg = false;
          state.renderHostChildTags = null;
          state.renderHostTopTagClassCombos = null;
          state.renderHostElementCounts = null;
          state.playbackBarAnchors = [];
          state.activeTrackName = null;
          state.scoreOverview = null;
          state.trackVolumeByIndex = {};
          state.trackBalanceByIndex = {};
          state.masterVolume = 80;
          state.masterBalance = 0;
          state.mutedTrackIndexes = [];
          state.soloTrackIndexes = [];
          state.lastClickedTrackIndex = null;
          state.clickCounter = 0;
          state.lastClickTimestampIso = null;
          state.selectionFired = false;
          state.tabZoomPercent = DEFAULT_TAB_ZOOM_PERCENT;
          state.playbackSpeedPercent = DEFAULT_PLAYBACK_SPEED_PERCENT;
          state.countInEnabled = false;
          state.countInInProgress = false;
          state.pendingCountInTimerId = null;
          state.metronomeEnabled = false;
          stopPlaybackMetronome(state);
          render();
        },
      });
      return;
    }

    if (state.currentView === "openProject") {
      renderOpenProjectScreen(rootElement, {
        onBack: () => {
          state.currentView = "home";
          render();
        },
        onOpenProjectFile: async () => {
          try {
            const project = await pickAndLoadProjectFromDisk();
            if (!project) {
              return null;
            }

            state.currentProject = project;
            state.currentView = "project";
            state.projectStatusMessage = "Project opened. Loading GP tracks...";
            state.gpTracks = [];
            state.selectedTrackIndex = project.viewState.selectedTrackIndex;
            state.requestedTrackIndex = null;
            state.gpRenderDebugInfo = null;
            state.scoreTitle = null;
            state.totalBars = null;
            state.tempoBpm = null;
            state.playbackPositionLabel = null;
            state.playbackCurrentBar = null;
            state.playbackCurrentTick = null;
            state.playbackCurrentBarStartTick = null;
            state.playbackCurrentBarEndTickExclusive = null;
            state.playbackIsPlaying = null;
            state.playbackTransportActive = false;
            state.playerPositionPayloadShape = null;
            state.playerStatePayloadShape = null;
            state.currentBarSourcePath = null;
            state.playbackFollowTargetFound = false;
            state.playbackFollowSource = null;
            state.lastPlaybackFollowRowIndex = null;
            state.playbackBarAnchorCount = 0;
            state.playbackBarAnchorSource = null;
            state.playbackAnchorStrategyAttempts = null;
            state.renderHostHasSvg = false;
            state.renderHostChildTags = null;
            state.renderHostTopTagClassCombos = null;
            state.renderHostElementCounts = null;
            state.playbackPlayheadVisible = false;
            state.playbackBarAnchors = [];
            state.activeTrackName = null;
            state.scoreOverview = null;
            state.trackVolumeByIndex = {};
            state.trackBalanceByIndex = {};
            state.masterVolume = 80;
            state.masterBalance = 0;
            state.mutedTrackIndexes = [];
            state.soloTrackIndexes = [];
            state.lastClickedTrackIndex = null;
            state.clickCounter = 0;
            state.lastClickTimestampIso = null;
            state.selectionFired = false;
            state.tabZoomPercent = DEFAULT_TAB_ZOOM_PERCENT;
            state.playbackSpeedPercent = DEFAULT_PLAYBACK_SPEED_PERCENT;
            state.countInEnabled = false;
            state.countInInProgress = false;
            state.pendingCountInTimerId = null;
            state.metronomeEnabled = false;
            stopPlaybackMetronome(state);
            render();
            return project.sourceFile.fileName;
          } catch (error) {
            alert(error instanceof Error ? error.message : "Could not open project.");
            return null;
          }
        },
      });
      return;
    }

    if (state.currentView === "project" && state.currentProject) {
      cleanupRenderer();

      renderProjectScreen(rootElement, state.currentProject, {
        statusMessage: state.projectStatusMessage,
        tracks: state.gpTracks,
        selectedTrackIndex: state.selectedTrackIndex,
        requestedTrackIndex: state.requestedTrackIndex,
        lastClickedTrackIndex: state.lastClickedTrackIndex,
        clickCounter: state.clickCounter,
        lastClickTimestampIso: state.lastClickTimestampIso,
        selectionFired: state.selectionFired,
        confirmedActiveTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
        debugInfo: state.gpRenderDebugInfo,
        scoreTitle: state.scoreTitle,
        sourceFileName: state.currentProject.sourceFile.fileName,
        playbackPositionLabel: state.playbackPositionLabel,
        currentBar: state.playbackCurrentBar,
        currentTick: state.playbackCurrentTick,
        totalBars: state.totalBars,
        tempoBpm: state.tempoBpm,
        playbackSpeedPercent: state.playbackSpeedPercent,
        effectiveTempoBpm:
          state.tempoBpm === null ? null : Number(((state.tempoBpm * state.playbackSpeedPercent) / 100).toFixed(1)),
        playbackIsPlaying: state.playbackIsPlaying,
        countInEnabled: state.countInEnabled,
        metronomeEnabled: state.metronomeEnabled,
        loopEnabled: state.loopEnabled,
        loopStartBar: state.loopStartBar,
        loopEndBar: state.loopEndBar,
        playerPositionPayloadShape: state.playerPositionPayloadShape,
        playerStatePayloadShape: state.playerStatePayloadShape,
        currentBarSourcePath: state.currentBarSourcePath,
        playbackFollowTargetFound: state.playbackFollowTargetFound,
        playbackFollowSource: state.playbackFollowSource,
        playbackBarAnchorCount: state.playbackBarAnchorCount,
        playbackBarAnchorSource: state.playbackBarAnchorSource,
        playbackAnchorStrategyAttempts: state.playbackAnchorStrategyAttempts,
        renderHostHasSvg: state.renderHostHasSvg,
        renderHostChildTags: state.renderHostChildTags,
        renderHostTopTagClassCombos: state.renderHostTopTagClassCombos,
        renderHostElementCounts: state.renderHostElementCounts,
        scoreOverview: state.scoreOverview,
        trackVolumeByIndex: state.trackVolumeByIndex,
        trackBalanceByIndex: state.trackBalanceByIndex,
        masterVolume: state.masterVolume,
        masterBalance: state.masterBalance,
        mutedTrackIndexes: state.mutedTrackIndexes,
        soloTrackIndexes: state.soloTrackIndexes,
        onTrackSelectionChange: (trackIndex: number) => {
          clearLoopState(state);
          const preservedTick = state.selectedNavigationTick ?? state.playbackCurrentTick ?? state.playbackCurrentBarStartTick;
          state.desiredTrackSwitchTick = preservedTick;
          state.desiredTrackSwitchBar = state.selectedNavigationBar ?? state.playbackCurrentBar;
          state.desiredTrackSwitchSourceTrackIndex = state.selectedTrackIndex;
          state.requestedTrackIndex = trackIndex;
          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playbackCurrentBarStartTick = null;
          state.playbackCurrentBarEndTickExclusive = null;
          state.playerPositionPayloadShape = null;
          state.playerStatePayloadShape = null;
          state.currentBarSourcePath = null;
          state.lastClickedTrackIndex = trackIndex;
          state.clickCounter += 1;
          state.lastClickTimestampIso = new Date().toISOString();
          state.selectionFired = true;
          state.pendingOverviewNavigationBar = null;
          state.pendingOverviewNavigationTrackIndex = null;
          state.pendingOverviewNavigationTick = null;
          clearNavigationSelectionState(state, rootElement);
          state.manualNavigationVisualOverrideActive = preservedTick !== null;

          updateDebugField(rootElement, "requested-track-index", String(trackIndex));
          updateDebugField(rootElement, "last-clicked-track-index", String(trackIndex));
          updateDebugField(rootElement, "click-counter", String(state.clickCounter));
          updateDebugField(rootElement, "last-click-timestamp", state.lastClickTimestampIso);
          updateDebugField(rootElement, "selection-fired", "yes");
          updateDebugField(rootElement, "player-position-payload-shape", "-");
          updateDebugField(rootElement, "player-state-payload-shape", "-");
          updateDebugField(rootElement, "current-bar-source-path", "-");
          updateDebugField(rootElement, "current-tick", "-");
          updateDebugField(rootElement, "playback-bar-anchor-count", "0");
          updateDebugField(rootElement, "playback-bar-anchor-source", "-");
          updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
          invalidatePlaybackBarAnchorRebuild(state);
          updatePlaybackFollowDiagnostics(rootElement, false, null);
          updateArrangementPlaybackHighlight(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
          state.gpRenderer?.selectTrack(trackIndex, preservedTick);
        },
        onBackToHome: () => {
          state.currentView = "home";
          render();
        },
        onSaveProject: async () => {
          if (!state.currentProject) {
            return;
          }

          const result = await saveProjectToDisk(state.currentProject);

          if (!result.saved) {
            state.projectStatusMessage = "Save cancelled.";
            render();
            return;
          }

          if (result.method === "system-dialog") {
            state.projectStatusMessage = `Project saved as ${result.fileName}.`;
          } else {
            state.projectStatusMessage =
              "Project exported with browser download fallback (system save dialog unavailable).";
          }

          render();
        },
        onSaveProjectAs: async () => {
          if (!state.currentProject) {
            return;
          }

          const result = await saveProjectAsToDisk(state.currentProject);
          if (!result.saved) {
            state.projectStatusMessage = "Save As cancelled.";
            render();
            return;
          }

          state.projectStatusMessage = `Project saved as ${result.fileName}.`;
          render();
        },
        onExportAnchorDebug: () => {
          void exportAnchorDebugSnapshot();
        },
        onToggleTrackMute: (trackIndex) => {
          const isMuted = state.mutedTrackIndexes.includes(trackIndex);
          state.mutedTrackIndexes = isMuted
            ? state.mutedTrackIndexes.filter((value) => value !== trackIndex)
            : [...state.mutedTrackIndexes, trackIndex];
          updateTrackToggleVisualState(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
        },
        onToggleTrackSolo: (trackIndex) => {
          const isSolo = state.soloTrackIndexes.includes(trackIndex);
          state.soloTrackIndexes = isSolo
            ? state.soloTrackIndexes.filter((value) => value !== trackIndex)
            : [...state.soloTrackIndexes, trackIndex];
          updateTrackToggleVisualState(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
        },
        onTrackVolumeChange: (trackIndex, volume) => {
          state.trackVolumeByIndex[trackIndex] = volume;
          updateTrackControlVisualState(state, rootElement);
        },
        onTrackBalanceChange: (trackIndex, balance) => {
          state.trackBalanceByIndex[trackIndex] = balance;
          updateTrackControlVisualState(state, rootElement);
        },
        onMasterVolumeChange: (volume) => {
          state.masterVolume = volume;
          updateTrackControlVisualState(state, rootElement);
        },
        onMasterBalanceChange: (balance) => {
          state.masterBalance = balance;
          updateTrackControlVisualState(state, rootElement);
        },
        onPlay: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }

          cancelCountIn(state, rootElement);
          const targetTick =
            state.loopEnabled && state.loopStartTick !== null
              ? state.loopStartTick
              : getActiveManualNavigationTarget(state)?.targetTick ?? null;
          const startPlaybackNow = (): void => {
            if (!state.gpRenderer) {
              return;
            }
            if (targetTick !== null) {
              state.gpRenderer.seekToTick(targetTick);
            }
            state.playbackTransportActive = true;
            clearNavigationSelectionState(state, rootElement);
            state.manualNavigationVisualOverrideActive = false;
            state.projectStatusMessage = null;
            updateProjectStatusBanner(rootElement, "");
            if (state.metronomeEnabled) {
              startPlaybackMetronome(state);
            } else {
              stopPlaybackMetronome(state);
            }
            state.gpRenderer.play();
          };

          if (!state.countInEnabled) {
            startPlaybackNow();
            return;
          }

          const beatsPerBar = 4;
          const beatDurationMs = Math.max(120, Math.round(60000 / resolveEffectiveTempoBpm(state)));
          let beatsRemaining = beatsPerBar;
          state.countInInProgress = true;
          state.playbackTransportActive = false;

          const runCountInBeat = (): void => {
            if (!state.countInInProgress) {
              return;
            }
            state.projectStatusMessage = `Count-in: ${beatsRemaining}`;
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            playMetronomeClick(state, beatsRemaining === beatsPerBar);
            if (beatsRemaining <= 1) {
              state.pendingCountInTimerId = window.setTimeout(() => {
                state.pendingCountInTimerId = null;
                state.countInInProgress = false;
                startPlaybackNow();
              }, beatDurationMs);
              return;
            }
            beatsRemaining -= 1;
            state.pendingCountInTimerId = window.setTimeout(runCountInBeat, beatDurationMs);
          };

          runCountInBeat();
        },
        onPause: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }

          cancelCountIn(state, rootElement);
          state.playbackTransportActive = false;
          stopPlaybackMetronome(state);
          state.gpRenderer.pause();
        },
        onStop: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }

          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playbackCurrentBarStartTick = null;
          state.playbackCurrentBarEndTickExclusive = null;
          cancelCountIn(state, rootElement);
          stopPlaybackMetronome(state);
          state.playbackTransportActive = false;
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
          state.lastPlaybackFollowRowIndex = null;
          state.playbackPlayheadVisible = false;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          state.manualNavigationVisualOverrideActive = false;
          invalidatePlaybackBarAnchorRebuild(state);
          updatePlaybackFollowDiagnostics(rootElement, false, null);
          updateDebugField(rootElement, "playback-bar-anchor-count", "0");
          updateDebugField(rootElement, "playback-bar-anchor-source", "-");
          updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
          updateArrangementPlaybackHighlight(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
          state.gpRenderer.stop();
        },
        onToggleLoop: () => {
          if (state.loopEnabled) {
            clearLoopState(state);
            state.projectStatusMessage = "Loop mode disabled.";
          } else {
            state.loopEnabled = true;
            state.projectStatusMessage = "Loop mode enabled. Click a bar to create loop region.";
          }
          updateLoopControlsVisual(rootElement, state);
          updateLoopHandlesVisual(state, rootElement);
          updateProjectStatusBanner(rootElement, state.projectStatusMessage);
        },
        onToggleCountIn: () => {
          state.countInEnabled = !state.countInEnabled;
          updateCountInToggleVisual(state, rootElement);
        },
        onToggleMetronome: () => {
          state.metronomeEnabled = !state.metronomeEnabled;
          if (state.metronomeEnabled && state.playbackTransportActive && !state.countInInProgress) {
            startPlaybackMetronome(state);
          }
          if (!state.metronomeEnabled) {
            stopPlaybackMetronome(state);
          }
          updateMetronomeToggleVisual(state, rootElement);
        },
        onDecreasePlaybackSpeed: () => {
          state.playbackSpeedPercent = clampPlaybackSpeedPercent(
            state.playbackSpeedPercent - PLAYBACK_SPEED_BUTTON_STEP_PERCENT,
          );
          state.gpRenderer?.setPlaybackSpeedPercent(state.playbackSpeedPercent);
          updatePlaybackSpeedVisual(state, rootElement);
          if (state.metronomeEnabled && state.playbackTransportActive && !state.countInInProgress) {
            startPlaybackMetronome(state);
          }
        },
        onIncreasePlaybackSpeed: () => {
          state.playbackSpeedPercent = clampPlaybackSpeedPercent(
            state.playbackSpeedPercent + PLAYBACK_SPEED_BUTTON_STEP_PERCENT,
          );
          state.gpRenderer?.setPlaybackSpeedPercent(state.playbackSpeedPercent);
          updatePlaybackSpeedVisual(state, rootElement);
          if (state.metronomeEnabled && state.playbackTransportActive && !state.countInInProgress) {
            startPlaybackMetronome(state);
          }
        },
        onSetPlaybackSpeedPercent: (speedPercent: number) => {
          state.playbackSpeedPercent = clampPlaybackSpeedPercent(speedPercent);
          state.gpRenderer?.setPlaybackSpeedPercent(state.playbackSpeedPercent);
          updatePlaybackSpeedVisual(state, rootElement);
          if (state.metronomeEnabled && state.playbackTransportActive && !state.countInInProgress) {
            startPlaybackMetronome(state);
          }
        },
        onResetPlaybackSpeed: () => {
          state.playbackSpeedPercent = DEFAULT_PLAYBACK_SPEED_PERCENT;
          state.gpRenderer?.setPlaybackSpeedPercent(state.playbackSpeedPercent);
          updatePlaybackSpeedVisual(state, rootElement);
          if (state.metronomeEnabled && state.playbackTransportActive && !state.countInInProgress) {
            startPlaybackMetronome(state);
          }
        },
      });
      setupBottomDockResize(rootElement, state);
      setupBottomDockHorizontalSync(rootElement);
      setupTabViewportZoomWheel(rootElement, state);
      setupNotationBarNavigation(rootElement, state);
      setupArrangementBarNavigation(rootElement, state);
      setupLoopHandleDrag(rootElement, state);

      const gpRenderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
      if (!gpRenderHost) {
        state.projectStatusMessage = "GP render area is unavailable.";
        return;
      }

      updateArrangementOverview(state, rootElement);
      updateTrackControlVisualState(state, rootElement);
      updateTrackRowVisualState(state, rootElement);
      updateLoopControlsVisual(rootElement, state);
      updateLoopHandlesVisual(state, rootElement);
      updatePlaybackSpeedVisual(state, rootElement);
      updateCountInToggleVisual(state, rootElement);
      updateMetronomeToggleVisual(state, rootElement);

      const project = state.currentProject;
      createGpRenderer(gpRenderHost, project.sourceFile, state.selectedTrackIndex, {
        onTracksLoaded: (tracks) => {
          const trackListChanged = !isSameTrackList(state.gpTracks, tracks);
          if (!trackListChanged) {
            return;
          }

          state.gpTracks = tracks;
          const hasSelectedTrack = tracks.some((track) => track.index === state.selectedTrackIndex);
          if (!hasSelectedTrack) {
            state.selectedTrackIndex = tracks[0]?.index ?? 0;
          }

          if (state.currentProject) {
            state.currentProject.viewState.selectedTrackIndex = state.selectedTrackIndex;
          }

          state.projectStatusMessage = `Loaded ${tracks.length} track${tracks.length === 1 ? "" : "s"}.`;
          render();
        },
        onDebugInfo: (debugInfo) => {
          state.gpRenderDebugInfo = debugInfo;
          state.activeTrackName = debugInfo.confirmedActiveTrackName ?? null;
          updateProjectDebugInfoPanel(rootElement, debugInfo);
          updatePlayerRuntimeFields(state, rootElement);
          updateDebugField(rootElement, "requested-track-index", String(state.requestedTrackIndex ?? "-"));
          updateDebugField(rootElement, "last-clicked-track-index", String(state.lastClickedTrackIndex ?? "-"));
          updateDebugField(rootElement, "click-counter", String(state.clickCounter));
          updateDebugField(rootElement, "last-click-timestamp", state.lastClickTimestampIso ?? "-");
          updateDebugField(rootElement, "selection-fired", state.selectionFired ? "yes" : "no");
          updateTrackStripActive(rootElement, debugInfo.confirmedActiveTrackIndex);
          if (debugInfo.lastRendererErrorStage === "renderFinished") {
            schedulePlaybackBarAnchorRebuild(state, rootElement);
          }
        },
        onTrackRenderCommitted: (trackIndex) => {
          tryCompletePendingOverviewNavigationAfterRender(state, rootElement, trackIndex);
          nudgeRenderedSectionLabels(rootElement, state);
          updateLoopHandlesVisual(state, rootElement);
        },
        onProgrammaticSeekConfirmed: (trackIndex, tick) => {
          if (
            state.pendingOverviewNavigationBar !== null &&
            state.pendingOverviewNavigationTrackIndex === trackIndex &&
            state.pendingOverviewNavigationTick !== null &&
            state.pendingOverviewNavigationTick === tick
          ) {
            applyNavigationSelection(
              state,
              rootElement,
              state.pendingOverviewNavigationBar,
              state.pendingOverviewNavigationTick,
              trackIndex,
            );
            state.pendingOverviewNavigationBar = null;
            state.pendingOverviewNavigationTrackIndex = null;
            state.pendingOverviewNavigationTick = null;
            return;
          }

          if (
            state.pendingOverviewNavigationBar !== null ||
            state.pendingOverviewNavigationTrackIndex !== null ||
            state.desiredTrackSwitchTick === null ||
            trackIndex !== state.selectedTrackIndex ||
            tick !== state.desiredTrackSwitchTick
          ) {
            return;
          }

          applyNavigationSelection(
            state,
            rootElement,
            state.desiredTrackSwitchBar ?? (state.playbackCurrentBar ?? 1),
            state.desiredTrackSwitchTick,
            trackIndex,
          );
          state.desiredTrackSwitchTick = null;
          state.desiredTrackSwitchBar = null;
          state.desiredTrackSwitchSourceTrackIndex = null;
        },
        onScoreRuntimeInfo: (info) => {
          state.scoreTitle = info.scoreTitle;
          state.totalBars = info.totalBars;
          state.tempoBpm = info.tempoBpm;
          updatePlayerRuntimeFields(state, rootElement);
        },
        onScoreOverviewRuntimeInfo: (info) => {
          state.scoreOverview = info;
          info.trackRows.forEach((row) => {
            if (state.trackVolumeByIndex[row.trackIndex] === undefined) {
              state.trackVolumeByIndex[row.trackIndex] = 80;
            }
            if (state.trackBalanceByIndex[row.trackIndex] === undefined) {
              state.trackBalanceByIndex[row.trackIndex] = 0;
            }
          });
          updateArrangementOverview(state, rootElement);
          nudgeRenderedSectionLabels(rootElement, state);
          updateLoopHandlesVisual(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
          updateTrackRowVisualState(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
        },
        onPlaybackRuntimeInfo: (info) => {
          state.playbackIsPlaying = info.isPlaying;
          if (info.isPlaying === false) {
            state.playbackTransportActive = false;
            stopPlaybackMetronome(state);
          }
          state.playbackPositionLabel = info.positionLabel;
          state.playbackCurrentBar = info.currentBar;
          state.playbackCurrentTick = info.currentTick;
          state.playbackCurrentBarStartTick = info.currentBarStartTick;
          state.playbackCurrentBarEndTickExclusive = info.currentBarEndTickExclusive;
          state.playerPositionPayloadShape = info.playerPositionPayloadShape;
          state.playerStatePayloadShape = info.playerStatePayloadShape;
          state.currentBarSourcePath = info.currentBarSourcePath;
          if (
            state.loopEnabled &&
            state.loopStartTick !== null &&
            state.loopEndTick !== null &&
            state.loopStartTick < state.loopEndTick &&
            info.currentTick !== null &&
            info.currentTick >= state.loopEndTick &&
            state.gpRenderer
          ) {
            const loopSeekSucceeded = state.gpRenderer.seekToTick(state.loopStartTick);
            if (!loopSeekSucceeded) {
              state.projectStatusMessage = "Loop seek failed. Loop disabled.";
              clearLoopState(state);
              updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            } else {
              state.playbackCurrentTick = state.loopStartTick;
              state.playbackCurrentBar = state.loopStartBar;
              const loopStartRange = state.loopStartBar === null ? null : state.gpRenderer.getBarTickRange(state.loopStartBar);
              state.playbackCurrentBarStartTick = loopStartRange?.startTick ?? state.loopStartTick;
              state.playbackCurrentBarEndTickExclusive = loopStartRange?.endTickExclusive ?? null;
            }
          }
          if (info.isPlaying === true && info.currentTick !== null) {
            state.manualNavigationVisualOverrideActive = false;
          }
          if (
            info.isPlaying === true &&
            state.selectedNavigationBar !== null &&
            state.selectedNavigationTrackIndex !== null
          ) {
            clearNavigationSelectionState(state, rootElement);
          }
          if (
            state.selectedNavigationBar !== null &&
            state.selectedNavigationTrackIndex !== null &&
            state.selectedNavigationTick !== null
          ) {
            const activeTrackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
            const sameTrack = state.selectedNavigationTrackIndex === activeTrackIndex;
            const sameBar = info.currentBar !== null && info.currentBar === state.selectedNavigationBar;
            const closeTick = info.currentTick !== null && Math.abs(info.currentTick - state.selectedNavigationTick) <= 1;
            if (sameTrack && sameBar && closeTick) {
              state.selectionDivergenceSuppressTicks = 0;
            } else if (state.selectionDivergenceSuppressTicks > 0) {
              state.selectionDivergenceSuppressTicks -= 1;
            } else if (info.isPlaying === true) {
              clearNavigationSelectionState(state, rootElement);
            }
          }
          updatePlayerRuntimeFields(state, rootElement);
          updateDebugField(
            rootElement,
            "player-position-payload-shape",
            state.playerPositionPayloadShape && state.playerPositionPayloadShape.length > 0
              ? state.playerPositionPayloadShape
              : "-",
          );
          updateDebugField(
            rootElement,
            "player-state-payload-shape",
            state.playerStatePayloadShape && state.playerStatePayloadShape.length > 0
              ? state.playerStatePayloadShape
              : "-",
          );
          updateDebugField(
            rootElement,
            "current-bar-source-path",
            state.currentBarSourcePath && state.currentBarSourcePath.length > 0 ? state.currentBarSourcePath : "-",
          );
          updateDebugField(rootElement, "current-tick", state.playbackCurrentTick === null ? "-" : String(state.playbackCurrentTick));
          updateArrangementPlaybackHighlight(state, rootElement);
          updatePlaybackPlayheadFromRuntime(state, rootElement);
          updateNavigationSelectionVisual(state, rootElement);
          updatePlaybackFollowInRenderHost(state, rootElement);
          updateLoopHandlesVisual(state, rootElement);
        },
        onRuntimeNotice: (message) => {
          state.projectStatusMessage = message;
          clearLoopState(state);
          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playbackCurrentBarStartTick = null;
          state.playbackCurrentBarEndTickExclusive = null;
          state.playbackTransportActive = false;
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
          state.lastPlaybackFollowRowIndex = null;
          state.playbackPlayheadVisible = false;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          state.pendingOverviewNavigationBar = null;
          state.pendingOverviewNavigationTrackIndex = null;
          state.pendingOverviewNavigationTick = null;
          state.manualNavigationVisualOverrideActive = false;
          invalidatePlaybackBarAnchorRebuild(state);
          updateProjectStatusBanner(rootElement, message);
          updateDebugField(rootElement, "current-tick", "-");
          updateDebugField(rootElement, "playback-bar-anchor-count", "0");
          updateDebugField(rootElement, "playback-bar-anchor-source", "-");
          updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
          updatePlaybackFollowDiagnostics(rootElement, false, null);
          updateArrangementPlaybackHighlight(state, rootElement);
          clearNavigationSelectionState(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
        },
        onActiveTrackConfirmed: (trackIndex) => {
          const isPendingOverviewTrackSwitch =
            state.pendingOverviewNavigationBar !== null &&
            state.pendingOverviewNavigationTrackIndex === trackIndex &&
            state.pendingOverviewNavigationTick !== null;

          const previousSelectedTrackIndex = state.selectedTrackIndex;
          state.selectedTrackIndex = trackIndex;
          if (previousSelectedTrackIndex !== trackIndex) {
            clearLoopState(state);
            updateLoopControlsVisual(rootElement, state);
            updateLoopHandlesVisual(state, rootElement);
          }
          if (isPendingOverviewTrackSwitch) {
            const pendingBarNumber = state.pendingOverviewNavigationBar as number;
            state.playbackCurrentBar = pendingBarNumber;
            state.playbackCurrentTick = state.pendingOverviewNavigationTick;
            const targetBarRange = state.gpRenderer?.getBarTickRange(pendingBarNumber) ?? null;
            state.playbackCurrentBarStartTick = targetBarRange?.startTick ?? state.pendingOverviewNavigationTick;
            state.playbackCurrentBarEndTickExclusive = targetBarRange?.endTickExclusive ?? null;
          } else {
            state.playbackCurrentBar = null;
            state.playbackCurrentTick = null;
            state.playbackCurrentBarStartTick = null;
          state.playbackCurrentBarEndTickExclusive = null;
          state.playbackTransportActive = false;
          }
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
          state.lastPlaybackFollowRowIndex = null;
          state.playbackPlayheadVisible = false;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          invalidatePlaybackBarAnchorRebuild(state);
          state.currentBarSourcePath = null;
          state.requestedTrackIndex = null;
          state.selectionFired = false;
          if (!isPendingOverviewTrackSwitch) {
            clearNavigationSelectionState(state, rootElement);
          }
          if (state.currentProject) {
            state.currentProject.viewState.selectedTrackIndex = trackIndex;
          }
          state.activeTrackName = state.gpTracks.find((track) => track.index === trackIndex)?.name ?? state.activeTrackName;

          updateTrackStripActive(rootElement, trackIndex);
          updateDebugField(rootElement, "selected-track-index", String(trackIndex));
          updateDebugField(rootElement, "requested-track-index", "-");
          updateDebugField(rootElement, "selection-fired", "no");
          updateDebugField(rootElement, "current-bar-source-path", "-");
          updateDebugField(rootElement, "current-tick", "-");
          updateDebugField(rootElement, "playback-bar-anchor-count", "0");
          updateDebugField(rootElement, "playback-bar-anchor-source", "-");
          updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
          updatePlaybackFollowDiagnostics(rootElement, false, null);
          updateArrangementPlaybackHighlight(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
        },
        onRenderError: (message) => {
          state.projectStatusMessage = message;
          cancelCountIn(state, rootElement);
          stopPlaybackMetronome(state);
          clearLoopState(state);
          state.pendingOverviewNavigationBar = null;
          state.pendingOverviewNavigationTrackIndex = null;
          state.pendingOverviewNavigationTick = null;
          state.manualNavigationVisualOverrideActive = false;
          state.playbackTransportActive = false;
          state.desiredTrackSwitchTick = null;
          state.desiredTrackSwitchBar = null;
          state.desiredTrackSwitchSourceTrackIndex = null;
          invalidatePlaybackBarAnchorRebuild(state);
          hidePlaybackPlayhead(rootElement, state);
          render();
        },
      }, state.tabZoomPercent)
        .then((renderer) => {
          state.gpRenderer = renderer;
          state.gpRenderer.setPlaybackSpeedPercent(state.playbackSpeedPercent);
        })
        .catch((error: unknown) => {
          state.projectStatusMessage =
            error instanceof Error ? error.message : "Could not initialize GP renderer.";
          render();
        });
      return;
    }

    state.currentView = "home";
    render();
  };

  render();
}
