import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  score?: AlphaTabScore;
  tracks?: AlphaTabTrack[];
  play?: () => void;
  pause?: () => void;
  stop?: () => void;
  destroy?: () => void;
  playerStateChanged?: {
    on: (handler: (state: unknown) => void) => void;
  };
  playerPositionChanged?: {
    on: (handler: (position: unknown) => void) => void;
  };
  scoreLoaded: {
    on: (handler: (score: AlphaTabScore) => void) => void;
  };
  renderStarted?: {
    on: (handler: () => void) => void;
  };
  renderFinished?: {
    on: (handler: () => void) => void;
  };
  error?: {
    on: (handler: (error: unknown) => void) => void;
  };
}

interface AlphaTabScore {
  title?: string;
  tempo?: number;
  tracks: AlphaTabTrack[];
  masterBars?: AlphaTabMasterBar[];
  stylesheet?: {
    singleTrackTrackNamePolicy?: string;
    firstSystemTrackNameMode?: string;
    otherSystemsTrackNameMode?: string;
  };
}

interface AlphaTabTrack {
  index: number;
  name: string;
  isPercussion?: boolean;
  staves?: AlphaTabStaff[];
}

interface AlphaTabStaff {
  isPercussion?: boolean;
  bars?: AlphaTabBar[];
}

interface AlphaTabBar {
  voices?: AlphaTabVoice[];
  start?: number;
  startTick?: number;
  tick?: number;
  playbackStart?: number;
  absoluteStart?: number;
  startPosition?: {
    tick?: number;
  };
}

interface AlphaTabMasterBar {
  start?: number;
  startTick?: number;
  tick?: number;
  playbackStart?: number;
  absoluteStart?: number;
  startPosition?: {
    tick?: number;
  };
  tempo?: number;
  tempoAutomation?: {
    value?: number;
  };
  section?: {
    text?: string;
  };
  sectionTitle?: string;
  marker?: {
    title?: string;
  };
}

interface AlphaTabVoice {
  beats?: AlphaTabBeat[];
}

interface AlphaTabBeat {
  notes?: AlphaTabNote[];
}

interface AlphaTabNote {
  readonly _exists?: boolean;
}

interface TrackSelection {
  track: AlphaTabTrack;
  trackPosition: number;
}

interface TrackContentSignature {
  totalBars: number;
  totalNotes: number;
  firstNonEmptyBarIndex: number | null;
}

export interface GpTrackInfo {
  index: number;
  name: string;
}

export interface GpTrackRuntimeInfo {
  position: number;
  trackIndex: number;
  trackName: string;
  totalBars: number;
  totalNotes: number;
  firstNonEmptyBarIndex: number | null;
}

export interface GpRenderDebugInfo {
  selectedTrackIndex: number;
  requestedTrackIndex: number;
  resolvedTrackName: string;
  resolvedTrackIndex: number;
  resolvedTrackPosition: number;
  confirmedActiveTrackName: string;
  confirmedActiveTrackIndex: number;
  confirmedActiveTrackPosition: number;
  rendererReloaded: boolean;
  rendererBusy: boolean;
  pendingRequestedTrackIndex: number | null;
  renderCycleCounter: number;
  lastRenderStartedAtIso: string | null;
  lastRenderFinishedAtIso: string | null;
  lastFailedRequestedTrackIndex: number | null;
  lastRendererErrorStage: string | null;
  renderTimeoutHit: boolean;
  lastSuccessfulConfirmedTrackIndex: number | null;
  renderMode:
    | "string-tab"
    | "string-heavy-safe"
    | "percussion-default"
    | "percussion-heavy-safe"
    | "fallback";
  heavyTrackDetected: boolean;
  heavyTrackReason: string | null;
  isPercussion: boolean;
  effectiveStaveProfile: "Tab" | "Default";
  scoreTrackCount: number;
  scoreTracks: GpTrackRuntimeInfo[];
  renderedTracks: GpTrackRuntimeInfo[];
}

export interface GpScoreRuntimeInfo {
  scoreTitle: string | null;
  totalBars: number | null;
  tempoBpm: number | null;
}

export interface GpPlaybackRuntimeInfo {
  isPlaying: boolean | null;
  positionLabel: string | null;
  currentBar: number | null;
  currentTick: number | null;
  currentBarStartTick: number | null;
  currentBarEndTickExclusive: number | null;
  playerPositionPayloadShape: string | null;
  playerStatePayloadShape: string | null;
  currentBarSourcePath: string | null;
}

export interface GpTrackOverviewInfo {
  trackIndex: number;
  trackName: string;
  isPercussion: boolean;
  barActivity: boolean[];
}

export interface GpSectionMarkerInfo {
  barIndex: number;
  label: string;
}

export interface GpScoreOverviewRuntimeInfo {
  totalBars: number;
  trackRows: GpTrackOverviewInfo[];
  sectionMarkers: GpSectionMarkerInfo[];
}

export interface GpRendererHooks {
  onTracksLoaded: (tracks: GpTrackInfo[]) => void;
  onDebugInfo: (debugInfo: GpRenderDebugInfo) => void;
  onActiveTrackConfirmed: (trackIndex: number) => void;
  onScoreRuntimeInfo: (info: GpScoreRuntimeInfo) => void;
  onScoreOverviewRuntimeInfo: (info: GpScoreOverviewRuntimeInfo) => void;
  onPlaybackRuntimeInfo: (info: GpPlaybackRuntimeInfo) => void;
  onRuntimeNotice: (message: string) => void;
  onRenderError: (message: string) => void;
}

