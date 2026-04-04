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
import { invoke } from "@tauri-apps/api/core";

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
const MIN_BOTTOM_DOCK_HEIGHT_PX = 28;
const MAX_BOTTOM_DOCK_HEIGHT_PX = 520;
const ARRANGEMENT_BAR_WIDTH_PX = 24;
const ARRANGEMENT_BAR_GAP_PX = 4;
const DEFAULT_TAB_ZOOM_PERCENT = 100;
const MOBILE_DEFAULT_TAB_ZOOM_PERCENT = 100;
const MOBILE_LAYOUT_BREAKPOINT_PX = 900;
const MIN_TAB_ZOOM_PERCENT = 60;
const MAX_TAB_ZOOM_PERCENT = 160;
const TAB_ZOOM_STEP_PERCENT = 10;
const MOBILE_ZOOM_PRESETS = [110, 100, 90, 80, 72, 65, 58, 52, 46] as const;
const SECTION_LABEL_VERTICAL_NUDGE_PX = 10;
const MIN_PLAYBACK_SPEED_PERCENT = 15;
const MAX_PLAYBACK_SPEED_PERCENT = 175;
const DEFAULT_PLAYBACK_SPEED_PERCENT = 100;
const PLAYBACK_SPEED_BUTTON_STEP_PERCENT = 5;
const COLLAPSED_DOCK_THRESHOLD_PX = 74;
const COLLAPSED_BOTTOM_DOCK_HEIGHT_PX = 44;

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
  masterVolume: number;
  mutedTrackIndexes: number[];
  soloTrackIndexes: number[];
  pendingPlaybackStart: {
    requestId: number;
    targetTrackIndex: number;
    targetTick: number;
    targetBar: number | null;
  } | null;
  nextPlaybackRequestId: number;
  bottomDockHeightPx: number;
  isBottomDockCollapsed: boolean;
  tabZoomPercent: number;
  latestAnchorStrategyDebug: Record<string, unknown>[];
  latestPercussionAnchorDebug: Record<string, unknown> | null;
  latestAnchorDebugSnapshot: Record<string, unknown> | null;
  sessionDebugLogger: SessionDebugLogger | null;
  sessionDebugLogPath: string | null;
  sessionDebugBannerShown: boolean;
  rendererScoreLoaded: boolean;
  rendererRenderFinished: boolean;
  rendererPlayerReady: boolean;
  rendererFallbackReady: boolean;
  trackSwitchInProgress: boolean;
  projectRendererCreateInFlight: boolean;
  projectRendererCreateKey: string | null;
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

interface SessionDebugLogger {
  filePath: string;
}

let reportSessionDebugAppendFailure: ((message: string) => void) | null = null;

async function createSessionDebugLogger(): Promise<SessionDebugLogger> {
  const filePath = await invoke<string>("get_session_debug_log_path");
  return {
    filePath,
  };
}

function appendSessionDebugEvent(logger: SessionDebugLogger | null, event: Record<string, unknown>): void {
  if (!logger) {
    return;
  }
  const eventJson = JSON.stringify(event);
  void invoke("append_session_debug_event", { eventJson }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("append_session_debug_event failed", error);
    reportSessionDebugAppendFailure?.(message);
  });
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

function applyMixerStateToRenderer(state: AppState): void {
  if (!state.gpRenderer) {
    return;
  }
  state.gpRenderer.applyMixerState({
    mutedTrackIndexes: state.mutedTrackIndexes,
    soloTrackIndexes: state.soloTrackIndexes,
    trackVolumeByIndex: state.trackVolumeByIndex,
    masterVolume: state.masterVolume,
    trackBalanceByIndex: {},
    masterBalance: 0,
  });
}

function logPlaybackPipeline(eventType: string, payload: Record<string, unknown>): void {
  console.debug(
    "[songStep] playback-pipeline",
    JSON.stringify({
      eventType,
      timestamp: new Date().toISOString(),
      ...payload,
    }),
  );
}

function tracePlayback(eventName: string, payload: Record<string, unknown>): void {
  console.info(`[songstep-playback] ${eventName} ${JSON.stringify(payload)}`);
}

function traceTrackSwitch(eventName: string, payload: Record<string, unknown>): void {
  console.info(`[songstep-track] ${eventName} ${JSON.stringify(payload)}`);
}

function traceRendererLifecycle(eventName: string, payload: Record<string, unknown>): void {
  console.info(`[songstep-renderer] ${eventName} ${JSON.stringify(payload)}`);
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

function resolveInitialTabZoomPercent(): number {
  if (typeof window === "undefined") {
    return DEFAULT_TAB_ZOOM_PERCENT;
  }
  const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0);
  if (viewportWidth > 0 && viewportWidth <= MOBILE_LAYOUT_BREAKPOINT_PX) {
    return MOBILE_DEFAULT_TAB_ZOOM_PERCENT;
  }
  return DEFAULT_TAB_ZOOM_PERCENT;
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const viewportWidth = Math.max(window.innerWidth || 0, document.documentElement?.clientWidth || 0);
  return viewportWidth > 0 && viewportWidth <= MOBILE_LAYOUT_BREAKPOINT_PX;
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
    window.clearTimeout(state.pendingMetronomeIntervalId);
    state.pendingMetronomeIntervalId = null;
  }
}

