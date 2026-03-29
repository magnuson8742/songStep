import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  score?: AlphaTabScore;
  tracks?: AlphaTabTrack[];
  play?: () => boolean;
  pause?: () => void;
  stop?: () => void;
  destroy?: () => void;
  settings?: {
    display?: {
      scale?: number;
    };
    player?: Record<string, unknown>;
  };
  updateSettings?: () => void;
  render?: () => void;
  postRenderFinished?: {
    on: (handler: () => void) => void;
  };
  playerReady?: {
    on: (handler: () => void) => void;
  };
  isReadyForPlayback?: boolean;
  playerState?: number | string | null;
  tickPosition?: number;
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
  start?: number;
  startTick?: number;
  tick?: number;
  playbackStart?: number;
  absoluteStart?: number;
  startPosition?: {
    tick?: number;
  };
  notes?: AlphaTabNote[];
}

interface AlphaTabNote {
  start?: number;
  startTick?: number;
  tick?: number;
  playbackStart?: number;
  absoluteStart?: number;
  startPosition?: {
    tick?: number;
  };
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
  runtimeTrackPosition: number;
  isPercussion: boolean;
  totalBars: number;
  totalNotes: number;
  firstNonEmptyBarIndex: number | null;
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
  barBoundsExtraction: {
    discoveredSystemCount: number;
    discoveredBarCollectionCount: number;
    discoveredBarRectCount: number;
    usedLayoutPaths: string[];
    usedBarCollectionPaths: string[];
    rootCandidateSummaries?: Array<{
      rootPath: string;
      keys: string[];
      childObjectKeys: string[];
      arrayLikeChildren: Array<{ key: string; length: number }>;
      objectLikeChildren: Array<{ key: string; keys: string[] }>;
    }>;
    systemSummaries?: Array<{
      rowIndex: number;
      systemKeys: string[];
      structuralCollectionCandidates: Array<{ key: string; length: number }>;
    }>;
    barItemSummaries?: Array<{
      systemIndex: number;
      barIndexInSystem: number;
      keys: string[];
      nestedObjectKeys: string[];
      numericFields: string[];
      objectFieldKeys: Array<{ key: string; keys: string[] }>;
    }>;
    chosenLayoutFamily?: string;
    familyRectCounts?: Array<{ sourcePath: string; rectCount: number; barCount: number }>;
    calibrationSummary?: {
      calibrationModeX: "local-to-system" | "absolute";
      calibrationModeY: "local-to-system" | "absolute";
      systemOriginX: number | null;
      systemOriginY: number | null;
      firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
      firstBarCalibratedRect: { x: number; y: number; w: number; h: number } | null;
    } | null;
    transformSummary?: {
      coordinateSpaceMode: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
      svgViewBox: { x: number; y: number; width: number; height: number } | null;
      svgClientRect: { width: number; height: number } | null;
      transformScaleX: number;
      transformScaleY: number;
      transformOffsetX: number;
      transformOffsetY: number;
      firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
      firstBarFinalRect: { x: number; y: number; w: number; h: number } | null;
    } | null;
  } | null;
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
  onRenderLifecycle: (event: Record<string, unknown>) => void;
  onActiveTrackConfirmed: (trackIndex: number) => void;
  onTrackRenderCommitted: (trackIndex: number) => void;
  onProgrammaticSeekConfirmed: (trackIndex: number, tick: number) => void;
  onScoreRuntimeInfo: (info: GpScoreRuntimeInfo) => void;
  onScoreOverviewRuntimeInfo: (info: GpScoreOverviewRuntimeInfo) => void;
  onPlaybackRuntimeInfo: (info: GpPlaybackRuntimeInfo) => void;
  onRuntimeNotice: (message: string) => void;
  onRenderError: (payload: { message: string; details: Record<string, unknown> }) => void;
}

export interface GpRendererController {
  selectTrack: (trackIndex: number, targetTick?: number | null) => void;
  setZoom: (zoomPercent: number) => void;
  seekToTick: (tick: number) => boolean;
  seekToBarStart: (barNumber: number) => number | null;
  resolveNearestTickInBar: (barNumber: number, progressInBar: number) => number | null;
  getBarTickRange: (barNumber: number) => { startTick: number; endTickExclusive: number | null } | null;
  getRenderedBarBounds: () => Array<{
    barNumber: number;
    startX: number;
    endX: number;
    y: number;
    height: number;
    rowIndex: number;
  }>;
  setPlaybackSpeedPercent: (speedPercent: number) => boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  destroy: () => void;
}

type RenderedBarBound = {
  barNumber: number;
  startX: number;
  endX: number;
  y: number;
  height: number;
  rowIndex: number;
};

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

interface InPlaceZoomPlaybackContext {
  token: number;
  wasPlaying: boolean;
  tick: number | null;
}

interface PendingProgrammaticSeek {
  tick: number;
  trackIndex: number;
  sessionToken: number;
  retryCount: number;
}

interface BarBoundsExtractionDiagnostics {
  discoveredSystemCount: number;
  discoveredBarCollectionCount: number;
  discoveredBarRectCount: number;
  usedLayoutPaths: string[];
  usedBarCollectionPaths: string[];
  rootCandidateSummaries?: Array<{
    rootPath: string;
    keys: string[];
    childObjectKeys: string[];
    arrayLikeChildren: Array<{ key: string; length: number }>;
    objectLikeChildren: Array<{ key: string; keys: string[] }>;
  }>;
  systemSummaries?: Array<{
    rowIndex: number;
    systemKeys: string[];
    structuralCollectionCandidates: Array<{ key: string; length: number }>;
  }>;
  barItemSummaries?: Array<{
    systemIndex: number;
    barIndexInSystem: number;
    keys: string[];
    nestedObjectKeys: string[];
    numericFields: string[];
    objectFieldKeys: Array<{ key: string; keys: string[] }>;
  }>;
  chosenLayoutFamily?: string;
  familyRectCounts?: Array<{ sourcePath: string; rectCount: number; barCount: number }>;
  calibrationSummary?: {
    calibrationModeX: "local-to-system" | "absolute";
    calibrationModeY: "local-to-system" | "absolute";
    systemOriginX: number | null;
    systemOriginY: number | null;
    firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
    firstBarCalibratedRect: { x: number; y: number; w: number; h: number } | null;
  } | null;
  transformSummary?: {
    coordinateSpaceMode: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
    svgViewBox: { x: number; y: number; width: number; height: number } | null;
    svgClientRect: { width: number; height: number } | null;
    transformScaleX: number;
    transformScaleY: number;
    transformOffsetX: number;
    transformOffsetY: number;
    firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
    firstBarFinalRect: { x: number; y: number; w: number; h: number } | null;
  } | null;
}

interface BarBoundsRootCandidateSummary {
  rootPath: string;
  keys: string[];
  childObjectKeys: string[];
  arrayLikeChildren: Array<{ key: string; length: number }>;
  objectLikeChildren: Array<{ key: string; keys: string[] }>;
}

interface BarBoundsSystemSummary {
  rowIndex: number;
  systemKeys: string[];
  structuralCollectionCandidates: Array<{ key: string; length: number }>;
}

interface ReloadOptions {
  targetTick?: number | null;
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
  return tracks.map((track, runtimeTrackPosition) => {
    const signature = computeTrackContentSignature(track, 0);
    return {
      index: track.index,
      name: track.name || `Track ${track.index + 1}`,
      runtimeTrackPosition,
      isPercussion: track.isPercussion === true || track.staves?.some((staff) => staff.isPercussion === true) === true,
      totalBars: signature.totalBars,
      totalNotes: signature.totalNotes,
      firstNonEmptyBarIndex: signature.firstNonEmptyBarIndex,
    };
  });
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
      enablePlayer: true,
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
  let renderedBarBounds: RenderedBarBound[] = [];
  let zoomPercent = Math.max(50, Math.min(200, initialZoomPercent));
  let playbackSpeedPercent = 100;
  let pendingZoomPercent: number | null = null;
  let zoomRerenderInFlight = false;
  let inPlaceZoomPlaybackContext: InPlaceZoomPlaybackContext | null = null;
  let inPlaceZoomTokenCounter = 0;
  let pendingProgrammaticSeek: PendingProgrammaticSeek | null = null;
  let pendingPlayAfterProgrammaticSeek = false;
  let renderAttemptCounter = 0;
  let activeRenderAttemptId: string | null = null;
  let lastBarBoundsExtractionDiagnostics: BarBoundsExtractionDiagnostics | null = null;

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
      barBoundsExtraction: lastBarBoundsExtractionDiagnostics,
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