export interface GpRendererController {
  selectTrack: (trackIndex: number) => void;
  setZoom: (zoomPercent: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  destroy: () => void;
}

const BRAVURA_FONT_DIRECTORY = "/font/";
const SONIVOX_SOUND_FONT_PATH = "/soundfont/sonivox.sf2";
const ENABLE_LAZY_LOADING_DEFAULT = false;
const USE_WORKERS = false;
const RENDER_TIMEOUT_MS = 5000;
const HEAVY_TRACK_NOTE_THRESHOLD = 5000;
const HEAVY_TRACK_BAR_THRESHOLD = 400;

type RenderMode =
  | "string-tab"
  | "string-heavy-safe"
  | "percussion-default"
  | "percussion-heavy-safe"
  | "fallback";
type StaveProfile = "Tab" | "Default";

interface RenderPlan {
  mode: RenderMode;
  heavyTrackDetected: boolean;
  heavyTrackReason: string | null;
  isPercussion: boolean;
  effectiveStaveProfile: StaveProfile;
}

interface RenderViewportScrollSnapshot {
  left: number;
  top: number;
}

interface TickBarRange {
  startTick: number;
  endTickExclusive: number;
  barNumber: number;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function toTrackInfoList(tracks: AlphaTabTrack[]): GpTrackInfo[] {
  return tracks.map((track) => ({
    index: track.index,
    name: track.name || `Track ${track.index + 1}`,
  }));
}

function countNotesInBar(bar: AlphaTabBar | undefined): number {
  const voices = bar?.voices ?? [];
  return voices.reduce((voiceNoteCount, voice) => {
    const beats = voice.beats ?? [];
    const beatNoteCount = beats.reduce((sum, beat) => sum + (beat.notes?.length ?? 0), 0);
    return voiceNoteCount + beatNoteCount;
  }, 0);
}

function computeTrackContentSignature(track: AlphaTabTrack, fallbackBarCount: number): TrackContentSignature {
  const primaryStaffBars = track.staves?.[0]?.bars ?? [];
  const bars = primaryStaffBars;
  const totalBars = bars.length > 0 ? bars.length : fallbackBarCount;

  let totalNotes = 0;
  let firstNonEmptyBarIndex: number | null = null;

  for (let barIndex = 0; barIndex < bars.length; barIndex += 1) {
    const barNoteCount = countNotesInBar(bars[barIndex]);
    totalNotes += barNoteCount;

    if (barNoteCount > 0 && firstNonEmptyBarIndex === null) {
      firstNonEmptyBarIndex = barIndex;
    }
  }

  return {
    totalBars,
    totalNotes,
    firstNonEmptyBarIndex,
  };
}

function toTrackRuntimeInfoList(tracks: AlphaTabTrack[], score: AlphaTabScore | undefined): GpTrackRuntimeInfo[] {
  const fallbackBarCount = score?.masterBars?.length ?? 0;

  return tracks.map((track, position) => {
    const signature = computeTrackContentSignature(track, fallbackBarCount);

    return {
      position,
      trackIndex: track.index,
      trackName: track.name || `Track ${track.index + 1}`,
      totalBars: signature.totalBars,
      totalNotes: signature.totalNotes,
      firstNonEmptyBarIndex: signature.firstNonEmptyBarIndex,
    };
  });
}

function toSafeTempoBpm(rawValue: unknown): number | null {
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue) || rawValue <= 0) {
    return null;
  }

  return Math.round(rawValue);
}

function extractTempoBpm(score: AlphaTabScore): number | null {
  const fromScore = toSafeTempoBpm(score.tempo);
  if (fromScore !== null) {
    return fromScore;
  }

  const firstMasterBar = score.masterBars?.[0];
  const fromMasterBarTempo = toSafeTempoBpm(firstMasterBar?.tempo);
  if (fromMasterBarTempo !== null) {
    return fromMasterBarTempo;
  }

  return toSafeTempoBpm(firstMasterBar?.tempoAutomation?.value);
}

function toTrackOverviewRow(track: AlphaTabTrack, fallbackBarCount: number): GpTrackOverviewInfo {
  const bars = track.staves?.[0]?.bars ?? [];
  const barCount = bars.length > 0 ? bars.length : fallbackBarCount;
  const barActivity = Array.from({ length: barCount }, (_, barIndex) => countNotesInBar(bars[barIndex]) > 0);

  return {
    trackIndex: track.index,
    trackName: track.name || `Track ${track.index + 1}`,
    isPercussion: track.isPercussion === true || track.staves?.some((staff) => staff.isPercussion === true) === true,
    barActivity,
  };
}

function toSectionMarkerInfo(masterBars: AlphaTabMasterBar[] | undefined): GpSectionMarkerInfo[] {
  if (!masterBars || masterBars.length === 0) {
    return [];
  }

  const markers: GpSectionMarkerInfo[] = [];
  masterBars.forEach((bar, barIndex) => {
    const label = bar.section?.text?.trim() || bar.sectionTitle?.trim() || bar.marker?.title?.trim() || "";
    if (!label) {
      return;
    }

    markers.push({
      barIndex,
      label,
    });
  });

  return markers;
}