function startPlaybackMetronome(state: AppState): void {
  stopPlaybackMetronome(state);
  const beatDurationMs = Math.max(120, Math.round(60000 / resolveEffectiveTempoBpm(state)));
  const beatsPerBar = 4;
  const currentTick = state.playbackCurrentTick;
  const currentBarStartTick = state.playbackCurrentBarStartTick;
  const currentBarEndTickExclusive = state.playbackCurrentBarEndTickExclusive;
  const barTickSpan =
    currentBarStartTick === null || currentBarEndTickExclusive === null ? null : currentBarEndTickExclusive - currentBarStartTick;

  let initialBeatInBar = 0;
  let initialDelayMs = 0;

  if (
    currentTick !== null &&
    currentBarStartTick !== null &&
    barTickSpan !== null &&
    barTickSpan > 0 &&
    Number.isFinite(barTickSpan)
  ) {
    const ticksPerBeat = barTickSpan / beatsPerBar;
    if (ticksPerBeat > 0 && Number.isFinite(ticksPerBeat)) {
      const tickOffsetInBar = Math.min(Math.max(currentTick - currentBarStartTick, 0), Math.max(barTickSpan - 1, 0));
      const beatProgress = tickOffsetInBar / ticksPerBeat;
      const nearestBoundary = Math.round(beatProgress);
      const boundaryEpsilonBeats = 0.02;
      const isOnBoundary = Math.abs(beatProgress - nearestBoundary) <= boundaryEpsilonBeats;
      if (isOnBoundary) {
        const normalizedBeat = ((nearestBoundary % beatsPerBar) + beatsPerBar) % beatsPerBar;
        initialBeatInBar = normalizedBeat;
        initialDelayMs = 0;
      } else {
        const nextBeatOrdinal = Math.floor(beatProgress) + 1;
        const beatsUntilNextBoundary = Math.max(nextBeatOrdinal - beatProgress, 0);
        initialBeatInBar = ((nextBeatOrdinal % beatsPerBar) + beatsPerBar) % beatsPerBar;
        initialDelayMs = Math.max(0, Math.round(beatDurationMs * beatsUntilNextBoundary));
      }
    }
  }

  const scheduleBeat = (beatInBar: number, delayMs: number): void => {
    state.pendingMetronomeIntervalId = window.setTimeout(() => {
      if (!state.metronomeEnabled || !state.playbackTransportActive || state.countInInProgress) {
        state.pendingMetronomeIntervalId = null;
        return;
      }
      playMetronomeClick(state, beatInBar === 0);
      scheduleBeat((beatInBar + 1) % beatsPerBar, beatDurationMs);
    }, Math.max(0, delayMs));
  };

  scheduleBeat(initialBeatInBar, initialDelayMs);
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

function resetPlaybackVisualState(state: AppState, rootElement: HTMLElement): void {
  tracePlayback("resetPlaybackVisualState-enter", {
    playbackBarAnchorCount: state.playbackBarAnchorCount,
    playbackFollowTargetFound: state.playbackFollowTargetFound,
    playbackPlayheadVisible: state.playbackPlayheadVisible,
  });
  state.playbackFollowTargetFound = false;
  state.playbackFollowSource = null;
  state.lastPlaybackFollowRowIndex = null;
  state.playbackPlayheadVisible = false;
  state.playbackBarAnchorCount = 0;
  state.playbackBarAnchorSource = null;
  state.playbackAnchorStrategyAttempts = null;
  invalidatePlaybackBarAnchorRebuild(state);
  updatePlaybackFollowDiagnostics(rootElement, false, null);
  updateDebugField(rootElement, "playback-bar-anchor-count", "0");
  updateDebugField(rootElement, "playback-bar-anchor-source", "-");
  updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
  updateArrangementPlaybackHighlight(state, rootElement);
  hidePlaybackPlayhead(rootElement, state);
  tracePlayback("resetPlaybackVisualState-exit", {
    playbackBarAnchorCount: state.playbackBarAnchorCount,
    playbackFollowTargetFound: state.playbackFollowTargetFound,
    playbackPlayheadVisible: state.playbackPlayheadVisible,
  });
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

  const masterVolumeInput = rootElement.querySelector<HTMLInputElement>("[data-master-action='set-volume']");
  if (masterVolumeInput) {
    masterVolumeInput.value = String(state.masterVolume);
  }
  const masterVolumeValue = rootElement.querySelector<HTMLElement>("[data-master-volume-value='true']");
  if (masterVolumeValue) {
    masterVolumeValue.textContent = String(state.masterVolume);
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

function resolveRendererPlaybackBarAnchors(state: AppState): PlaybackBarAnchor[] {
  const rawBounds = state.gpRenderer?.getRenderedBarBounds() ?? [];
  if (rawBounds.length === 0) {
    state.playbackAnchorStrategyAttempts =
      "chosenSource=renderer:layout-tree-bars,rawBoundsCount=0,normalizedBars=0,rowCount=0,validation=fail,reason=noBounds";
    return [];
  }

  const totalBars = state.totalBars ?? 0;
  const normalized = rawBounds
    .filter((bound) => {
      const valid =
        Number.isFinite(bound.barNumber) &&
        Number.isFinite(bound.startX) &&
        Number.isFinite(bound.endX) &&
        Number.isFinite(bound.y) &&
        Number.isFinite(bound.height) &&
        Number.isFinite(bound.rowIndex) &&
        bound.barNumber > 0 &&
        bound.endX > bound.startX + 1 &&
        bound.height > 0;
      if (!valid) {
        return false;
      }
      if (totalBars > 0 && bound.barNumber > totalBars) {
        return false;
      }
      return true;
    })
    .map((bound) => ({
      barNumber: Math.round(bound.barNumber),
      startX: bound.startX,
      endX: bound.endX,
      y: bound.y,
      height: bound.height,
      rowIndex: Math.max(0, Math.round(bound.rowIndex)),
    }))
    .sort((left, right) => left.barNumber - right.barNumber);

  const dedupedByBar = new Map<number, PlaybackBarAnchor>();
  normalized.forEach((item) => {
    const existing = dedupedByBar.get(item.barNumber);
    if (!existing) {
      dedupedByBar.set(item.barNumber, item);
      return;
    }

    const mergedTop = Math.min(existing.y, item.y);
    const mergedBottom = Math.max(existing.y + existing.height, item.y + item.height);
    dedupedByBar.set(item.barNumber, {
      barNumber: item.barNumber,
      startX: Math.min(existing.startX, item.startX),
      endX: Math.max(existing.endX, item.endX),
      y: mergedTop,
      height: Math.max(mergedBottom - mergedTop, 12),
      rowIndex: Math.min(existing.rowIndex, item.rowIndex),
    });
  });

  const byBarOrder = Array.from(dedupedByBar.values()).sort((left, right) => left.barNumber - right.barNumber);
  const normalizedContiguous = byBarOrder.every((anchor, index) => anchor.barNumber === index + 1);
  const normalizedMatchesTotal = totalBars > 0 ? byBarOrder.length === totalBars : true;
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
  const validationPass = normalizedContiguous && normalizedMatchesTotal && rowMonotonic && sameRowNonOverlap && positiveWidths;
  const rowCount = new Set(byBarOrder.map((anchor) => anchor.rowIndex)).size;

  state.playbackAnchorStrategyAttempts = `chosenSource=renderer:layout-tree-bars,rawBoundsCount=${rawBounds.length},normalizedBars=${byBarOrder.length},rowCount=${rowCount},validation=${validationPass ? "pass" : "fail"}`;

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

  const strategyAttempts: string[] = [];
  const strategyDebugResults: Record<string, unknown>[] = [];
  state.latestPercussionAnchorDebug = null;
  const logAnchorRebuildOutcome = (outcome: string): void => {
    const rowCount = new Set(state.playbackBarAnchors.map((anchor) => anchor.rowIndex)).size;
    appendSessionDebugEvent(state.sessionDebugLogger, {
      type: "anchor-rebuild",
      timestamp: new Date().toISOString(),
      outcome,
      selectedTrackIndex: state.selectedTrackIndex,
      confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
      confirmedTrackName: state.gpRenderDebugInfo?.confirmedActiveTrackName ?? null,
      isPercussion: state.gpRenderDebugInfo?.isPercussion ?? null,
      effectiveStaveProfile: state.gpRenderDebugInfo?.effectiveStaveProfile ?? null,
      playbackBarAnchorSource: state.playbackBarAnchorSource,
      playbackBarAnchorCount: state.playbackBarAnchorCount,
      playbackAnchorStrategyAttempts: state.playbackAnchorStrategyAttempts,
      finalAnchorsSummary: {
        count: state.playbackBarAnchors.length,
        firstBar: state.playbackBarAnchors[0]?.barNumber ?? null,
        lastBar: state.playbackBarAnchors[state.playbackBarAnchors.length - 1]?.barNumber ?? null,
        rowCount,
        first20: state.playbackBarAnchors.slice(0, 20),
        last20: state.playbackBarAnchors.slice(Math.max(state.playbackBarAnchors.length - 20, 0)),
      },
      strategyDebug: strategyDebugResults,
    });
  };
  const validateFinalAnchorsStrict = (anchors: PlaybackBarAnchor[]): string[] => {
    const errors: string[] = [];
    if (anchors.length === 0) {
      return ["empty"];
    }
    for (let index = 0; index < anchors.length; index += 1) {
      const anchor = anchors[index];
      if (!anchor) {
        continue;
      }
      const expectedBar = index + 1;
      if (anchor.barNumber !== expectedBar) {
        errors.push("barSequence");
        break;
      }
      const width = anchor.endX - anchor.startX;
      const validGeometry =
        Number.isFinite(anchor.startX) &&
        Number.isFinite(anchor.endX) &&
        Number.isFinite(anchor.y) &&
        Number.isFinite(anchor.height) &&
        anchor.rowIndex >= 0 &&
        width > 8 &&
        width <= 2400 &&
        anchor.height > 0;
      if (!validGeometry) {
        errors.push("invalidFinalGeometry");
        break;
      }
      const nextAnchor = anchors[index + 1];
      if (!nextAnchor) {
        continue;
      }
      if (nextAnchor.rowIndex < anchor.rowIndex) {
        errors.push("rowStartXBacktrack");
        break;
      }
      if (nextAnchor.rowIndex === anchor.rowIndex) {
        if (nextAnchor.startX <= anchor.startX + 1) {
          errors.push("sameRowOrderViolation");
          break;
        }
        if (anchor.endX > nextAnchor.startX + 2) {
          errors.push("rowOverlap");
          break;
        }
      }
    }
    return errors;
  };
  updateRenderHostDomDiagnostics(state, rootElement, renderHost);
  const rendererAnchors = resolveRendererPlaybackBarAnchors(state);
  if (rendererAnchors.length > 0) {
    const strictErrors = validateFinalAnchorsStrict(rendererAnchors);
    if (strictErrors.length === 0) {
      state.latestAnchorStrategyDebug = [
        {
          source: "renderer:layout-tree-bars",
          validation: "pass",
          rawElementCount: rendererAnchors.length,
          normalizedAnchors: rendererAnchors,
        },
      ];
      state.playbackBarAnchors = rendererAnchors;
      state.playbackBarAnchorCount = rendererAnchors.length;
      state.playbackBarAnchorSource = "renderer:layout-tree-bars";
      updateDebugField(rootElement, "playback-bar-anchor-count", String(state.playbackBarAnchorCount));
      updateDebugField(rootElement, "playback-bar-anchor-source", state.playbackBarAnchorSource);
      updateDebugField(
        rootElement,
        "playback-anchor-strategy-attempts",
        state.playbackAnchorStrategyAttempts ??
          `chosenSource=renderer:layout-tree-bars,rawBoundsCount=${rendererAnchors.length}`,
      );
      logAnchorRebuildOutcome("renderer:layout-tree-bars success");
      return;
    }
    strategyAttempts.push(`renderer:layout-tree-bars rejected,reason=${strictErrors.join("+")}`);
  } else {
    strategyAttempts.push("renderer:layout-tree-bars empty");
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
  logAnchorRebuildOutcome("renderer:layout-tree-bars fail");
  return;

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

  const { canMoveLoopStartLeft, canMoveLoopStartRight, canMoveLoopEndLeft, canMoveLoopEndRight } =
    resolveLoopMoveAvailability(state);

  const setButtonDisabled = (selector: string, disabled: boolean): void => {
    const button = rootElement.querySelector<HTMLButtonElement>(selector);
    if (button) {
      button.disabled = disabled;
    }
  };
  setButtonDisabled("[data-action='move-loop-start-left']", !canMoveLoopStartLeft);
  setButtonDisabled("[data-action='move-loop-start-right']", !canMoveLoopStartRight);
  setButtonDisabled("[data-action='move-loop-end-left']", !canMoveLoopEndLeft);
  setButtonDisabled("[data-action='move-loop-end-right']", !canMoveLoopEndRight);
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
    const middleContentHeight = Math.max(middleScroll.scrollHeight, middleScroll.clientHeight, 0);
    const measuredContentHeight =
      resizeHandle.offsetHeight + headers.offsetHeight + topBand.offsetHeight + middleContentHeight + bottomBand.offsetHeight;
    return Math.min(MAX_BOTTOM_DOCK_HEIGHT_PX, Math.max(MIN_BOTTOM_DOCK_HEIGHT_PX, measuredContentHeight));
  };

  const applyDockHeight = (): void => {
    if (state.isBottomDockCollapsed) {
      layoutShell.style.setProperty("--player-dock-height", `${COLLAPSED_BOTTOM_DOCK_HEIGHT_PX}px`);
      layoutShell.classList.add("isDockCollapsed");
      return;
    }

    const dynamicMaxHeight = resolveDynamicDockMaxHeight();
    state.bottomDockHeightPx = Math.min(Math.max(state.bottomDockHeightPx, MIN_BOTTOM_DOCK_HEIGHT_PX), dynamicMaxHeight);
    layoutShell.style.setProperty("--player-dock-height", `${state.bottomDockHeightPx}px`);
    layoutShell.classList.remove("isDockCollapsed");
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
    if (state.isBottomDockCollapsed) {
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
  state.pendingPlaybackStart = null;
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

function resolveActiveTrackAllowedBarRange(state: AppState): { firstAllowedBar: number; lastAllowedBar: number } | null {
  const activeTrackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
  const activeTrackRow = state.scoreOverview?.trackRows.find((row) => row.trackIndex === activeTrackIndex) ?? null;
  const lastAllowedFromOverview = activeTrackRow?.barActivity.length ?? 0;
  const fallbackLastAllowed = state.totalBars ?? state.scoreOverview?.totalBars ?? 0;
  const lastAllowedBar = Math.max(lastAllowedFromOverview, fallbackLastAllowed);
  if (!Number.isFinite(lastAllowedBar) || lastAllowedBar <= 0) {
    return null;
  }
  return {
    firstAllowedBar: 1,
    lastAllowedBar,
  };
}

function resolveLoopMoveAvailability(state: AppState): {
  canMoveLoopStartLeft: boolean;
  canMoveLoopStartRight: boolean;
  canMoveLoopEndLeft: boolean;
  canMoveLoopEndRight: boolean;
} {
  const allowedRange = resolveActiveTrackAllowedBarRange(state);
  const startBar = state.loopStartBar;
  const endBar = state.loopEndBar;
  if (!allowedRange || startBar === null || endBar === null) {
    return {
      canMoveLoopStartLeft: false,
      canMoveLoopStartRight: false,
      canMoveLoopEndLeft: false,
      canMoveLoopEndRight: false,
    };
  }

  return {
    canMoveLoopStartLeft: startBar > allowedRange.firstAllowedBar && startBar - 1 <= endBar,
    canMoveLoopStartRight: startBar < allowedRange.lastAllowedBar && startBar + 1 <= endBar,
    canMoveLoopEndLeft: endBar > allowedRange.firstAllowedBar && endBar - 1 >= startBar,
    canMoveLoopEndRight: endBar < allowedRange.lastAllowedBar && endBar + 1 >= startBar,
  };
}

function moveLoopBoundaryByBars(
  state: AppState,
  rootElement: HTMLElement,
  boundary: "start" | "end",
  delta: -1 | 1,
): boolean {
  if (!state.gpRenderer || state.loopStartBar === null || state.loopEndBar === null) {
    return false;
  }

  const allowedRange = resolveActiveTrackAllowedBarRange(state);
  if (!allowedRange) {
    return false;
  }

  if (boundary === "start") {
    const nextStart = Math.min(
      Math.max(state.loopStartBar + delta, allowedRange.firstAllowedBar),
      allowedRange.lastAllowedBar,
    );
    if (nextStart > state.loopEndBar) {
      return false;
    }
    const nextRange = state.gpRenderer.getBarTickRange(nextStart);
    if (!nextRange) {
      return false;
    }
    state.loopStartBar = nextStart;
    state.loopStartTick = nextRange.startTick;
  } else {
    const nextEnd = Math.min(
      Math.max(state.loopEndBar + delta, allowedRange.firstAllowedBar),
      allowedRange.lastAllowedBar,
    );
    if (nextEnd < state.loopStartBar) {
      return false;
    }
    const nextRange = state.gpRenderer.getBarTickRange(nextEnd);
    if (!nextRange) {
      return false;
    }
    state.loopEndBar = nextEnd;
    state.loopEndTick = nextRange.endTickExclusive ?? nextRange.startTick + 1;
  }

  updateLoopHandlesVisual(state, rootElement);
  updateLoopControlsVisual(rootElement, state);
  return true;
}

function getMobileZoomStepIndex(currentZoomPercent: number): number {
  const presetDistances = MOBILE_ZOOM_PRESETS.map((preset) => Math.abs(currentZoomPercent - preset));
  let bestIndex = 0;
  let bestDistance = presetDistances[0] ?? Number.POSITIVE_INFINITY;
  presetDistances.forEach((distance, index) => {
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
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
      const allowedRange = resolveActiveTrackAllowedBarRange(state);
      if (!allowedRange) {
        return;
      }
      if (
        nearestAnchor.barNumber < allowedRange.firstAllowedBar ||
        nearestAnchor.barNumber > allowedRange.lastAllowedBar
      ) {
        return;
      }
      if (state.loopEndBar !== null && nearestAnchor.barNumber > state.loopEndBar) {
        return;
      }
      const range = state.gpRenderer.getBarTickRange(nearestAnchor.barNumber);
      if (!range) {
        return;
      }
      state.loopStartBar = nearestAnchor.barNumber;
      state.loopStartTick = range.startTick;
    } else {
      const allowedRange = resolveActiveTrackAllowedBarRange(state);
      if (!allowedRange) {
        return;
      }
      if (
        nearestAnchor.barNumber < allowedRange.firstAllowedBar ||
        nearestAnchor.barNumber > allowedRange.lastAllowedBar
      ) {
        return;
      }
      if (state.loopStartBar !== null && nearestAnchor.barNumber < state.loopStartBar) {
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
      const allowedRange = resolveActiveTrackAllowedBarRange(state);
      const clickedBarInRange =
        allowedRange !== null &&
        clickedAnchor.barNumber >= allowedRange.firstAllowedBar &&
        clickedAnchor.barNumber <= allowedRange.lastAllowedBar;
      const loopRange = clickedBarInRange ? state.gpRenderer.getBarTickRange(clickedAnchor.barNumber) : null;
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
      const allowedRange = resolveActiveTrackAllowedBarRange(state);
      const clickedBarInRange =
        allowedRange !== null &&
        targetBarNumber >= allowedRange.firstAllowedBar &&
        targetBarNumber <= allowedRange.lastAllowedBar;
      const loopRange = clickedBarInRange ? state.gpRenderer.getBarTickRange(targetBarNumber) : null;
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
    masterVolume: 80,
    mutedTrackIndexes: [],
    soloTrackIndexes: [],
    pendingPlaybackStart: null,
    nextPlaybackRequestId: 0,
    bottomDockHeightPx: DEFAULT_BOTTOM_DOCK_HEIGHT_PX,
    isBottomDockCollapsed: false,
    tabZoomPercent: resolveInitialTabZoomPercent(),
    latestAnchorStrategyDebug: [],
    latestPercussionAnchorDebug: null,
    latestAnchorDebugSnapshot: null,
    sessionDebugLogger: null,
    sessionDebugLogPath: null,
    sessionDebugBannerShown: false,
    rendererScoreLoaded: false,
    rendererRenderFinished: false,
    rendererPlayerReady: false,
    rendererFallbackReady: false,
    trackSwitchInProgress: false,
    projectRendererCreateInFlight: false,
    projectRendererCreateKey: null,
  };

  const hardCancelPlaybackPipeline = (
    reason: "pause" | "stop" | "track-switch" | "renderer-cleanup",
    options?: { stopRenderer?: boolean; resetPosition?: boolean },
  ): void => {
    const beforeSnapshot = {
      pendingPlaybackStart: state.pendingPlaybackStart !== null,
      playbackTransportActive: state.playbackTransportActive,
      countInInProgress: state.countInInProgress,
      playbackIsPlaying: state.playbackIsPlaying,
      selectedTrackIndex: state.selectedTrackIndex,
    };
    tracePlayback("hard-cancel-enter", {
      reason,
      options: options ?? null,
      ...beforeSnapshot,
    });
    logPlaybackPipeline("play-cancelled", {
      reason,
      hadPendingPlaybackStart: state.pendingPlaybackStart !== null,
      playbackTransportActive: state.playbackTransportActive,
      countInInProgress: state.countInInProgress,
      playbackIsPlaying: state.playbackIsPlaying,
    });
    cancelCountIn(state, rootElement);
    if (state.pendingPlaybackStart) {
      logPlaybackPipeline("play-cancelled", {
        reason,
        requestId: state.pendingPlaybackStart.requestId,
      });
    }
    state.pendingPlaybackStart = null;
    state.playbackTransportActive = false;
    state.countInInProgress = false;
    stopPlaybackMetronome(state);
    state.manualNavigationVisualOverrideActive = false;
    resetPlaybackVisualState(state, rootElement);
    if (options?.resetPosition) {
      state.playbackCurrentBar = null;
      state.playbackCurrentTick = null;
      state.playbackCurrentBarStartTick = null;
      state.playbackCurrentBarEndTickExclusive = null;
    }
    if (options?.stopRenderer && state.gpRenderer) {
      state.gpRenderer.stop();
    }
    tracePlayback("hard-cancel-exit", {
      reason,
      options: options ?? null,
      pendingPlaybackStart: state.pendingPlaybackStart !== null,
      playbackTransportActive: state.playbackTransportActive,
      countInInProgress: state.countInInProgress,
      playbackIsPlaying: state.playbackIsPlaying,
      selectedTrackIndex: state.selectedTrackIndex,
    });
  };

  const cleanupRenderer = (): void => {
    traceRendererLifecycle("cleanupRenderer-enter", {
      currentView: state.currentView,
      hasRenderer: state.gpRenderer !== null,
      selectedTrackIndex: state.selectedTrackIndex,
    });
    hardCancelPlaybackPipeline("renderer-cleanup");
    state.pendingOverviewNavigationBar = null;
    state.pendingOverviewNavigationTrackIndex = null;
    state.pendingOverviewNavigationTick = null;
    state.desiredTrackSwitchTick = null;
    state.desiredTrackSwitchBar = null;
    state.desiredTrackSwitchSourceTrackIndex = null;
    state.trackSwitchInProgress = false;
    state.rendererScoreLoaded = false;
    state.rendererRenderFinished = false;
    state.rendererPlayerReady = false;
    state.rendererFallbackReady = false;
    state.projectRendererCreateInFlight = false;
    state.projectRendererCreateKey = null;
    if (!state.gpRenderer) {
      traceRendererLifecycle("cleanupRenderer-exit-noop", {
        reason: "no-renderer",
      });
      return;
    }

    traceRendererLifecycle("renderer-destroy-start", {
      selectedTrackIndex: state.selectedTrackIndex,
    });
    logPlaybackPipeline("renderer-destroy", {
      selectedTrackIndex: state.selectedTrackIndex,
    });
    state.gpRenderer.destroy();
    state.gpRenderer = null;
    traceRendererLifecycle("renderer-destroy-finish", {
      selectedTrackIndex: state.selectedTrackIndex,
    });
  };

  reportSessionDebugAppendFailure = (message: string): void => {
    state.projectStatusMessage = `Debug logger append failed: ${message}`;
  };

  void createSessionDebugLogger()
    .then((logger) => {
      state.sessionDebugLogger = logger;
      state.sessionDebugLogPath = logger.filePath;
      appendSessionDebugEvent(logger, {
        type: "app-start",
        timestamp: new Date().toISOString(),
      });
      appendSessionDebugEvent(logger, {
        type: "logger-smoke-test",
        timestamp: new Date().toISOString(),
      });
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      state.projectStatusMessage = `Debug logger init failed: ${message}`;
      console.error("Debug logger init failed", error);
    });

  window.addEventListener("error", (event) => {
    appendSessionDebugEvent(state.sessionDebugLogger, {
      type: "window-error",
      timestamp: new Date().toISOString(),
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    appendSessionDebugEvent(state.sessionDebugLogger, {
      type: "unhandled-rejection",
      timestamp: new Date().toISOString(),
      reason: String(event.reason),
    });
  });

  const exportAnchorDebugSnapshot = async (): Promise<void> => {
    const trackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `songstep-anchor-debug-track-${trackIndex}-${timestamp}.json`;
    appendSessionDebugEvent(state.sessionDebugLogger, {
      type: "anchor-export-invoked",
      timestamp: new Date().toISOString(),
      selectedTrackIndex: state.selectedTrackIndex,
      confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
      targetFileName: fileName,
    });
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
      appendSessionDebugEvent(state.sessionDebugLogger, {
        type: "anchor-export-success",
        timestamp: new Date().toISOString(),
        fullPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendSessionDebugEvent(state.sessionDebugLogger, {
        type: "anchor-export-failed",
        timestamp: new Date().toISOString(),
        error: message,
      });
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
    traceRendererLifecycle("render-enter", {
      currentView: state.currentView,
      hasRenderer: state.gpRenderer !== null,
      selectedTrackIndex: state.selectedTrackIndex,
    });
    if (state.currentView !== "project") {
      traceRendererLifecycle("render-cleanup-non-project", {
        currentView: state.currentView,
      });
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
          state.masterVolume = 80;
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
          state.pendingPlaybackStart = null;
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
            state.masterVolume = 80;
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
            state.pendingPlaybackStart = null;
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
      const projectCreateKey = `${state.currentProject.sourceFile.fileName}::${state.selectedTrackIndex}`;
      if (state.projectRendererCreateInFlight && state.projectRendererCreateKey === projectCreateKey) {
        traceRendererLifecycle("initial-render-in-flight-skip", {
          projectCreateKey,
        });
        return;
      }
      traceRendererLifecycle("project-render-path", {
        action: "cleanup-before-project-screen",
        selectedTrackIndex: state.selectedTrackIndex,
      });
      cleanupRenderer();
      if (state.sessionDebugLogPath && !state.sessionDebugBannerShown) {
        state.projectStatusMessage = `Debug logging active: ${state.sessionDebugLogPath}`;
        state.sessionDebugBannerShown = true;
      }

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
        masterVolume: state.masterVolume,
        mutedTrackIndexes: state.mutedTrackIndexes,
        soloTrackIndexes: state.soloTrackIndexes,
        canMoveLoopStartLeft: resolveLoopMoveAvailability(state).canMoveLoopStartLeft,
        canMoveLoopStartRight: resolveLoopMoveAvailability(state).canMoveLoopStartRight,
        canMoveLoopEndLeft: resolveLoopMoveAvailability(state).canMoveLoopEndLeft,
        canMoveLoopEndRight: resolveLoopMoveAvailability(state).canMoveLoopEndRight,
        canZoomIn: isMobileViewport()
          ? getMobileZoomStepIndex(state.tabZoomPercent) > 0
          : state.tabZoomPercent < MAX_TAB_ZOOM_PERCENT,
        canZoomOut: isMobileViewport()
          ? getMobileZoomStepIndex(state.tabZoomPercent) < MOBILE_ZOOM_PRESETS.length - 1
          : state.tabZoomPercent > MIN_TAB_ZOOM_PERCENT,
        isBottomDockCollapsed: state.isBottomDockCollapsed,
        onTrackSelectionChange: (trackIndex: number) => {
          traceTrackSwitch("onTrackSelectionChange-enter", {
            previousTrackIndex: state.selectedTrackIndex,
            nextTrackIndex: trackIndex,
            selectedNavigationTick: state.selectedNavigationTick,
            playbackCurrentTick: state.playbackCurrentTick,
            playbackCurrentBar: state.playbackCurrentBar,
            playbackTransportActive: state.playbackTransportActive,
            pendingPlaybackStart: state.pendingPlaybackStart !== null,
          });
          logPlaybackPipeline("track-switch-start", {
            fromTrackIndex: state.selectedTrackIndex,
            requestedTrackIndex: trackIndex,
            playbackTransportActive: state.playbackTransportActive,
            countInInProgress: state.countInInProgress,
            pendingPlaybackStart: state.pendingPlaybackStart !== null,
          });
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "track-select-requested",
            timestamp: new Date().toISOString(),
            requestedTrackIndex: trackIndex,
            previousSelectedTrackIndex: state.selectedTrackIndex,
            currentPlaybackBar: state.playbackCurrentBar,
          });
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
          state.trackSwitchInProgress = true;
          state.rendererRenderFinished = false;
          state.rendererPlayerReady = false;
          state.rendererFallbackReady = false;
          hardCancelPlaybackPipeline("track-switch", { resetPosition: true });
          traceTrackSwitch("onTrackSelectionChange-after-hard-cancel", {
            nextTrackIndex: trackIndex,
            playbackTransportActive: state.playbackTransportActive,
            pendingPlaybackStart: state.pendingPlaybackStart !== null,
          });
          logPlaybackPipeline("track-switch-after-hard-cancel", {
            requestedTrackIndex: trackIndex,
          });
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
          traceTrackSwitch("onTrackSelectionChange-selectTrack", {
            nextTrackIndex: trackIndex,
            preservedTick,
            preservedBar: state.desiredTrackSwitchBar,
          });
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
          state.gpRenderer?.setTrackMuted(trackIndex, !isMuted);
          applyMixerStateToRenderer(state);
          updateTrackToggleVisualState(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
        },
        onToggleTrackSolo: (trackIndex) => {
          const isSolo = state.soloTrackIndexes.includes(trackIndex);
          state.soloTrackIndexes = isSolo
            ? state.soloTrackIndexes.filter((value) => value !== trackIndex)
            : [...state.soloTrackIndexes, trackIndex];
          state.gpRenderer?.setTrackSoloed(trackIndex, !isSolo);
          applyMixerStateToRenderer(state);
          updateTrackToggleVisualState(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
        },
        onTrackVolumeChange: (trackIndex, volume) => {
          state.trackVolumeByIndex[trackIndex] = volume;
          state.gpRenderer?.setTrackVolume(trackIndex, volume);
          applyMixerStateToRenderer(state);
          updateTrackControlVisualState(state, rootElement);
        },
        onMasterVolumeChange: (volume) => {
          state.masterVolume = volume;
          state.gpRenderer?.setMasterVolume(volume);
          applyMixerStateToRenderer(state);
          updateTrackControlVisualState(state, rootElement);
        },
        onMoveLoopStartLeft: () => {
          moveLoopBoundaryByBars(state, rootElement, "start", -1);
        },
        onMoveLoopStartRight: () => {
          moveLoopBoundaryByBars(state, rootElement, "start", 1);
        },
        onMoveLoopEndLeft: () => {
          moveLoopBoundaryByBars(state, rootElement, "end", -1);
        },
        onMoveLoopEndRight: () => {
          moveLoopBoundaryByBars(state, rootElement, "end", 1);
        },
        onZoomIn: () => {
          const isMobile = isMobileViewport();
          const nextZoomPercent = isMobile
            ? MOBILE_ZOOM_PRESETS[Math.max(0, getMobileZoomStepIndex(state.tabZoomPercent) - 1)]
            : Math.min(MAX_TAB_ZOOM_PERCENT, state.tabZoomPercent + TAB_ZOOM_STEP_PERCENT);
          if (!nextZoomPercent || nextZoomPercent === state.tabZoomPercent) {
            return;
          }
          state.tabZoomPercent = nextZoomPercent;
          state.gpRenderer?.setZoom(nextZoomPercent);
          render();
        },
        onZoomOut: () => {
          const isMobile = isMobileViewport();
          const nextZoomPercent = isMobile
            ? MOBILE_ZOOM_PRESETS[Math.min(MOBILE_ZOOM_PRESETS.length - 1, getMobileZoomStepIndex(state.tabZoomPercent) + 1)]
            : Math.max(MIN_TAB_ZOOM_PERCENT, state.tabZoomPercent - TAB_ZOOM_STEP_PERCENT);
          if (!nextZoomPercent || nextZoomPercent === state.tabZoomPercent) {
            return;
          }
          state.tabZoomPercent = nextZoomPercent;
          state.gpRenderer?.setZoom(nextZoomPercent);
          render();
        },
        onCollapseBottomDock: () => {
          state.isBottomDockCollapsed = true;
          render();
        },
        onExpandBottomDock: () => {
          state.isBottomDockCollapsed = false;
          if (state.bottomDockHeightPx <= COLLAPSED_DOCK_THRESHOLD_PX) {
            state.bottomDockHeightPx = DEFAULT_BOTTOM_DOCK_HEIGHT_PX;
          }
          render();
        },
        onPlay: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }
          if (state.pendingPlaybackStart || state.countInInProgress || state.playbackTransportActive || state.playbackIsPlaying === true) {
            tracePlayback("onPlay-ignored-duplicate", {
              selectedTrackIndex: state.selectedTrackIndex,
              confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
              pendingPlaybackStart: state.pendingPlaybackStart !== null,
              countInInProgress: state.countInInProgress,
              playbackTransportActive: state.playbackTransportActive,
              playbackIsPlaying: state.playbackIsPlaying,
            });
            logPlaybackPipeline("play-ignored-duplicate", {
              pendingPlaybackStart: state.pendingPlaybackStart !== null,
              countInInProgress: state.countInInProgress,
              playbackTransportActive: state.playbackTransportActive,
              playbackIsPlaying: state.playbackIsPlaying,
            });
            return;
          }

          cancelCountIn(state, rootElement);
          const targetTick =
            state.loopEnabled && state.loopStartTick !== null
              ? state.loopStartTick
              : getActiveManualNavigationTarget(state)?.targetTick ?? null;
          const targetBar =
            state.loopEnabled && state.loopStartBar !== null
              ? state.loopStartBar
              : getActiveManualNavigationTarget(state)?.targetBar ?? null;
          const requestId = state.nextPlaybackRequestId + 1;
          state.nextPlaybackRequestId = requestId;
          const readiness = {
            hasRenderer: state.gpRenderer !== null,
            rendererScoreLoaded: state.rendererScoreLoaded,
            rendererRenderFinished: state.rendererRenderFinished,
            rendererPlayerReady: state.rendererPlayerReady,
            rendererFallbackReady: state.rendererFallbackReady,
            confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
            trackSwitchInProgress: state.trackSwitchInProgress,
            requestedTrackIndex: state.requestedTrackIndex,
          };
          const playbackReadyBase =
            readiness.hasRenderer &&
            readiness.rendererScoreLoaded &&
            readiness.rendererRenderFinished &&
            readiness.confirmedTrackIndex !== null &&
            !readiness.trackSwitchInProgress &&
            readiness.requestedTrackIndex === null;
          const playbackReadyPrimary = playbackReadyBase && readiness.rendererPlayerReady;
          const playbackReadyFallback = playbackReadyBase && readiness.rendererFallbackReady;

          if (!playbackReadyPrimary && !playbackReadyFallback) {
            if (readiness.trackSwitchInProgress || readiness.requestedTrackIndex !== null) {
              tracePlayback("play-blocked-track-switch-in-progress", {
                requestId,
                selectedTrackIndex: state.selectedTrackIndex,
                ...readiness,
              });
            } else {
              tracePlayback("play-blocked-not-ready", {
                requestId,
                selectedTrackIndex: state.selectedTrackIndex,
                ...readiness,
              });
            }
            return;
          }
          tracePlayback(playbackReadyPrimary ? "play-ready-primary" : "play-ready-fallback", {
            requestId,
            selectedTrackIndex: state.selectedTrackIndex,
            confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
          });
          const startPlaybackNow = (): void => {
            if (!state.gpRenderer) {
              return;
            }
            tracePlayback("play-dispatch", {
              source: "onPlay",
              requestId,
              selectedTrackIndex: state.selectedTrackIndex,
              confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
              targetTick,
              targetBar,
            });
            logPlaybackPipeline("play-dispatch", { requestId, targetTick, targetBar });
            tracePlayback("play-dispatch-now", { requestId, targetTick, targetBar });
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
          const requiresSeek = targetTick !== null && (state.playbackCurrentTick === null || Math.abs(state.playbackCurrentTick - targetTick) > 1);
          tracePlayback("onPlay-enter", {
            requestId,
            selectedTrackIndex: state.selectedTrackIndex,
            confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
            pendingPlaybackStart: state.pendingPlaybackStart !== null,
            playbackTransportActive: state.playbackTransportActive,
            playbackIsPlaying: state.playbackIsPlaying,
            targetTick,
            targetBar,
            requiresSeek,
            countInEnabled: state.countInEnabled,
            countInInProgress: state.countInInProgress,
            loopEnabled: state.loopEnabled,
            loopStartBar: state.loopStartBar,
            loopEndBar: state.loopEndBar,
          });
          logPlaybackPipeline("play-request", { requestId, targetTick, targetBar, requiresSeek });
          if (requiresSeek) {
            tracePlayback("play-seek-required", { requestId, targetTick, targetBar });
          }

          const schedulePlaybackStart = (): void => {
            if (!state.gpRenderer) {
              return;
            }
            if (!requiresSeek || targetTick === null) {
              startPlaybackNow();
              return;
            }
            const seekApplied = state.gpRenderer.seekToTick(targetTick);
            logPlaybackPipeline("seek-dispatched", { requestId, targetTick, seekApplied });
            if (!seekApplied) {
              state.projectStatusMessage = "Could not seek to playback start.";
              updateProjectStatusBanner(rootElement, state.projectStatusMessage);
              return;
            }
            state.pendingPlaybackStart = {
              requestId,
              targetTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex,
              targetTick,
              targetBar,
            };
            tracePlayback("pendingPlaybackStart-created", {
              requestId,
              targetTrackIndex: state.pendingPlaybackStart.targetTrackIndex,
              targetTick,
              targetBar,
            });
            tracePlayback("play-dispatch-after-seek", {
              requestId,
              targetTick,
              targetBar,
            });
          };

          if (!state.countInEnabled) {
            schedulePlaybackStart();
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
                schedulePlaybackStart();
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

          logPlaybackPipeline("pause-dispatch", {
            selectedTrackIndex: state.selectedTrackIndex,
          });
          tracePlayback("onPause", {
            selectedTrackIndex: state.selectedTrackIndex,
            confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
            pendingPlaybackStart: state.pendingPlaybackStart !== null,
            playbackTransportActive: state.playbackTransportActive,
            playbackIsPlaying: state.playbackIsPlaying,
          });
          hardCancelPlaybackPipeline("pause");
          state.gpRenderer.pause();
        },
        onStop: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }

          logPlaybackPipeline("stop-dispatch", {
            selectedTrackIndex: state.selectedTrackIndex,
          });
          tracePlayback("onStop", {
            selectedTrackIndex: state.selectedTrackIndex,
            confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
            pendingPlaybackStart: state.pendingPlaybackStart !== null,
            playbackTransportActive: state.playbackTransportActive,
            playbackIsPlaying: state.playbackIsPlaying,
          });
          hardCancelPlaybackPipeline("stop", { resetPosition: true });
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
      appendSessionDebugEvent(state.sessionDebugLogger, {
        type: "project-screen-init",
        timestamp: new Date().toISOString(),
        projectTitle: project.title,
        sourceFileName: project.sourceFile.fileName,
        selectedTrackIndex: state.selectedTrackIndex,
      });
      appendSessionDebugEvent(state.sessionDebugLogger, {
        type: "render-retry-scheduled",
        timestamp: new Date().toISOString(),
        reason: "project-screen-init",
        selectedTrackIndex: state.selectedTrackIndex,
      });
      state.projectRendererCreateInFlight = true;
      state.projectRendererCreateKey = projectCreateKey;
      traceRendererLifecycle("renderer-create-start", {
        projectCreateKey,
        selectedTrackIndex: state.selectedTrackIndex,
      });
      createGpRenderer(gpRenderHost, project.sourceFile, state.selectedTrackIndex, {
        onTracksLoaded: (tracks) => {
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "tracks-loaded",
            timestamp: new Date().toISOString(),
            trackCount: tracks.length,
            trackIndexes: tracks.map((track) => track.index),
            tracks: tracks.map((track) => ({
              trackIndex: track.index,
              trackName: track.name,
              runtimeTrackPosition: track.runtimeTrackPosition,
              isPercussion: track.isPercussion,
              totalBars: track.totalBars,
              totalNotes: track.totalNotes,
              firstNonEmptyBarIndex: track.firstNonEmptyBarIndex,
            })),
          });
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
          traceRendererLifecycle("project-init-deduped", {
            reason: "skip-render-on-tracks-loaded",
            trackCount: tracks.length,
          });
        },
        onDebugInfo: (debugInfo) => {
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "renderer-debug-info",
            timestamp: new Date().toISOString(),
            renderCycleCounter: debugInfo.renderCycleCounter,
            confirmedActiveTrackIndex: debugInfo.confirmedActiveTrackIndex,
            renderMode: debugInfo.renderMode,
            isPercussion: debugInfo.isPercussion,
            effectiveStaveProfile: debugInfo.effectiveStaveProfile,
          });
          state.gpRenderDebugInfo = debugInfo;
          const matchedTrack = state.gpTracks.find((track) => track.index === debugInfo.confirmedActiveTrackIndex);
          state.activeTrackName = matchedTrack
            ? matchedTrack.name
            : (debugInfo.confirmedActiveTrackName ?? null);
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
        onRenderLifecycle: (event) => {
          const eventType = typeof event.type === "string" ? event.type : "unknown";
          if (eventType === "score-loaded") {
            state.rendererScoreLoaded = true;
          } else if (eventType === "render-start") {
            state.rendererRenderFinished = false;
          } else if (eventType === "render-finish") {
            state.rendererRenderFinished = true;
          } else if (eventType === "player-ready") {
            state.rendererPlayerReady = true;
          } else if (eventType === "playback-runtime-ready-fallback") {
            state.rendererFallbackReady = true;
          } else if (eventType === "active-track-confirmed") {
            state.trackSwitchInProgress = false;
          }
          appendSessionDebugEvent(state.sessionDebugLogger, {
            ...event,
          });
        },
        onTrackRenderCommitted: (trackIndex) => {
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "track-render-committed",
            timestamp: new Date().toISOString(),
            trackIndex,
          });
          tryCompletePendingOverviewNavigationAfterRender(state, rootElement, trackIndex);
          applyMixerStateToRenderer(state);
          nudgeRenderedSectionLabels(rootElement, state);
          updateLoopHandlesVisual(state, rootElement);
          state.trackSwitchInProgress = false;
          state.rendererRenderFinished = true;
          traceTrackSwitch("track-switch-finished", {
            trackIndex,
            selectedTrackIndex: state.selectedTrackIndex,
          });
        },
        onProgrammaticSeekConfirmed: (trackIndex, tick) => {
          tracePlayback("onProgrammaticSeekConfirmed", {
            trackIndex,
            tick,
          });
          tracePlayback("onProgrammaticSeekConfirmed-enter", {
            trackIndex,
            tick,
            pendingPlaybackStart: state.pendingPlaybackStart,
            selectedTrackIndex: state.selectedTrackIndex,
            confirmedTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
          });
          if (
            state.pendingPlaybackStart &&
            state.pendingPlaybackStart.targetTrackIndex === trackIndex &&
            Math.abs(state.pendingPlaybackStart.targetTick - tick) <= 1
          ) {
            const pendingStart = state.pendingPlaybackStart;
            state.pendingPlaybackStart = null;
            logPlaybackPipeline("seek-confirmed", {
              requestId: pendingStart.requestId,
              targetTick: pendingStart.targetTick,
              confirmedTick: tick,
            });
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
            logPlaybackPipeline("play-dispatch", {
              requestId: pendingStart.requestId,
              targetTick: pendingStart.targetTick,
              targetBar: pendingStart.targetBar,
            });
            tracePlayback("play-dispatch", {
              source: "onProgrammaticSeekConfirmed",
              requestId: pendingStart.requestId,
              targetTick: pendingStart.targetTick,
              targetBar: pendingStart.targetBar,
              trackIndex,
            });
            state.gpRenderer?.play();
          }

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
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "runtime-notice",
            timestamp: new Date().toISOString(),
            message,
          });
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
          state.trackSwitchInProgress = false;
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
          traceRendererLifecycle("active-track-confirmed", {
            trackIndex,
            selectedTrackIndex: state.selectedTrackIndex,
          });
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "active-track-confirmed",
            timestamp: new Date().toISOString(),
            trackIndex,
          });
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
          const matchedTrack = state.gpTracks.find((track) => track.index === trackIndex);
          state.activeTrackName = matchedTrack
            ? matchedTrack.name
            : state.activeTrackName;

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
        onRenderError: (payload) => {
          const message = payload.message;
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "render-error",
            timestamp: new Date().toISOString(),
            message,
            details: payload.details,
          });
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "render-error-context",
            timestamp: new Date().toISOString(),
            selectedTrackIndex: state.selectedTrackIndex,
            requestedTrackIndex: state.requestedTrackIndex,
            confirmedActiveTrackIndex: state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? null,
            activeTrackName: state.activeTrackName,
            sourceFileName: state.currentProject?.sourceFile.fileName ?? null,
            projectTitle: state.currentProject?.title ?? null,
            scoreTitle: state.scoreTitle,
            totalBars: state.totalBars,
            gpRenderDebugInfo: state.gpRenderDebugInfo,
            scoreTracksSummary: summarizeCollection(state.gpRenderDebugInfo?.scoreTracks ?? [], 8, 5),
            renderedTracksSummary: summarizeCollection(state.gpRenderDebugInfo?.renderedTracks ?? [], 8, 5),
          });
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "anchor-pipeline-skipped",
            timestamp: new Date().toISOString(),
            reason: "render-not-committed",
            selectedTrackIndex: state.selectedTrackIndex,
          });
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
          appendSessionDebugEvent(state.sessionDebugLogger, {
            type: "render-recreated-after-error",
            timestamp: new Date().toISOString(),
            reason: "render-error",
            selectedTrackIndex: state.selectedTrackIndex,
          });
          render();
        },
      }, state.tabZoomPercent)
        .then((renderer) => {
          state.gpRenderer = renderer;
          state.projectRendererCreateInFlight = false;
          state.projectRendererCreateKey = null;
          traceRendererLifecycle("renderer-created", {
            selectedTrackIndex: state.selectedTrackIndex,
            requestedTrackIndex: state.requestedTrackIndex,
          });
          traceRendererLifecycle("renderer-create-finish", {
            selectedTrackIndex: state.selectedTrackIndex,
          });
          logPlaybackPipeline("renderer-created", {
            selectedTrackIndex: state.selectedTrackIndex,
          });
          state.gpRenderer.setPlaybackSpeedPercent(state.playbackSpeedPercent);
          applyMixerStateToRenderer(state);
        })
        .catch((error: unknown) => {
          state.projectRendererCreateInFlight = false;
          state.projectRendererCreateKey = null;
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