  const summarizeError = (error: unknown): Record<string, unknown> => {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack ?? null,
      };
    }
    if (typeof error === "object" && error !== null) {
      const objectValue = error as Record<string, unknown>;
      return {
        shape: describePayloadShape(objectValue),
        keys: Object.keys(objectValue).slice(0, 20),
      };
    }
    return {
      shape: describePayloadShape(error),
      value: String(error),
    };
  };

  const emitRenderLifecycle = (type: string, extra: Record<string, unknown> = {}): void => {
    hooks.onRenderLifecycle({
      type,
      timestamp: new Date().toISOString(),
      attemptId: activeRenderAttemptId,
      requestedTrackIndex,
      confirmedActiveTrackIndex,
      renderMode: currentRenderMode,
      isPercussion: isPercussionTrack,
      effectiveStaveProfile,
      ...extra,
    });
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
      if (statePayload === 1) {
        return "playing";
      }
      if (statePayload === 0) {
        return "paused";
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

  const applyZoomByRerenderingActiveApi = (nextZoomPercent: number): boolean => {
    if (!activeApi) {
      return false;
    }
    const api = activeApi;
    if (typeof api.updateSettings !== "function" || typeof api.render !== "function") {
      return false;
    }

    const renderedTrack = api.tracks?.[0];
    if (renderedTrack && renderedTrack.index !== confirmedActiveTrackIndex) {
      return false;
    }

    if (rendererBusy || zoomRerenderInFlight) {
      pendingZoomPercent = nextZoomPercent;
      return true;
    }

    if (!inPlaceZoomPlaybackContext) {
      const wasPlayingBeforeZoom =
        typeof api.playerState === "number" ? api.playerState === 1 : normalizePlaybackState(api.playerState) === "playing";
      inPlaceZoomPlaybackContext = {
        token: (inPlaceZoomTokenCounter += 1),
        wasPlaying: wasPlayingBeforeZoom,
        tick: typeof api.tickPosition === "number" ? api.tickPosition : playbackRuntimeInfo.currentTick,
      };
    }

    if (!api.settings) {
      api.settings = {};
    }
    if (!api.settings.display) {
      api.settings.display = {};
    }
    api.settings.display.scale = nextZoomPercent / 100;

    pendingScrollSnapshot = captureRenderViewportScroll();
    rendererBusy = true;
    zoomRerenderInFlight = true;
    renderCycleCounter += 1;
    lastRenderStartedAtIso = new Date().toISOString();
    lastRenderFinishedAtIso = null;
    renderTimeoutHit = false;
    lastRendererErrorStage = "zoom-rerender";
    scheduleRenderTimeout(activeSessionToken, confirmedActiveTrackIndex);
    emitDebugInfo();

    try {
      api.updateSettings();
      api.render();
    } catch (error: unknown) {
      clearRenderTimeout();
      rendererBusy = false;
      zoomRerenderInFlight = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      lastRendererErrorStage = "zoom-rerender-error";
      pendingScrollSnapshot = null;
      inPlaceZoomPlaybackContext = null;
      emitDebugInfo();
      hooks.onRenderError({
        message: error instanceof Error ? error.message : "Could not apply GP zoom.",
        details: {
          stage: "zoom-rerender-error",
          error: summarizeError(error),
          renderCycleCounter,
          lastRendererErrorStage,
        },
      });
    }

    return true;
  };

  const applyPlaybackSpeedPercentToApi = (api: AlphaTabApi, nextSpeedPercent: number): boolean => {
    const speedRatio = Math.max(0.05, nextSpeedPercent / 100);
    const unsafeApi = api as AlphaTabApi & {
      player?: Record<string, unknown>;
      playbackSpeed?: number;
      playbackRate?: number;
      speed?: number;
    };
    let speedApplied = false;

    if (typeof unsafeApi.playbackSpeed === "number") {
      unsafeApi.playbackSpeed = speedRatio;
      speedApplied = true;
    }
    if (typeof unsafeApi.playbackRate === "number") {
      unsafeApi.playbackRate = speedRatio;
      speedApplied = true;
    }
    if (typeof unsafeApi.speed === "number") {
      unsafeApi.speed = speedRatio;
      speedApplied = true;
    }

    const unsafePlayer = unsafeApi.player;
    if (unsafePlayer) {
      if (typeof unsafePlayer.playbackSpeed === "number") {
        unsafePlayer.playbackSpeed = speedRatio;
        speedApplied = true;
      }
      if (typeof unsafePlayer.playbackRate === "number") {
        unsafePlayer.playbackRate = speedRatio;
        speedApplied = true;
      }
      if (typeof unsafePlayer.speed === "number") {
        unsafePlayer.speed = speedRatio;
        speedApplied = true;
      }
    }

    const settingsPlayer = unsafeApi.settings?.player;
    if (settingsPlayer) {
      if (typeof settingsPlayer.playbackSpeed === "number") {
        settingsPlayer.playbackSpeed = speedRatio;
        speedApplied = true;
      }
      if (typeof settingsPlayer.playbackRate === "number") {
        settingsPlayer.playbackRate = speedRatio;
        speedApplied = true;
      }
      if (typeof settingsPlayer.speed === "number") {
        settingsPlayer.speed = speedRatio;
        speedApplied = true;
      }
    }

    if (speedApplied && typeof api.updateSettings === "function") {
      try {
        api.updateSettings();
      } catch {
        return false;
      }
    }

    return speedApplied;
  };

  const extractRenderedBarBoundsFromApi = (api: AlphaTabApi, totalBars: number | null): RenderedBarBound[] => {
    const unsafeApi = api as AlphaTabApi & {
      renderer?: Record<string, unknown>;
      boundsLookup?: Record<string, unknown>;
    };
    const apiUnsafeRecord = unsafeApi as unknown as Record<string, unknown>;

    const readPath = (root: unknown, path: string): unknown => {
      if (!root || typeof root !== "object") {
        return null;
      }
      const segments = path.split(".");
      let current: unknown = root;
      for (const segment of segments) {
        if (!current || typeof current !== "object") {
          return null;
        }
        current = (current as Record<string, unknown>)[segment];
      }
      return current;
    };

    const readNumberPath = (root: unknown, paths: string[]): number | null => {
      for (const path of paths) {
        const value = readPath(root, path);
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
      }
      return null;
    };

    const toRect = (source: unknown): { x: number; y: number; width: number; height: number } | null => {
      if (!source || typeof source !== "object") {
        return null;
      }
      const unsafeSource = source as Record<string, unknown>;
      const x =
        typeof unsafeSource.x === "number"
          ? unsafeSource.x
          : typeof unsafeSource.left === "number"
            ? unsafeSource.left
            : null;
      const y =
        typeof unsafeSource.y === "number"
          ? unsafeSource.y
          : typeof unsafeSource.top === "number"
            ? unsafeSource.top
            : null;
      const width =
        typeof unsafeSource.w === "number"
          ? unsafeSource.w
          : typeof unsafeSource.width === "number"
            ? unsafeSource.width
            : typeof unsafeSource.right === "number" && x !== null
              ? unsafeSource.right - x
              : null;
      const height =
        typeof unsafeSource.h === "number"
          ? unsafeSource.h
          : typeof unsafeSource.height === "number"
            ? unsafeSource.height
            : typeof unsafeSource.bottom === "number" && y !== null
              ? unsafeSource.bottom - y
              : null;
      if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
        return null;
      }
      return { x, y, width, height };
    };

    const rendererRootEntries: Array<{ rootPath: string; value: unknown }> = [
      { rootPath: "api.renderer._instance", value: readPath(unsafeApi.renderer, "_instance") },
      { rootPath: "api.renderer._currentRenderEngine", value: readPath(unsafeApi.renderer, "_currentRenderEngine") },
      { rootPath: "api.renderer.layout", value: readPath(unsafeApi.renderer, "layout") },
      { rootPath: "api.renderer.boundsLookup", value: readPath(unsafeApi.renderer, "boundsLookup") },
      { rootPath: "api.renderer._instance._currentRenderEngine", value: readPath(unsafeApi.renderer, "_instance._currentRenderEngine") },
      { rootPath: "api.renderer._instance.layout", value: readPath(unsafeApi.renderer, "_instance.layout") },
      { rootPath: "api.renderer._instance.boundsLookup", value: readPath(unsafeApi.renderer, "_instance.boundsLookup") },
      { rootPath: "api.renderer._currentRenderEngine.layout", value: readPath(unsafeApi.renderer, "_currentRenderEngine.layout") },
      { rootPath: "api.renderer", value: unsafeApi.renderer },
      { rootPath: "api._instance", value: apiUnsafeRecord._instance },
      { rootPath: "api._currentRenderEngine", value: apiUnsafeRecord._currentRenderEngine },
      { rootPath: "api.renderEngine", value: apiUnsafeRecord.renderEngine },
      { rootPath: "api.scoreRenderer", value: apiUnsafeRecord.scoreRenderer },
    ];

    const systemPathCandidates = [
      "layout.systems",
      "systems",
      "staffSystems",
      "staveSystems",
      "renderedSystems",
      "systemLayouts",
      "staffSystemLayouts",
      "staveGroupLayouts",
      "lineGroups",
      "rows",
      "staffLines",
      "staveGroups",
      "layoutSystems",
      "renderSystems",
    ];

    const barCollectionPathCandidates = [
      "masterBarRenderers",
      "barRenderers",
      "barLayouts",
      "bars",
      "masterBars",
      "barBounds",
      "layoutBars",
      "renderedBars",
    ];

    const barRectPathCandidates = [
      "bounds",
      "visualBounds",
      "actualBounds",
      "barBounds",
      "layout.bounds",
      "barLayout.bounds",
      "layoutBounds",
      "rect",
      "area",
      "frame",
    ];
    const directBarRectFieldCandidates = [
      "bounds",
      "visualBounds",
      "actualBounds",
      "layoutBounds",
      "barBounds",
      "realBounds",
      "drawingBounds",
      "contentBounds",
      "rect",
      "area",
      "frame",
    ];
    const immediateStructuralBarChildren = ["layout", "renderer", "barRenderer", "masterBar", "bar", "barLayout"];

    const barIndexPathCandidates = [
      "masterBar.index",
      "bar.masterBar.index",
      "bar.index",
      "masterBarIndex",
      "barIndex",
    ];

    const systemEntries: Array<{ system: Record<string, unknown>; systemOrder: number }> = [];
    const usedLayoutPaths = new Set<string>();
    const summarizeRoot = (rootPath: string, rootValue: unknown): BarBoundsRootCandidateSummary | null => {
      if (!rootValue || typeof rootValue !== "object") {
        return null;
      }
      const rootObject = rootValue as Record<string, unknown>;
      const keys = Object.keys(rootObject).slice(0, 20);
      const arrayLikeChildren = keys
        .map((key) => ({ key, value: rootObject[key] }))
        .filter((entry) => Array.isArray(entry.value))
        .slice(0, 10)
        .map((entry) => ({
          key: entry.key,
          length: (entry.value as unknown[]).length,
        }));
      const objectLikeChildren = keys
        .map((key) => ({ key, value: rootObject[key] }))
        .filter((entry) => !!entry.value && typeof entry.value === "object" && !Array.isArray(entry.value))
        .slice(0, 8)
        .map((entry) => ({
          key: entry.key,
          keys: Object.keys(entry.value as Record<string, unknown>).slice(0, 12),
        }));
      const childObjectKeys = objectLikeChildren.flatMap((entry) => entry.keys).slice(0, 24);
      return {
        rootPath,
        keys,
        childObjectKeys,
        arrayLikeChildren,
        objectLikeChildren,
      };
    };
    const pushSystemEntry = (system: unknown): void => {
      if (!system || typeof system !== "object") {
        return;
      }
      const systemObject = system as Record<string, unknown>;
      const systemOrder =
        readNumberPath(systemObject, ["index", "systemIndex", "order"]) ??
        readNumberPath(systemObject, ["layout.index", "layout.systemIndex"]) ??
        systemEntries.length;
      systemEntries.push({
        system: systemObject,
        systemOrder: Math.max(0, Math.round(systemOrder)),
      });
    };

    rendererRootEntries.forEach(({ rootPath, value: root }) => {
      systemPathCandidates.forEach((path) => {
        const candidateSystems = readPath(root, path);
        if (Array.isArray(candidateSystems)) {
          usedLayoutPaths.add(`${rootPath}.${path}`);
          candidateSystems.forEach((system) => pushSystemEntry(system));
        }
      });
    });

    const dedupedSystems = new Map<object, { system: Record<string, unknown>; systemOrder: number }>();
    systemEntries.forEach((entry) => {
      if (!dedupedSystems.has(entry.system)) {
        dedupedSystems.set(entry.system, entry);
      }
    });

    let candidateRects: RenderedBarBound[] = [];
    let discoveredBarCollectionCount = 0;
    const usedBarCollectionPaths = new Set<string>();
    const systemSummaries: BarBoundsSystemSummary[] = [];
    const barItemSummaries: Array<{
      systemIndex: number;
      barIndexInSystem: number;
      keys: string[];
      nestedObjectKeys: string[];
      numericFields: string[];
      objectFieldKeys: Array<{ key: string; keys: string[] }>;
    }> = [];
    const summarizeBarItem = (systemIndex: number, barIndexInSystem: number, barItem: Record<string, unknown>): void => {
      if (barItemSummaries.length >= 5) {
        return;
      }
      const keys = Object.keys(barItem).slice(0, 20);
      const numericFields = keys.filter((key) => typeof barItem[key] === "number").slice(0, 12);
      const objectFieldKeys = keys
        .map((key) => ({ key, value: barItem[key] }))
        .filter((entry) => !!entry.value && typeof entry.value === "object" && !Array.isArray(entry.value))
        .slice(0, 8)
        .map((entry) => ({
          key: entry.key,
          keys: Object.keys(entry.value as Record<string, unknown>).slice(0, 12),
        }));
      barItemSummaries.push({
        systemIndex,
        barIndexInSystem,
        keys,
        nestedObjectKeys: objectFieldKeys.flatMap((entry) => entry.keys).slice(0, 20),
        numericFields,
        objectFieldKeys,
      });
    };
    const extractRectFromBarItem = (barItem: Record<string, unknown>): { x: number; y: number; width: number; height: number } | null => {
      const fromDirect = toRect(barItem);
      if (fromDirect) {
        return fromDirect;
      }
      for (const key of directBarRectFieldCandidates) {
        const fromField = toRect(barItem[key]);
        if (fromField) {
          return fromField;
        }
      }
      for (const childKey of immediateStructuralBarChildren) {
        const child = barItem[childKey];
        if (!child || typeof child !== "object") {
          continue;
        }
        const childRecord = child as Record<string, unknown>;
        const childDirect = toRect(childRecord);
        if (childDirect) {
          return childDirect;
        }
        for (const key of directBarRectFieldCandidates) {
          const fromChildField = toRect(childRecord[key]);
          if (fromChildField) {
            return fromChildField;
          }
        }
      }
      return null;
    };
    const toXywhRect = (value: unknown): { x: number; y: number; w: number; h: number } | null => {
      if (!value || typeof value !== "object") {
        return null;
      }
      const record = value as Record<string, unknown>;
      const x = typeof record.x === "number" ? record.x : null;
      const y = typeof record.y === "number" ? record.y : null;
      const w = typeof record.w === "number" ? record.w : null;
      const h = typeof record.h === "number" ? record.h : null;
      if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) {
        return null;
      }
      return { x, y, w, h };
    };
    const directStaffSystemEntries: Array<{ sourcePath: string; systems: unknown[] }> = [];
    const directStaffSystemPaths = [
      "renderer.boundsLookup.staffSystems",
      "renderer._instance.boundsLookup.staffSystems",
    ];
    directStaffSystemPaths.forEach((path) => {
      const systems = readPath(unsafeApi, path);
      if (Array.isArray(systems)) {
        directStaffSystemEntries.push({ sourcePath: `api.${path}`, systems });
      }
    });
    const familyResults: Array<{
      sourcePath: string;
      rects: RenderedBarBound[];
      calibrationSummary: BarBoundsExtractionDiagnostics["calibrationSummary"];
    }> = [];
    directStaffSystemEntries.forEach(({ sourcePath, systems }) => {
      usedLayoutPaths.add(sourcePath);
      const familyRects: RenderedBarBound[] = [];
      let familyCalibrationSummary: BarBoundsExtractionDiagnostics["calibrationSummary"] = null;
      systems.forEach((systemItem, systemIndex) => {
        if (!systemItem || typeof systemItem !== "object") {
          return;
        }
        const systemRecord = systemItem as Record<string, unknown>;
        const bars = Array.isArray(systemRecord.bars) ? (systemRecord.bars as unknown[]) : [];
        if (bars.length === 0) {
          return;
        }
        discoveredBarCollectionCount += 1;
        usedBarCollectionPaths.add("bars");
        const systemBoundsContainer =
          (systemRecord.staffSystemBounds as Record<string, unknown> | undefined) ??
          (systemRecord.bounds as Record<string, unknown> | undefined) ??
          null;
        const systemVerticalBounds =
          toXywhRect(systemBoundsContainer?.visualBounds) ??
          toXywhRect(systemBoundsContainer?.realBounds) ??
          toXywhRect(systemBoundsContainer);

        const rawBarBounds = bars
          .map((barItem) => (barItem && typeof barItem === "object" ? (barItem as Record<string, unknown>) : null))
          .map((barRecord) =>
            barRecord
              ? toXywhRect(barRecord.lineAlignedBounds) ?? toXywhRect(barRecord.visualBounds) ?? toXywhRect(barRecord.realBounds)
              : null,
          )
          .filter((rect): rect is { x: number; y: number; w: number; h: number } => rect !== null);
        const absXInsideCount =
          systemVerticalBounds === null
            ? 0
            : rawBarBounds.filter(
                (bar) =>
                  bar.x >= systemVerticalBounds.x - 2 && bar.x + bar.w <= systemVerticalBounds.x + systemVerticalBounds.w + 2,
              ).length;
        const localXInsideCount =
          systemVerticalBounds === null
            ? 0
            : rawBarBounds.filter((bar) => bar.x >= -2 && bar.x + bar.w <= systemVerticalBounds.w + 2).length;
        const absYInsideCount =
          systemVerticalBounds === null
            ? 0
            : rawBarBounds.filter(
                (bar) =>
                  bar.y >= systemVerticalBounds.y - 2 && bar.y + bar.h <= systemVerticalBounds.y + systemVerticalBounds.h + 2,
              ).length;
        const localYInsideCount =
          systemVerticalBounds === null
            ? 0
            : rawBarBounds.filter((bar) => bar.y >= -2 && bar.y + bar.h <= systemVerticalBounds.h + 2).length;
        const calibrationModeX: "local-to-system" | "absolute" =
          systemVerticalBounds && localXInsideCount > absXInsideCount ? "local-to-system" : "absolute";
        const calibrationModeY: "local-to-system" | "absolute" =
          systemVerticalBounds && localYInsideCount > absYInsideCount ? "local-to-system" : "absolute";

        bars.forEach((barItem, barIndexInSystem) => {
          if (!barItem || typeof barItem !== "object") {
            return;
          }
          const barRecord = barItem as Record<string, unknown>;
          const barNumberRaw =
            typeof barRecord.index === "number"
              ? barRecord.index
              : readNumberPath(barRecord, ["masterBar.index", "bar.index", "masterBarIndex", "barIndex"]);
          if (barNumberRaw === null) {
            summarizeBarItem(systemIndex, barIndexInSystem, barRecord);
            return;
          }
          const barNumber = Math.round(barNumberRaw) + 1;
          if (barNumber <= 0 || (totalBars !== null && totalBars > 0 && barNumber > totalBars)) {
            return;
          }
          const barBounds =
            toXywhRect(barRecord.lineAlignedBounds) ?? toXywhRect(barRecord.visualBounds) ?? toXywhRect(barRecord.realBounds);
          if (!barBounds) {
            summarizeBarItem(systemIndex, barIndexInSystem, barRecord);
            return;
          }
          const calibratedX =
            systemVerticalBounds && calibrationModeX === "local-to-system" ? systemVerticalBounds.x + barBounds.x : barBounds.x;
          let calibratedY =
            systemVerticalBounds && calibrationModeY === "local-to-system" ? systemVerticalBounds.y + barBounds.y : barBounds.y;
          let calibratedH = barBounds.h;
          if (systemVerticalBounds) {
            const clippedTop = Math.max(calibratedY, systemVerticalBounds.y);
            const clippedBottom = Math.min(calibratedY + calibratedH, systemVerticalBounds.y + systemVerticalBounds.h);
            if (clippedBottom > clippedTop + 1) {
              calibratedY = clippedTop;
              calibratedH = clippedBottom - clippedTop;
            }
          }
          if (!familyCalibrationSummary) {
            familyCalibrationSummary = {
              calibrationModeX,
              calibrationModeY,
              systemOriginX: systemVerticalBounds?.x ?? null,
              systemOriginY: systemVerticalBounds?.y ?? null,
              firstBarRawRect: barBounds,
              firstBarCalibratedRect: {
                x: calibratedX,
                y: calibratedY,
                w: barBounds.w,
                h: calibratedH,
              },
            };
          }
          familyRects.push({
            barNumber,
            startX: calibratedX,
            endX: calibratedX + barBounds.w,
            y: calibratedY,
            height: calibratedH,
            rowIndex: systemIndex,
          });
        });
      });
      familyResults.push({ sourcePath, rects: familyRects, calibrationSummary: familyCalibrationSummary });
    });

    const familyRectCounts = familyResults.map((family) => ({
      sourcePath: family.sourcePath,
      rectCount: family.rects.length,
      barCount: new Set(family.rects.map((item) => item.barNumber)).size,
    }));
    const pickAuthoritativeFamily = ():
      | { sourcePath: string; rects: RenderedBarBound[]; calibrationSummary: BarBoundsExtractionDiagnostics["calibrationSummary"] }
      | null => {
      const prioritized = [...familyResults].sort((left, right) => {
        if (left.sourcePath === "api.renderer.boundsLookup.staffSystems") {
          return -1;
        }
        if (right.sourcePath === "api.renderer.boundsLookup.staffSystems") {
          return 1;
        }
        if (left.sourcePath === "api.renderer._instance.boundsLookup.staffSystems") {
          return -1;
        }
        if (right.sourcePath === "api.renderer._instance.boundsLookup.staffSystems") {
          return 1;
        }
        return 0;
      });
      for (const family of prioritized) {
        if (family.rects.length === 0) {
          continue;
        }
        const uniqueBars = Array.from(new Set(family.rects.map((item) => item.barNumber))).sort((a, b) => a - b);
        const contiguous = uniqueBars.every((bar, index) => bar === index + 1);
        const completeForScore = totalBars === null || totalBars <= 0 ? true : uniqueBars.length === totalBars;
        if (contiguous && completeForScore) {
          return family;
        }
      }
      return prioritized.find((family) => family.rects.length > 0) ?? null;
    };
    const authoritativeFamily = pickAuthoritativeFamily();
    if (authoritativeFamily) {
      candidateRects = authoritativeFamily.rects;
    }

    if (candidateRects.length === 0) {
      dedupedSystems.forEach((systemEntry) => {
      const { system, systemOrder } = systemEntry;
      const barItems: unknown[] = [];
      const structuralCollectionCandidates: Array<{ key: string; length: number }> = [];

      barCollectionPathCandidates.forEach((collectionPath) => {
        const maybeCollection = readPath(system, collectionPath);
        if (Array.isArray(maybeCollection)) {
          discoveredBarCollectionCount += 1;
          usedBarCollectionPaths.add(collectionPath);
          structuralCollectionCandidates.push({ key: collectionPath, length: maybeCollection.length });
          maybeCollection.forEach((item) => barItems.push(item));
        }
      });

      if (barItems.length === 0) {
        const nestedGroups = [
          readPath(system, "staveGroups"),
          readPath(system, "staffGroups"),
          readPath(system, "staves"),
          readPath(system, "staffSystems"),
        ].filter((group): group is unknown[] => Array.isArray(group));

        nestedGroups.forEach((group) => {
          group.forEach((entry) => {
            if (!entry || typeof entry !== "object") {
              return;
            }
            barCollectionPathCandidates.forEach((collectionPath) => {
              const maybeCollection = readPath(entry, collectionPath);
              if (Array.isArray(maybeCollection)) {
                discoveredBarCollectionCount += 1;
                usedBarCollectionPaths.add(`nested:${collectionPath}`);
                structuralCollectionCandidates.push({ key: `nested:${collectionPath}`, length: maybeCollection.length });
                maybeCollection.forEach((item) => barItems.push(item));
              }
            });
          });
        });
      }
      if (systemSummaries.length < 20) {
        systemSummaries.push({
          rowIndex: systemOrder,
          systemKeys: Object.keys(system).slice(0, 20),
          structuralCollectionCandidates: structuralCollectionCandidates.slice(0, 16),
        });
      }

      barItems.forEach((barItem, barIndexInSystem) => {
        if (!barItem || typeof barItem !== "object") {
          return;
        }
        const barItemObject = barItem as Record<string, unknown>;

        const barNumberRaw = readNumberPath(barItemObject, barIndexPathCandidates);
        if (barNumberRaw === null) {
          summarizeBarItem(systemOrder, barIndexInSystem, barItemObject);
          return;
        }
        const barNumber = Math.round(barNumberRaw) + 1;
        if (barNumber <= 0) {
          return;
        }
        if (totalBars !== null && totalBars > 0 && barNumber > totalBars) {
          return;
        }

        let rect: { x: number; y: number; width: number; height: number } | null = extractRectFromBarItem(barItemObject);
        if (!rect) {
          for (const rectPath of barRectPathCandidates) {
            rect = toRect(readPath(barItemObject, rectPath));
            if (rect) {
              break;
            }
          }
        }
        if (!rect) {
          summarizeBarItem(systemOrder, barIndexInSystem, barItemObject);
          return;
        }

        candidateRects.push({
          barNumber,
          startX: rect.x,
          endX: rect.x + rect.width,
          y: rect.y,
          height: rect.height,
          rowIndex: systemOrder,
        });
      });
      });
    }

    const firstRawRectForTransform =
      candidateRects.length > 0
        ? {
            x: candidateRects[0].startX,
            y: candidateRects[0].y,
            w: candidateRects[0].endX - candidateRects[0].startX,
            h: candidateRects[0].height,
          }
        : null;
    const renderSurfaceSvg = container.querySelector<SVGSVGElement>("svg");
    const hostRect = container.getBoundingClientRect();
    const svgRect = renderSurfaceSvg?.getBoundingClientRect() ?? null;
    const svgViewBox = renderSurfaceSvg?.viewBox?.baseVal ?? null;
    const hasValidViewBox = !!svgViewBox && svgViewBox.width > 0 && svgViewBox.height > 0;
    const offsetX = svgRect ? svgRect.left - hostRect.left + container.scrollLeft : 0;
    const offsetY = svgRect ? svgRect.top - hostRect.top + container.scrollTop : 0;
    const scaleX = hasValidViewBox && svgRect ? svgRect.width / svgViewBox.width : 1;
    const scaleY = hasValidViewBox && svgRect ? svgRect.height / svgViewBox.height : 1;
    const maxRawX = candidateRects.reduce((maxValue, rect) => Math.max(maxValue, rect.endX), 0);
    const maxRawY = candidateRects.reduce((maxValue, rect) => Math.max(maxValue, rect.y + rect.height), 0);
    const looksLikeViewBoxUnits =
      !!svgRect &&
      !!svgViewBox &&
      maxRawX <= svgViewBox.width * 1.2 &&
      maxRawY <= svgViewBox.height * 1.2 &&
      (Math.abs(svgViewBox.width - svgRect.width) > 4 || Math.abs(svgViewBox.height - svgRect.height) > 4);
    const looksLikeSvgPixelUnits =
      !!svgRect && maxRawX <= svgRect.width * 1.2 && maxRawY <= svgRect.height * 1.2 && !looksLikeViewBoxUnits;
    const coordinateSpaceMode: "host-local" | "svg-pixel-to-host" | "viewbox-to-host" = looksLikeViewBoxUnits
      ? "viewbox-to-host"
      : looksLikeSvgPixelUnits
        ? "svg-pixel-to-host"
        : "host-local";
    const transformedCandidateRects = candidateRects.map((rect) => {
      const width = Math.max(rect.endX - rect.startX, 1);
      if (coordinateSpaceMode === "viewbox-to-host" && svgViewBox) {
        const mappedX = offsetX + (rect.startX - svgViewBox.x) * scaleX;
        const mappedY = offsetY + (rect.y - svgViewBox.y) * scaleY;
        return {
          ...rect,
          startX: mappedX,
          endX: mappedX + width * scaleX,
          y: mappedY,
          height: rect.height * scaleY,
        };
      }
      if (coordinateSpaceMode === "svg-pixel-to-host") {
        return {
          ...rect,
          startX: offsetX + rect.startX,
          endX: offsetX + rect.endX,
          y: offsetY + rect.y,
          height: rect.height,
        };
      }
      return rect;
    });
    const firstFinalRectForTransform =
      transformedCandidateRects.length > 0
        ? {
            x: transformedCandidateRects[0].startX,
            y: transformedCandidateRects[0].y,
            w: transformedCandidateRects[0].endX - transformedCandidateRects[0].startX,
            h: transformedCandidateRects[0].height,
          }
        : null;
    candidateRects = transformedCandidateRects;

    const byBarNumber = new Map<number, RenderedBarBound>();
    candidateRects.forEach((candidate) => {
      const existing = byBarNumber.get(candidate.barNumber);
      if (!existing) {
        byBarNumber.set(candidate.barNumber, candidate);
        return;
      }
      const top = Math.min(existing.y, candidate.y);
      const bottom = Math.max(existing.y + existing.height, candidate.y + candidate.height);
      byBarNumber.set(candidate.barNumber, {
        barNumber: candidate.barNumber,
        startX: Math.min(existing.startX, candidate.startX),
        endX: Math.max(existing.endX, candidate.endX),
        y: top,
        height: Math.max(bottom - top, 12),
        rowIndex: Math.min(existing.rowIndex, candidate.rowIndex),
      });
    });

    const orderedBars = Array.from(byBarNumber.values()).sort((left, right) => left.barNumber - right.barNumber);
    const orderedRowIndices = Array.from(new Set(orderedBars.map((bar) => bar.rowIndex))).sort((left, right) => left - right);
    const normalizedRowMap = new Map<number, number>();
    orderedRowIndices.forEach((rowIndex, normalizedIndex) => normalizedRowMap.set(rowIndex, normalizedIndex));

    const normalizedBars = orderedBars
      .map((bar) => ({
        ...bar,
        rowIndex: normalizedRowMap.get(bar.rowIndex) ?? 0,
      }))
      .filter((bar) => bar.endX > bar.startX + 1 && bar.height > 0);

    const rootCandidateSummaries =
      dedupedSystems.size === 0 || candidateRects.length === 0
        ? rendererRootEntries
            .map(({ rootPath, value }) => summarizeRoot(rootPath, value))
            .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
            .slice(0, 16)
        : undefined;

    const targetedBranchSummaries =
      candidateRects.length === 0
        ? [
            { rootPath: "api.renderer._instance", value: readPath(unsafeApi.renderer, "_instance") },
            { rootPath: "api.renderer._currentRenderEngine", value: readPath(unsafeApi.renderer, "_currentRenderEngine") },
            { rootPath: "api.renderer.layout", value: readPath(unsafeApi.renderer, "layout") },
          ]
            .map(({ rootPath, value }) => summarizeRoot(rootPath, value))
            .filter((summary): summary is NonNullable<typeof summary> => summary !== null)
            .slice(0, 3)
        : undefined;

    lastBarBoundsExtractionDiagnostics = {
      discoveredSystemCount: dedupedSystems.size,
      discoveredBarCollectionCount,
      discoveredBarRectCount: candidateRects.length,
      usedLayoutPaths: Array.from(usedLayoutPaths),
      usedBarCollectionPaths: Array.from(usedBarCollectionPaths),
      rootCandidateSummaries: targetedBranchSummaries ?? rootCandidateSummaries,
      systemSummaries: dedupedSystems.size > 0 && discoveredBarCollectionCount === 0 ? systemSummaries : undefined,
      barItemSummaries:
        dedupedSystems.size > 0 && discoveredBarCollectionCount > 0 && candidateRects.length === 0 ? barItemSummaries : undefined,
      chosenLayoutFamily: authoritativeFamily?.sourcePath,
      familyRectCounts,
      calibrationSummary: authoritativeFamily?.calibrationSummary ?? null,
      transformSummary: {
        coordinateSpaceMode,
        svgViewBox: svgViewBox
          ? {
              x: svgViewBox.x,
              y: svgViewBox.y,
              width: svgViewBox.width,
              height: svgViewBox.height,
            }
          : null,
        svgClientRect: svgRect
          ? {
              width: svgRect.width,
              height: svgRect.height,
            }
          : null,
        transformScaleX: scaleX,
        transformScaleY: scaleY,
        transformOffsetX: offsetX,
        transformOffsetY: offsetY,
        firstBarRawRect: firstRawRectForTransform,
        firstBarFinalRect: firstFinalRectForTransform,
      },
    };

    return normalizedBars;
  };

  const getBarTickRange = (barNumber: number): { startTick: number; endTickExclusive: number | null } | null => {
    if (!Number.isFinite(barNumber) || barNumber <= 0) {
      return null;
    }
    const matchedRange = tickBarRanges.find((range) => range.barNumber === barNumber);
    if (!matchedRange) {
      return null;
    }

    return {
      startTick: matchedRange.startTick,
      endTickExclusive: Number.isFinite(matchedRange.endTickExclusive) ? matchedRange.endTickExclusive : null,
    };
  };

  const resolveBarStartTickForNavigation = (barNumber: number): number | null => {
    const tickRange = getBarTickRange(barNumber);
    if (tickRange) {
      return tickRange.startTick;
    }
    const score = activeApi?.score;
    if (!score) {
      return null;
    }
    return resolveBarStartTick(score, barNumber - 1).tick;
  };

  const resolveNearestTickInBarForNavigation = (barNumber: number, progressInBar: number): number | null => {
    const clampedProgress = Math.min(Math.max(progressInBar, 0), 1);
    const barStartTick = resolveBarStartTickForNavigation(barNumber);
    if (barStartTick === null) {
      return null;
    }

    const score = activeApi?.score;
    const activeTrackIndex = confirmedActiveTrackIndex;
    const activeTrack = score?.tracks?.find((track) => track.index === activeTrackIndex) ?? null;
    const bar = activeTrack?.staves?.[0]?.bars?.[barNumber - 1];
    const beatTickCandidates = (bar?.voices ?? []).flatMap((voice) =>
      (voice.beats ?? []).flatMap((beat) => {
        const beatPaths = ["startTick", "start", "tick", "playbackStart", "absoluteStart", "startPosition.tick"];
        const notePaths = ["startTick", "start", "tick", "playbackStart", "absoluteStart", "startPosition.tick"];
        const candidates: number[] = [];
        for (const path of beatPaths) {
          const tick = tryReadTickAtPath(beat, path);
          if (tick !== null) {
            candidates.push(tick);
            break;
          }
        }
        for (const note of beat.notes ?? []) {
          for (const path of notePaths) {
            const tick = tryReadTickAtPath(note, path);
            if (tick !== null) {
              candidates.push(tick);
              break;
            }
          }
        }

        return candidates;
      }),
    );

    const tickRange = getBarTickRange(barNumber);
    const targetTick =
      tickRange && tickRange.endTickExclusive !== null
        ? tickRange.startTick + (tickRange.endTickExclusive - tickRange.startTick) * clampedProgress
        : barStartTick;
    const barEndTickExclusive = tickRange?.endTickExclusive ?? Number.POSITIVE_INFINITY;
    let candidateTicks = Array.from(
      new Set<number>(
        [barStartTick, ...beatTickCandidates]
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
          .filter((value) => barEndTickExclusive > value && value >= barStartTick),
      ),
    ).sort((left, right) => left - right);

    if (candidateTicks.length <= 1 && tickRange && tickRange.endTickExclusive !== null) {
      const barEndTick = tickRange.endTickExclusive;
      const span = barEndTick - tickRange.startTick;
      if (span > 1) {
        const fallbackTicks = Array.from({ length: 9 }, (_, stepIndex) =>
          Math.round(tickRange.startTick + (span * stepIndex) / 8),
        ).filter((tick, stepIndex) => stepIndex > 0 && tick < barEndTick && tick >= barStartTick);
        candidateTicks = Array.from(new Set([barStartTick, ...fallbackTicks])).sort((left, right) => left - right);
      }
    }

    if (candidateTicks.length === 0) {
      return barStartTick;
    }

    const nearestTick = candidateTicks.reduce((bestTick, candidateTick) =>
      Math.abs(candidateTick - targetTick) < Math.abs(bestTick - targetTick) ? candidateTick : bestTick,
    );
    if (nearestTick === barStartTick && candidateTicks.length > 1 && clampedProgress > 0.12) {
      return candidateTicks[1] ?? nearestTick;
    }

    return nearestTick;
  };

  const seekToTick = (tick: number): boolean => {
    if (!activeApi || !Number.isFinite(tick)) {
      return false;
    }
    const api = activeApi;
    const unsafeApi = api as unknown as {
      seek?: (nextTick: number) => void;
      setPlaybackPosition?: (nextTick: number) => void;
      setPosition?: (nextTick: number) => void;
      player?: {
        seek?: (nextTick: number) => void;
        setPosition?: (nextTick: number) => void;
        tickPosition?: number;
      };
      tickPosition?: number;
    };

    let didApplyTick = false;
    if (typeof unsafeApi.seek === "function") {
      unsafeApi.seek(tick);
      didApplyTick = true;
    } else if (typeof unsafeApi.setPlaybackPosition === "function") {
      unsafeApi.setPlaybackPosition(tick);
      didApplyTick = true;
    } else if (typeof unsafeApi.setPosition === "function") {
      unsafeApi.setPosition(tick);
      didApplyTick = true;
    } else if (typeof unsafeApi.player?.seek === "function") {
      unsafeApi.player.seek(tick);
      didApplyTick = true;
    } else if (typeof unsafeApi.player?.setPosition === "function") {
      unsafeApi.player.setPosition(tick);
      didApplyTick = true;
    } else if (typeof unsafeApi.player?.tickPosition === "number") {
      unsafeApi.player.tickPosition = tick;
      didApplyTick = true;
    } else if (typeof unsafeApi.tickPosition === "number") {
      unsafeApi.tickPosition = tick;
      didApplyTick = true;
    }
    if (!didApplyTick) {
      return false;
    }
    pendingProgrammaticSeek = {
      tick,
      trackIndex: confirmedActiveTrackIndex,
      sessionToken: activeSessionToken,
      retryCount: 0,
    };

    const currentBarFromTick = resolveCurrentBarFromTick(tick);
    playbackRuntimeInfo = {
      ...playbackRuntimeInfo,
      currentTick: tick,
      currentBar: currentBarFromTick.currentBar,
      currentBarStartTick: currentBarFromTick.currentBarStartTick,
      currentBarEndTickExclusive: currentBarFromTick.currentBarEndTickExclusive,
      currentBarSourcePath: currentBarFromTick.sourcePath,
    };
    emitPlaybackRuntimeInfo();
    return true;
  };

  const isPercussionTrackFromRuntime = (track: AlphaTabTrack): boolean => {
    if (track.isPercussion === true) {
      return true;
    }

    if (track.staves?.some((staff) => staff.isPercussion === true)) {
      return true;
    }

    return false;
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
      zoomRerenderInFlight = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      destroyActiveRenderer();
      if (currentRenderMode === "string-heavy-safe" || currentRenderMode === "percussion-heavy-safe") {
        currentRenderMode = "fallback";
        renderFallbackMessage(container, "This track is too heavy to render safely right now.");
      } else {
        clearRenderHost(container);
      }
      emitDebugInfo();
      emitRenderLifecycle("render-error", {
        stage: "renderFinished-timeout",
        renderCycleCounter,
        lastRendererErrorStage,
        lastRenderStartedAtIso,
        lastRenderFinishedAtIso,
        renderTimeoutHit,
      });
      hooks.onRenderError({
        message: `Track ${timedOutTrackIndex + 1} timed out while rendering.`,
        details: {
          attemptId: activeRenderAttemptId,
          stage: "renderFinished-timeout",
          renderCycleCounter,
          lastRendererErrorStage,
          lastRenderStartedAtIso,
          lastRenderFinishedAtIso,
          renderTimeoutHit,
        },
      });

      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        void switchTrackByReload(queuedTrackIndex);
      }
    }, RENDER_TIMEOUT_MS);
  };

  const switchTrackByReload = async (nextTrackIndex: number, options?: ReloadOptions): Promise<void> => {
    inPlaceZoomPlaybackContext = null;
    pendingZoomPercent = null;
    pendingProgrammaticSeek = null;
    pendingPlayAfterProgrammaticSeek = false;
    requestedTrackIndex = nextTrackIndex;
    const renderPlan = buildRenderPlan(nextTrackIndex);
    currentRenderMode = renderPlan.mode;
    heavyTrackDetected = renderPlan.heavyTrackDetected;
    heavyTrackReason = renderPlan.heavyTrackReason;
    isPercussionTrack = renderPlan.isPercussion;
    effectiveStaveProfile = renderPlan.effectiveStaveProfile;
    renderAttemptCounter += 1;
    activeRenderAttemptId = `attempt-${renderAttemptCounter}-${Date.now()}`;
    const scoreTrack = lastLoadedScoreTracks.find((item) => item.index === nextTrackIndex);
    const scoreTrackSignature = scoreTrack
      ? computeTrackContentSignature(scoreTrack, lastKnownMasterBarCount)
      : { totalBars: 0, totalNotes: 0, firstNonEmptyBarIndex: null };
    emitRenderLifecycle("render-classification", {
      requestedTrackIndex: nextTrackIndex,
      resolvedTrackIndex: scoreTrack?.index ?? nextTrackIndex,
      resolvedTrackPosition: scoreTrack ? lastLoadedScoreTracks.findIndex((item) => item.index === scoreTrack.index) : null,
      confirmedActiveTrackIndex,
      trackName: scoreTrack?.name ?? null,
      renderMode: renderPlan.mode,
      isPercussion: renderPlan.isPercussion,
      effectiveStaveProfile: renderPlan.effectiveStaveProfile,
      heavyTrackDetected: renderPlan.heavyTrackDetected,
      heavyTrackReason: renderPlan.heavyTrackReason,
      classificationSource: scoreTrack
        ? {
            trackIsPercussionFlag: scoreTrack.isPercussion === true,
            staffPercussionFlags: (scoreTrack.staves ?? []).map((staff) => staff.isPercussion === true),
            totalBars: scoreTrackSignature.totalBars,
            totalNotes: scoreTrackSignature.totalNotes,
            firstNonEmptyBarIndex: scoreTrackSignature.firstNonEmptyBarIndex,
          }
        : { reason: "track-not-found-in-lastLoadedScoreTracks" },
    });

    if (rendererBusy) {
      pendingRequestedTrackIndex = nextTrackIndex;
      emitDebugInfo();
      return;
    }

    rendererBusy = true;
    zoomRerenderInFlight = false;
    pendingRequestedTrackIndex = null;
    renderCycleCounter += 1;
    lastRenderStartedAtIso = new Date().toISOString();
    lastRenderFinishedAtIso = null;
    renderTimeoutHit = false;
    lastRendererErrorStage = "renderer-rebuild-start";
    setPlaybackCapabilityMessage(null);
    resetPlaybackRuntimeInfo();
    emitDebugInfo();
    emitRenderLifecycle("render-start", {
      renderCycleCounter,
      lastRendererErrorStage,
    });

    const sessionToken = activeSessionToken + 1;
    activeSessionToken = sessionToken;
    const sessionTargetTick = options?.targetTick ?? null;
    let sessionTargetTickApplied = false;
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
    applyPlaybackSpeedPercentToApi(api, playbackSpeedPercent);
    activeApi = api;
    const playbackAvailable = isPlaybackApiAvailable(api);
    if (!playbackAvailable) {
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
        if (
          currentTick !== null &&
          pendingProgrammaticSeek &&
          pendingProgrammaticSeek.sessionToken === sessionToken &&
          pendingProgrammaticSeek.trackIndex === confirmedActiveTrackIndex
        ) {
          const playbackIsActive =
            playbackRuntimeInfo.isPlaying === true || normalizePlaybackState(api.playerState) === "playing";
          const tickDelta = Math.abs(currentTick - pendingProgrammaticSeek.tick);
          if (tickDelta <= 1) {
            hooks.onProgrammaticSeekConfirmed(confirmedActiveTrackIndex, pendingProgrammaticSeek.tick);
            pendingProgrammaticSeek = null;
            if (pendingPlayAfterProgrammaticSeek && isPlaybackApiAvailable(api)) {
              pendingPlayAfterProgrammaticSeek = false;
              api.play?.();
            }
          } else if (pendingProgrammaticSeek.retryCount < 2 && api.isReadyForPlayback !== false) {
            pendingProgrammaticSeek.retryCount += 1;
            const retryTick = pendingProgrammaticSeek.tick;
            const retryCountSnapshot = pendingProgrammaticSeek.retryCount;
            seekToTick(retryTick);
            if (pendingProgrammaticSeek) {
              pendingProgrammaticSeek.retryCount = retryCountSnapshot;
            }
            if (!playbackIsActive) {
              return;
            }
          } else if (!playbackIsActive) {
            return;
          }
        }
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

      api.playerReady?.on(() => {
        if (
          !pendingProgrammaticSeek ||
          pendingProgrammaticSeek.sessionToken !== sessionToken ||
          pendingProgrammaticSeek.trackIndex !== confirmedActiveTrackIndex
        ) {
          return;
        }
        seekToTick(pendingProgrammaticSeek.tick);
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
      zoomRerenderInFlight = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      lastRendererErrorStage = "renderFinished";
      if (pendingScrollSnapshot) {
        restoreRenderViewportScroll(pendingScrollSnapshot);
        pendingScrollSnapshot = null;
      }
      renderedBarBounds = extractRenderedBarBoundsFromApi(api, scoreRuntimeInfo.totalBars);
      emitDebugInfo();
      emitRenderLifecycle("render-finish", {
        renderCycleCounter,
        lastRendererErrorStage,
        lastRenderStartedAtIso,
        lastRenderFinishedAtIso,
        barBoundsExtraction: lastBarBoundsExtractionDiagnostics,
      });

      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        inPlaceZoomPlaybackContext = null;
        void switchTrackByReload(queuedTrackIndex);
        return;
      }
      if (activeApi === api && pendingZoomPercent !== null) {
        const queuedZoomPercent = pendingZoomPercent;
        pendingZoomPercent = null;
        applyZoomByRerenderingActiveApi(queuedZoomPercent);
      }
    });

    api.postRenderFinished?.on(() => {
      if (sessionToken !== activeSessionToken) {
        return;
      }
      if (activeApi !== api) {
        return;
      }
      const committedTrackIndex = api.tracks?.[0]?.index ?? confirmedActiveTrackIndex;
      hooks.onTrackRenderCommitted(committedTrackIndex);
      if (!sessionTargetTickApplied && sessionTargetTick !== null) {
        sessionTargetTickApplied = true;
        seekToTick(sessionTargetTick);
      }
      if (!inPlaceZoomPlaybackContext) {
        return;
      }
      if (zoomRerenderInFlight || pendingZoomPercent !== null) {
        return;
      }

      const zoomPlaybackContext = inPlaceZoomPlaybackContext;
      inPlaceZoomPlaybackContext = null;
      if (!zoomPlaybackContext.wasPlaying || !isPlaybackApiAvailable(api)) {
        return;
      }
      const stillPlaying =
        typeof api.playerState === "number" ? api.playerState === 1 : normalizePlaybackState(api.playerState) === "playing";
      if (stillPlaying) {
        return;
      }

      if (zoomPlaybackContext.tick !== null && typeof api.tickPosition === "number") {
        api.tickPosition = zoomPlaybackContext.tick;
      }

      const started = api.play?.() === true;
      if (!started) {
        hooks.onRuntimeNotice("Playback could not resume after zoom rerender.");
      }
    });

    api.error?.on((error) => {
      if (sessionToken !== activeSessionToken) {
        return;
      }

      clearRenderTimeout();
      lastRendererErrorStage = "error-event";
      lastFailedRequestedTrackIndex = nextTrackIndex;
      rendererBusy = false;
      zoomRerenderInFlight = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      destroyActiveRenderer();
      if (currentRenderMode === "string-heavy-safe" || currentRenderMode === "percussion-heavy-safe") {
        currentRenderMode = "fallback";
        renderFallbackMessage(container, "This track is too heavy to render safely right now.");
      } else {
        clearRenderHost(container);
      }
      const errorDetails = {
        attemptId: activeRenderAttemptId,
        stage: "error-event",
        lastRendererErrorStage,
        renderCycleCounter,
        lastRenderStartedAtIso,
        lastRenderFinishedAtIso,
        renderTimeoutHit,
        rawError: summarizeError(error),
      };
      emitRenderLifecycle("render-error", errorDetails);
      hooks.onRenderError({
        message: "alphaTab failed to render this GP file.",
        details: errorDetails,
      });
      emitDebugInfo();

      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        void switchTrackByReload(queuedTrackIndex);
      } else {
        inPlaceZoomPlaybackContext = null;
      }
    });

    lastRendererErrorStage = "load-start";
    const loadWasStarted = api.load(sourceBytes, [nextTrackIndex]);
    if (!loadWasStarted) {
      clearRenderTimeout();
      lastRendererErrorStage = "load";
      lastFailedRequestedTrackIndex = nextTrackIndex;
      rendererBusy = false;
      zoomRerenderInFlight = false;
      lastRenderFinishedAtIso = new Date().toISOString();
      destroyActiveRenderer();
      if (currentRenderMode === "string-heavy-safe" || currentRenderMode === "percussion-heavy-safe") {
        currentRenderMode = "fallback";
        renderFallbackMessage(container, "This track is too heavy to render safely right now.");
      } else {
        clearRenderHost(container);
      }
      emitDebugInfo();
      emitRenderLifecycle("render-error", {
        stage: "load",
        reason: "api.load returned false",
        renderCycleCounter,
        lastRendererErrorStage,
        lastRenderStartedAtIso,
        lastRenderFinishedAtIso,
        renderTimeoutHit,
      });
      const queuedTrackIndex = pendingRequestedTrackIndex;
      pendingRequestedTrackIndex = null;
      if (queuedTrackIndex !== null) {
        void switchTrackByReload(queuedTrackIndex);
      } else {
        inPlaceZoomPlaybackContext = null;
      }
      throw new Error("GP renderer rejected the source data.");
    }

    scheduleRenderTimeout(sessionToken, nextTrackIndex);
    emitDebugInfo();
  };

  await switchTrackByReload(selectedTrackIndex);

  return {
    selectTrack: (trackIndex: number, targetTick?: number | null) => {
      void switchTrackByReload(trackIndex, { targetTick: targetTick ?? null }).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not switch GP track.";
        hooks.onRenderError({
          message,
          details: {
            attemptId: activeRenderAttemptId,
            stage: "selectTrack",
            error: summarizeError(error),
            renderCycleCounter,
            lastRendererErrorStage,
          },
        });
      });
    },
    setZoom: (nextZoomPercent: number) => {
      const normalizedZoom = Math.max(50, Math.min(200, Math.round(nextZoomPercent)));
      if (normalizedZoom === zoomPercent) {
        return;
      }
      zoomPercent = normalizedZoom;
      if (applyZoomByRerenderingActiveApi(normalizedZoom)) {
        return;
      }
      inPlaceZoomPlaybackContext = null;
      void switchTrackByReload(confirmedActiveTrackIndex).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Could not apply GP zoom.";
        hooks.onRenderError({
          message,
          details: {
            attemptId: activeRenderAttemptId,
            stage: "setZoom",
            error: summarizeError(error),
            renderCycleCounter,
            lastRendererErrorStage,
          },
        });
      });
    },
    seekToTick: (tick: number) => seekToTick(tick),
    seekToBarStart: (barNumber: number) => {
      const barStartTick = resolveBarStartTickForNavigation(barNumber);
      if (barStartTick === null) {
        return null;
      }
      const didSeek = seekToTick(barStartTick);
      return didSeek ? barStartTick : null;
    },
    resolveNearestTickInBar: (barNumber: number, progressInBar: number) =>
      resolveNearestTickInBarForNavigation(barNumber, progressInBar),
    getBarTickRange: (barNumber: number) => getBarTickRange(barNumber),
    getRenderedBarBounds: () => renderedBarBounds,
    setPlaybackSpeedPercent: (nextSpeedPercent: number) => {
      const normalizedSpeedPercent = Math.max(15, Math.min(175, Math.round(nextSpeedPercent)));
      playbackSpeedPercent = normalizedSpeedPercent;
      if (!activeApi) {
        return false;
      }
      return applyPlaybackSpeedPercentToApi(activeApi, normalizedSpeedPercent);
    },
    play: () => {
      if (!activeApi || !isPlaybackApiAvailable(activeApi)) {
        hooks.onRuntimeNotice(playbackCapabilityMessage ?? "Playback is unavailable in this runtime.");
        return;
      }

      if (
        pendingProgrammaticSeek &&
        pendingProgrammaticSeek.sessionToken === activeSessionToken &&
        pendingProgrammaticSeek.trackIndex === confirmedActiveTrackIndex
      ) {
        pendingPlayAfterProgrammaticSeek = false;
        seekToTick(pendingProgrammaticSeek.tick);
      }

      playbackScrollLockSnapshot = captureRenderViewportScroll();
      const playbackApi = activeApi as AlphaTabApi & { play: () => boolean };
      playbackApi.play();
    },
    pause: () => {
      if (!activeApi || !isPlaybackApiAvailable(activeApi)) {
        hooks.onRuntimeNotice(playbackCapabilityMessage ?? "Playback is unavailable in this runtime.");
        return;
      }

      playbackScrollLockSnapshot = null;
      pendingPlayAfterProgrammaticSeek = false;
      const playbackApi = activeApi as AlphaTabApi & { pause: () => void };
      playbackApi.pause();
    },
    stop: () => {
      if (!activeApi || !isPlaybackApiAvailable(activeApi)) {
        hooks.onRuntimeNotice(playbackCapabilityMessage ?? "Playback is unavailable in this runtime.");
        return;
      }

      playbackScrollLockSnapshot = null;
      pendingProgrammaticSeek = null;
      pendingPlayAfterProgrammaticSeek = false;
      const playbackApi = activeApi as AlphaTabApi & { stop: () => void };
      playbackApi.stop();
    },
    destroy: () => {
      activeSessionToken += 1;
      clearRenderTimeout();
      rendererBusy = false;
      zoomRerenderInFlight = false;
      pendingRequestedTrackIndex = null;
      pendingZoomPercent = null;
      inPlaceZoomPlaybackContext = null;
      pendingProgrammaticSeek = null;
      pendingPlayAfterProgrammaticSeek = false;
      playbackScrollLockSnapshot = null;
      destroyActiveRenderer();
      clearRenderHost(container);
    },
  };
}