function toScoreOverviewRuntimeInfo(score: AlphaTabScore): GpScoreOverviewRuntimeInfo {
  const totalBars = score.masterBars?.length ?? 0;
  const trackRows = (score.tracks ?? []).map((track) => toTrackOverviewRow(track, totalBars));

  return {
    totalBars,
    trackRows,
    sectionMarkers: toSectionMarkerInfo(score.masterBars),
  };
}

function tryReadTickAtPath(value: unknown, path: string): number | null {
  const segments = path.split(".");
  let currentValue: unknown = value;
  for (const segment of segments) {
    if (!currentValue || typeof currentValue !== "object") {
      return null;
    }
    currentValue = (currentValue as Record<string, unknown>)[segment];
  }

  return typeof currentValue === "number" && Number.isFinite(currentValue) ? currentValue : null;
}

function resolveBarStartTick(
  score: AlphaTabScore,
  barIndex: number,
): {
  tick: number | null;
  sourcePath: string | null;
} {
  const masterBar = score.masterBars?.[barIndex];
  const masterBarPaths = ["startTick", "start", "tick", "playbackStart", "absoluteStart", "startPosition.tick"];
  for (const path of masterBarPaths) {
    const tick = tryReadTickAtPath(masterBar, path);
    if (tick !== null) {
      return {
        tick,
        sourcePath: `masterBars.${path}`,
      };
    }
  }

  const primaryTrackBar = score.tracks?.[0]?.staves?.[0]?.bars?.[barIndex];
  const trackBarPaths = ["startTick", "start", "tick", "playbackStart", "absoluteStart", "startPosition.tick"];
  for (const path of trackBarPaths) {
    const tick = tryReadTickAtPath(primaryTrackBar, path);
    if (tick !== null) {
      return {
        tick,
        sourcePath: `tracks[0].staves[0].bars.${path}`,
      };
    }
  }

  return {
    tick: null,
    sourcePath: null,
  };
}

function buildAlphaTabSettings(enableLazyLoading: boolean, staveProfile: StaveProfile, zoomPercent: number): alphaTab.json.SettingsJson {
  const settings: alphaTab.json.SettingsJson = {
    core: {
      fontDirectory: BRAVURA_FONT_DIRECTORY,
      enableLazyLoading,
      useWorkers: USE_WORKERS,
    },
    display: {
      staveProfile,
    },
    player: {
      enablePlayer: staveProfile === "Tab",
      soundFont: SONIVOX_SOUND_FONT_PATH,
    },
  };

  const unsafeSettings = settings as unknown as {
    player?: Record<string, unknown>;
    display?: Record<string, unknown>;
  };
  unsafeSettings.player = {
    ...(unsafeSettings.player ?? {}),
    enableCursor: false,
    followCursor: false,
    autoScroll: false,
    scrollMode: "off",
  };
  unsafeSettings.display = {
    ...(unsafeSettings.display ?? {}),
    followCursor: false,
    autoScroll: false,
    scale: zoomPercent / 100,
  };

  return settings;
}

function createAlphaTabApi(container: HTMLElement, renderPlan: RenderPlan, zoomPercent: number): AlphaTabApi {
  const enableLazyLoading =
    renderPlan.mode === "string-heavy-safe" || renderPlan.mode === "percussion-heavy-safe" ? true : ENABLE_LAZY_LOADING_DEFAULT;
  return new alphaTab.AlphaTabApi(
    container,
    buildAlphaTabSettings(enableLazyLoading, renderPlan.effectiveStaveProfile, zoomPercent),
  ) as unknown as AlphaTabApi;
}

function resolveTrackSelection(availableTracks: AlphaTabTrack[], selectedTrackIndex: number): TrackSelection | null {
  if (availableTracks.length === 0) {
    return null;
  }

  const selectedTrackPosition = availableTracks.findIndex((track) => track.index === selectedTrackIndex);
  const fallbackTrack = availableTracks[0];

  if (!fallbackTrack) {
    return null;
  }

  if (selectedTrackPosition < 0) {
    return {
      track: fallbackTrack,
      trackPosition: 0,
    };
  }

  const selectedTrack = availableTracks[selectedTrackPosition];
  if (!selectedTrack) {
    return {
      track: fallbackTrack,
      trackPosition: 0,
    };
  }

  return {
    track: selectedTrack,
    trackPosition: selectedTrackPosition,
  };
}

function applyTrackNamePolicies(score: AlphaTabScore): void {
  if (!score.stylesheet) {
    return;
  }

  score.stylesheet.singleTrackTrackNamePolicy = "AllSystems";
  score.stylesheet.firstSystemTrackNameMode = "FullName";
  score.stylesheet.otherSystemsTrackNameMode = "FullName";
}

function clearRenderHost(container: HTMLElement): void {
  container.innerHTML = "";
}

function renderFallbackMessage(container: HTMLElement, message: string): void {
  container.innerHTML = `<div class="gpRenderFallbackMessage" role="status">${message}</div>`;
}

function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}

export async function createGpRenderer(
  container: HTMLElement,
  sourceFile: SourceFileData,
  selectedTrackIndex: number,
  hooks: GpRendererHooks,
  initialZoomPercent = 100,
): Promise<GpRendererController> {
  const sourceBytes = base64ToBytes(sourceFile.contentBase64);

  let activeApi: AlphaTabApi | null = null;
  let lastLoadedScoreTracks: AlphaTabTrack[] = [];
  let requestedTrackIndex = selectedTrackIndex;
  let confirmedActiveTrackIndex = selectedTrackIndex;
  let lastSuccessfulConfirmedTrackIndex: number | null = selectedTrackIndex;

  let rendererBusy = false;
  let pendingRequestedTrackIndex: number | null = null;
  let renderCycleCounter = 0;
  let lastRenderStartedAtIso: string | null = null;
  let lastRenderFinishedAtIso: string | null = null;
  let lastFailedRequestedTrackIndex: number | null = null;
  let lastRendererErrorStage: string | null = null;
  let renderTimeoutHit = false;
  let activeSessionToken = 0;
  let activeRenderTimeoutId: number | null = null;
  let pendingScrollSnapshot: RenderViewportScrollSnapshot | null = null;
  let playbackScrollLockSnapshot: RenderViewportScrollSnapshot | null = null;
  let currentRenderMode: RenderMode = "string-tab";
  let heavyTrackDetected = false;
  let heavyTrackReason: string | null = null;
  let isPercussionTrack = false;
  let effectiveStaveProfile: StaveProfile = "Tab";
  let lastKnownMasterBarCount = 0;
  let scoreRuntimeInfo: GpScoreRuntimeInfo = {
    scoreTitle: null,
    totalBars: null,
    tempoBpm: null,
  };
  let playbackRuntimeInfo: GpPlaybackRuntimeInfo = {
    isPlaying: null,
    positionLabel: null,
    currentBar: null,
    currentTick: null,
    currentBarStartTick: null,
    currentBarEndTickExclusive: null,
    playerPositionPayloadShape: null,
    playerStatePayloadShape: null,
    currentBarSourcePath: null,
  };
  let tickBarRanges: TickBarRange[] = [];
  let tickLookupSourcePath: string | null = null;
  let hasLoggedPlayerPositionPayloadShape = false;
  let hasLoggedPlayerStatePayloadShape = false;
  let playbackCapabilityMessage: string | null = null;
  let zoomPercent = Math.max(50, Math.min(200, initialZoomPercent));

  const emitDebugInfo = (): void => {
    const scoreTracks = activeApi?.score?.tracks ?? lastLoadedScoreTracks;
    const renderedTracks = activeApi?.tracks ?? [];

    const resolvedSelection =
      resolveTrackSelection(scoreTracks, requestedTrackIndex) ??
      resolveTrackSelection(scoreTracks, confirmedActiveTrackIndex) ?? {
        track: scoreTracks[0] ?? { index: 0, name: "(none)" },
        trackPosition: 0,
      };

    const confirmedSelection =
      resolveTrackSelection(renderedTracks, confirmedActiveTrackIndex) ??
      resolveTrackSelection(scoreTracks, confirmedActiveTrackIndex) ??
      resolvedSelection;

    hooks.onDebugInfo({
      selectedTrackIndex: confirmedActiveTrackIndex,
      requestedTrackIndex,
      resolvedTrackName: resolvedSelection.track.name || `Track ${resolvedSelection.track.index + 1}`,
      resolvedTrackIndex: resolvedSelection.track.index,
      resolvedTrackPosition: resolvedSelection.trackPosition,
      confirmedActiveTrackName: confirmedSelection.track.name || `Track ${confirmedSelection.track.index + 1}`,
      confirmedActiveTrackIndex: confirmedSelection.track.index,
      confirmedActiveTrackPosition: confirmedSelection.trackPosition,
      rendererReloaded: true,
      rendererBusy,
      pendingRequestedTrackIndex,
      renderCycleCounter,
      lastRenderStartedAtIso,
      lastRenderFinishedAtIso,
      lastFailedRequestedTrackIndex,
      lastRendererErrorStage,
      renderTimeoutHit,
      lastSuccessfulConfirmedTrackIndex,
      renderMode: currentRenderMode,
      heavyTrackDetected,
      heavyTrackReason,
      isPercussion: isPercussionTrack,
      effectiveStaveProfile,
      scoreTrackCount: scoreTracks.length,
      scoreTracks: toTrackRuntimeInfoList(scoreTracks, activeApi?.score),
      renderedTracks: toTrackRuntimeInfoList(renderedTracks, activeApi?.score),
    });
  };

  const destroyActiveRenderer = (): void => {
    activeApi?.destroy?.();
    activeApi = null;
  };

  const emitScoreRuntimeInfo = (): void => {
    hooks.onScoreRuntimeInfo(scoreRuntimeInfo);
  };

  const emitPlaybackRuntimeInfo = (): void => {
    hooks.onPlaybackRuntimeInfo(playbackRuntimeInfo);
  };

  const setPlaybackCapabilityMessage = (message: string | null): void => {
    playbackCapabilityMessage = message;
  };

  const resetPlaybackRuntimeInfo = (): void => {
    playbackRuntimeInfo = {
      isPlaying: null,
      positionLabel: null,
      currentBar: null,
      currentTick: null,
      currentBarStartTick: null,
      currentBarEndTickExclusive: null,
      playerPositionPayloadShape: null,
      playerStatePayloadShape: null,
      currentBarSourcePath: null,
    };
    tickBarRanges = [];
    tickLookupSourcePath = null;
    playbackScrollLockSnapshot = null;
    emitPlaybackRuntimeInfo();
  };

  const formatPlaybackSeconds = (secondsValue: number): string => {
    const seconds = Math.max(0, Math.floor(secondsValue));
    const minutesPart = Math.floor(seconds / 60);
    const secondsPart = seconds % 60;
    return `${minutesPart}:${String(secondsPart).padStart(2, "0")}`;
  };

  const readNumberAtPath = (payload: unknown, path: string): number | null => {
    const segments = path.split(".");
    let currentValue: unknown = payload;

    for (const segment of segments) {
      if (!currentValue || typeof currentValue !== "object") {
        return null;
      }

      currentValue = (currentValue as Record<string, unknown>)[segment];
    }

    return typeof currentValue === "number" && !Number.isNaN(currentValue) ? currentValue : null;
  };

  const describePayloadShape = (payload: unknown): string => {
    if (payload === null) {
      return "null";
    }
    if (payload === undefined) {
      return "undefined";
    }
    if (typeof payload !== "object") {
      return typeof payload;
    }

    const rootKeys = Object.keys(payload as Record<string, unknown>);
    const nestedKeys = rootKeys
      .flatMap((key) => {
        const value = (payload as Record<string, unknown>)[key];
        if (!value || typeof value !== "object") {
          return [];
        }

        return Object.keys(value as Record<string, unknown>).map((nestedKey) => `${key}.${nestedKey}`);
      })
      .slice(0, 16);

    return [...rootKeys, ...nestedKeys].join(", ");
  };

  const buildTickToBarRanges = (score: AlphaTabScore): void => {
    const totalBars = score.masterBars?.length ?? 0;
    if (totalBars <= 0) {
      tickBarRanges = [];
      tickLookupSourcePath = null;
      return;
    }

    const starts: Array<{ tick: number; barIndex: number; sourcePath: string }> = [];
    for (let barIndex = 0; barIndex < totalBars; barIndex += 1) {
      const resolvedStart = resolveBarStartTick(score, barIndex);
      if (resolvedStart.tick === null || !resolvedStart.sourcePath) {
        tickBarRanges = [];
        tickLookupSourcePath = null;
        return;
      }

      starts.push({
        tick: resolvedStart.tick,
        barIndex,
        sourcePath: resolvedStart.sourcePath,
      });
    }

    const ranges: TickBarRange[] = [];
    for (let index = 0; index < starts.length; index += 1) {
      const current = starts[index];
      if (!current) {
        continue;
      }

      const next = starts[index + 1];
      const endTickExclusive = next ? next.tick : Number.POSITIVE_INFINITY;
      ranges.push({
        startTick: current.tick,
        endTickExclusive,
        barNumber: current.barIndex + 1,
      });
    }

    tickBarRanges = ranges;
    tickLookupSourcePath = starts[0]?.sourcePath ?? null;
  };

  const extractCurrentTickFromPositionPayload = (payload: unknown): number | null => {
    const knownTickPaths = ["currentTick", "tick", "positionTick", "playbackTick", "position.currentTick"] as const;
    for (const path of knownTickPaths) {
      const candidate = readNumberAtPath(payload, path);
      if (candidate !== null) {
        return candidate;
      }
    }

    return null;
  };

  const resolveCurrentBarFromTick = (
    currentTick: number,
  ): {
    currentBar: number | null;
    currentBarStartTick: number | null;
    currentBarEndTickExclusive: number | null;
    sourcePath: string | null;
  } => {
    const matchedRange = tickBarRanges.find(
      (range) => currentTick >= range.startTick && currentTick < range.endTickExclusive,
    );
    if (!matchedRange) {
      return {
        currentBar: null,
        currentBarStartTick: null,
        currentBarEndTickExclusive: null,
        sourcePath: tickLookupSourcePath ? `tickLookup:${tickLookupSourcePath}` : "tickLookup:unavailable",
      };
    }

    return {
      currentBar: matchedRange.barNumber,
      currentBarStartTick: matchedRange.startTick,
      currentBarEndTickExclusive: Number.isFinite(matchedRange.endTickExclusive) ? matchedRange.endTickExclusive : null,
      sourcePath: tickLookupSourcePath
        ? `tickLookup:${tickLookupSourcePath}[${matchedRange.startTick}-${matchedRange.endTickExclusive === Number.POSITIVE_INFINITY ? "∞" : matchedRange.endTickExclusive}]`
        : "tickLookup:resolved",
    };
  };

  const extractPositionLabelFromPayload = (payload: unknown): string | null => {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const maybeObject = payload as { currentTime?: number; endTime?: number; position?: number; duration?: number };
    const currentTime =
      typeof maybeObject.currentTime === "number"
        ? maybeObject.currentTime
        : typeof maybeObject.position === "number"
          ? maybeObject.position
          : null;
    if (currentTime === null || Number.isNaN(currentTime)) {
      return null;
    }

    const endTime =
      typeof maybeObject.endTime === "number"
        ? maybeObject.endTime
        : typeof maybeObject.duration === "number"
          ? maybeObject.duration
          : null;
    if (endTime === null || Number.isNaN(endTime)) {
      return formatPlaybackSeconds(currentTime);
    }

    return `${formatPlaybackSeconds(currentTime)} / ${formatPlaybackSeconds(endTime)}`;
  };

  const isPlaybackApiAvailable = (api: AlphaTabApi): boolean =>
    typeof api.play === "function" && typeof api.pause === "function" && typeof api.stop === "function";

  const normalizePlaybackState = (statePayload: unknown): "playing" | "paused" | "stopped" | null => {
    if (typeof statePayload === "boolean") {
      return statePayload ? "playing" : "paused";
    }

    if (typeof statePayload === "number") {
      if (statePayload === 2) {
        return "playing";
      }
      if (statePayload === 1) {
        return "paused";
      }
      if (statePayload === 0) {
        return "stopped";
      }
    }

    const normalizedText =
      typeof statePayload === "string"
        ? statePayload
        : typeof statePayload === "object" && statePayload
          ? String(
              (statePayload as { state?: unknown; status?: unknown; value?: unknown }).state ??
                (statePayload as { status?: unknown }).status ??
                (statePayload as { value?: unknown }).value ??
                "",
            )
        : "";
    const loweredText = normalizedText.trim().toLowerCase();
    if (!loweredText) {
      return null;
    }
    if (loweredText.includes("play")) {
      return "playing";
    }
    if (loweredText.includes("pause")) {
      return "paused";
    }
    if (loweredText.includes("stop")) {
      return "stopped";
    }

    return null;
  };

  const clearRenderTimeout = (): void => {
    if (activeRenderTimeoutId === null) {
      return;
    }

    window.clearTimeout(activeRenderTimeoutId);
    activeRenderTimeoutId = null;
  };

  const captureRenderViewportScroll = (): RenderViewportScrollSnapshot => ({
    left: Math.max(0, container.scrollLeft),
    top: container.scrollTop,
  });

  const restoreRenderViewportScroll = (snapshot: RenderViewportScrollSnapshot): void => {
    const maxHorizontalScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    container.scrollLeft = Math.min(Math.max(snapshot.left, 0), maxHorizontalScroll);
    container.scrollTop = snapshot.top;
  };

  const isPercussionTrackFromRuntime = (track: AlphaTabTrack): boolean => {
    if (track.isPercussion === true) {
      return true;
    }

    if (track.staves?.some((staff) => staff.isPercussion === true)) {
      return true;
    }

    return /(drum|drums|percussion|perc|kit)/i.test(track.name || "");
  };

  const buildRenderPlan = (trackIndex: number): RenderPlan => {
    const track = lastLoadedScoreTracks.find((item) => item.index === trackIndex);
    if (!track) {
      return {
        mode: "string-tab",
        heavyTrackDetected: false,
        heavyTrackReason: null,
        isPercussion: false,
        effectiveStaveProfile: "Tab",
      };
    }

    const percussion = isPercussionTrackFromRuntime(track);
    const reasons: string[] = [];
    const signature = computeTrackContentSignature(track, lastKnownMasterBarCount);
    if (signature.totalNotes >= HEAVY_TRACK_NOTE_THRESHOLD) {
      reasons.push(`totalNotes=${signature.totalNotes}`);
    }
    if (signature.totalBars >= HEAVY_TRACK_BAR_THRESHOLD) {
      reasons.push(`totalBars=${signature.totalBars}`);
    }

    if (reasons.length === 0) {
      if (percussion) {
        return {
          mode: "percussion-default",
          heavyTrackDetected: false,
          heavyTrackReason: null,
          isPercussion: true,
          effectiveStaveProfile: "Default",
        };
      }

      return {
        mode: "string-tab",
        heavyTrackDetected: false,
        heavyTrackReason: null,
        isPercussion: false,
        effectiveStaveProfile: "Tab",
      };
    }

    return {
      mode: percussion ? "percussion-heavy-safe" : "string-heavy-safe",
      heavyTrackDetected: true,
      heavyTrackReason: reasons.join("; "),
      isPercussion: percussion,
      effectiveStaveProfile: percussion ? "Default" : "Tab",
    };
  };

  const scheduleRenderTimeout = (sessionToken: number, timedOutTrackIndex: number): void => {
    clearRenderTimeout();
    activeRenderTimeoutId = window.setTimeout(() => {
      if (sessionToken !== activeSessionToken || !rendererBusy) {
        return;
      }

      renderTimeoutHit = true;
      lastRendererErrorStage = "renderFinished-timeout";
      lastFailedRequestedTrackIndex = timedOutTrackIndex;
      rendererBusy = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      destroyActiveRenderer();
      if (currentRenderMode === "string-heavy-safe" || currentRenderMode === "percussion-heavy-safe") {
        currentRenderMode = "fallback";
        renderFallbackMessage(container, "This track is too heavy to render safely right now.");
      } else {
        clearRenderHost(container);
      }
      emitDebugInfo();
      hooks.onRenderError(`Track ${timedOutTrackIndex + 1} timed out while rendering.`);

      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        void switchTrackByReload(queuedTrackIndex);
      }
    }, RENDER_TIMEOUT_MS);
  };

  const switchTrackByReload = async (nextTrackIndex: number): Promise<void> => {
    requestedTrackIndex = nextTrackIndex;
    const renderPlan = buildRenderPlan(nextTrackIndex);
    currentRenderMode = renderPlan.mode;
    heavyTrackDetected = renderPlan.heavyTrackDetected;
    heavyTrackReason = renderPlan.heavyTrackReason;
    isPercussionTrack = renderPlan.isPercussion;
    effectiveStaveProfile = renderPlan.effectiveStaveProfile;

    if (rendererBusy) {
      pendingRequestedTrackIndex = nextTrackIndex;
      emitDebugInfo();
      return;
    }

    rendererBusy = true;
    pendingRequestedTrackIndex = null;
    renderCycleCounter += 1;
    lastRenderStartedAtIso = new Date().toISOString();
    lastRenderFinishedAtIso = null;
    renderTimeoutHit = false;
    lastRendererErrorStage = "renderer-rebuild-start";
    setPlaybackCapabilityMessage(null);
    resetPlaybackRuntimeInfo();
    emitDebugInfo();

    const sessionToken = activeSessionToken + 1;
    activeSessionToken = sessionToken;
    pendingScrollSnapshot = captureRenderViewportScroll();

    destroyActiveRenderer();
    clearRenderHost(container);
    await waitForAnimationFrame();

    if (sessionToken !== activeSessionToken) {
      rendererBusy = false;
      clearRenderTimeout();
      emitDebugInfo();
      return;
    }

    const api = createAlphaTabApi(container, renderPlan, zoomPercent);
    activeApi = api;
    const playbackAvailable = !renderPlan.isPercussion && isPlaybackApiAvailable(api);
    if (renderPlan.isPercussion) {
      setPlaybackCapabilityMessage("Playback is not enabled for percussion tracks yet.");
    } else if (!playbackAvailable) {
      setPlaybackCapabilityMessage("Playback is unavailable in this runtime.");
    } else {
      setPlaybackCapabilityMessage(null);
    }

    if (playbackAvailable) {
      api.playerStateChanged?.on((statePayload) => {
        if (sessionToken !== activeSessionToken) {
          return;
        }

        if (!hasLoggedPlayerStatePayloadShape) {
          hasLoggedPlayerStatePayloadShape = true;
          console.info("[songStep] alphaTab playerStateChanged payload shape:", describePayloadShape(statePayload));
        }

        const normalizedState = normalizePlaybackState(statePayload);
        const playerStatePayloadShape = describePayloadShape(statePayload);
        if (normalizedState === "playing") {
          playbackScrollLockSnapshot = captureRenderViewportScroll();
        }
        if (normalizedState === "paused" || normalizedState === "stopped") {
          playbackScrollLockSnapshot = null;
        }
        playbackRuntimeInfo = {
          ...playbackRuntimeInfo,
          isPlaying:
            normalizedState === null
              ? playbackRuntimeInfo.isPlaying
              : normalizedState === "playing"
                ? true
                : false,
          playerStatePayloadShape,
        };
        emitPlaybackRuntimeInfo();
      });

      api.playerPositionChanged?.on((positionPayload) => {
        if (sessionToken !== activeSessionToken) {
          return;
        }

        if (!hasLoggedPlayerPositionPayloadShape) {
          hasLoggedPlayerPositionPayloadShape = true;
          console.info("[songStep] alphaTab playerPositionChanged payload shape:", describePayloadShape(positionPayload));
        }
        const currentTick = extractCurrentTickFromPositionPayload(positionPayload);
        const currentBarFromTick =
          currentTick === null
            ? {
                currentBar: null,
                currentBarStartTick: null,
                currentBarEndTickExclusive: null,
                sourcePath: "tickLookup:no-currentTick",
              }
            : resolveCurrentBarFromTick(currentTick);
        const playerPositionPayloadShape = describePayloadShape(positionPayload);
        if (playbackScrollLockSnapshot) {
          restoreRenderViewportScroll(playbackScrollLockSnapshot);
        }

        playbackRuntimeInfo = {
          ...playbackRuntimeInfo,
          positionLabel: extractPositionLabelFromPayload(positionPayload),
          currentTick,
          currentBar: currentBarFromTick.currentBar,
          currentBarStartTick: currentBarFromTick.currentBarStartTick,
          currentBarEndTickExclusive: currentBarFromTick.currentBarEndTickExclusive,
          currentBarSourcePath: currentBarFromTick.sourcePath,
          playerPositionPayloadShape,
        };
        emitPlaybackRuntimeInfo();
      });
    }

    api.scoreLoaded.on((score) => {
      if (sessionToken !== activeSessionToken) {
        return;
      }

      applyTrackNamePolicies(score);
      buildTickToBarRanges(score);
      lastLoadedScoreTracks = score.tracks ?? [];
      lastKnownMasterBarCount = score.masterBars?.length ?? lastKnownMasterBarCount;
      scoreRuntimeInfo = {
        scoreTitle: score.title?.trim() || null,
        totalBars: score.masterBars?.length ?? null,
        tempoBpm: extractTempoBpm(score),
      };
      lastRendererErrorStage = "load";
      hooks.onTracksLoaded(toTrackInfoList(lastLoadedScoreTracks));
      emitScoreRuntimeInfo();
      hooks.onScoreOverviewRuntimeInfo(toScoreOverviewRuntimeInfo(score));
      playbackRuntimeInfo = {
        ...playbackRuntimeInfo,
        currentBarSourcePath: tickLookupSourcePath ? `tickLookup:${tickLookupSourcePath}` : null,
      };
      emitPlaybackRuntimeInfo();
      emitDebugInfo();
    });

    api.renderStarted?.on(() => {
      if (sessionToken !== activeSessionToken) {
        return;
      }

      const renderedTrack = api.tracks?.[0];
      if (renderedTrack) {
        confirmedActiveTrackIndex = renderedTrack.index;
        lastSuccessfulConfirmedTrackIndex = renderedTrack.index;
        hooks.onActiveTrackConfirmed(renderedTrack.index);
      }

      lastRendererErrorStage = "renderStarted";
      emitDebugInfo();
    });

    api.renderFinished?.on(() => {
      if (sessionToken !== activeSessionToken) {
        return;
      }

      clearRenderTimeout();
      rendererBusy = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      lastRendererErrorStage = "renderFinished";
      if (pendingScrollSnapshot) {
        restoreRenderViewportScroll(pendingScrollSnapshot);
        pendingScrollSnapshot = null;
      }
      emitDebugInfo();

      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        void switchTrackByReload(queuedTrackIndex);
      }
    });

    api.error?.on(() => {
      if (sessionToken !== activeSessionToken) {
        return;
      }

      clearRenderTimeout();
      lastRendererErrorStage = "error-event";
      lastFailedRequestedTrackIndex = nextTrackIndex;
      rendererBusy = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      destroyActiveRenderer();
      if (currentRenderMode === "string-heavy-safe" || currentRenderMode === "percussion-heavy-safe") {
        currentRenderMode = "fallback";
        renderFallbackMessage(container, "This track is too heavy to render safely right now.");
      } else {
        clearRenderHost(container);
      }
      hooks.onRenderError("alphaTab failed to render this GP file.");
      emitDebugInfo();

      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        void switchTrackByReload(queuedTrackIndex);
      }
    });

    lastRendererErrorStage = "load-start";
    const loadWasStarted = api.load(sourceBytes, [nextTrackIndex]);
    if (!loadWasStarted) {
      clearRenderTimeout();
      lastRendererErrorStage = "load";
      lastFailedRequestedTrackIndex = nextTrackIndex;
      rendererBusy = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      destroyActiveRenderer();
      if (currentRenderMode === "string-heavy-safe" || currentRenderMode === "percussion-heavy-safe") {
        currentRenderMode = "fallback";
        renderFallbackMessage(container, "This track is too heavy to render safely right now.");
      } else {
        clearRenderHost(container);
      }
      emitDebugInfo();
      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        void switchTrackByReload(queuedTrackIndex);
      }
      throw new Error("GP renderer rejected the source data.");
    }

    scheduleRenderTimeout(sessionToken, nextTrackIndex);
    emitDebugInfo();
  };

  await switchTrackByReload(selectedTrackIndex);

  return {
    selectTrack: (trackIndex: number) => {
      void switchTrackByReload(trackIndex).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not switch GP track.";
        hooks.onRenderError(message);
      });
    },
    setZoom: (nextZoomPercent: number) => {
      const normalizedZoom = Math.max(50, Math.min(200, Math.round(nextZoomPercent)));
      if (normalizedZoom === zoomPercent) {
        return;
      }
      zoomPercent = normalizedZoom;
      void switchTrackByReload(confirmedActiveTrackIndex).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not apply GP zoom.";
        hooks.onRenderError(message);
      });
    },
    play: () => {
      if (isPercussionTrack) {
        hooks.onRuntimeNotice("Playback is not enabled for percussion tracks yet.");
        return;
      }

      if (!activeApi || !isPlaybackApiAvailable(activeApi)) {
        hooks.onRuntimeNotice(playbackCapabilityMessage ?? "Playback is unavailable in this runtime.");
        return;
      }

      playbackScrollLockSnapshot = captureRenderViewportScroll();
      const playbackApi = activeApi as AlphaTabApi & { play: () => void };
      playbackApi.play();
    },
    pause: () => {
      if (isPercussionTrack) {
        hooks.onRuntimeNotice("Playback is not enabled for percussion tracks yet.");
        return;
      }

      if (!activeApi || !isPlaybackApiAvailable(activeApi)) {
        hooks.onRuntimeNotice(playbackCapabilityMessage ?? "Playback is unavailable in this runtime.");
        return;
      }

      playbackScrollLockSnapshot = null;
      const playbackApi = activeApi as AlphaTabApi & { pause: () => void };
      playbackApi.pause();
    },
    stop: () => {
      if (isPercussionTrack) {
        hooks.onRuntimeNotice("Playback is not enabled for percussion tracks yet.");
        return;
      }

      if (!activeApi || !isPlaybackApiAvailable(activeApi)) {
        hooks.onRuntimeNotice(playbackCapabilityMessage ?? "Playback is unavailable in this runtime.");
        return;
      }

      playbackScrollLockSnapshot = null;
      const playbackApi = activeApi as AlphaTabApi & { stop: () => void };
      playbackApi.stop();
    },
    destroy: () => {
      activeSessionToken += 1;
      clearRenderTimeout();
      rendererBusy = false;
      pendingRequestedTrackIndex = null;
      playbackScrollLockSnapshot = null;
      destroyActiveRenderer();
      clearRenderHost(container);
    },
  };
}
