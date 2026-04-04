import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  score?: AlphaTabScore;
  tracks?: AlphaTabTrack[];
  changeTrackMute?: (tracks: AlphaTabTrack[], mute: boolean) => void;
  changeTrackSolo?: (tracks: AlphaTabTrack[], solo: boolean) => void;
  changeTrackVolume?: (tracks: AlphaTabTrack[], volume: number) => void;
  masterVolume?: number;
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
  shortName?: string;
  displayName?: string;
  instrumentName?: string;
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
  displayLabel: string;
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
      chosenVerticalSource?: string | null;
      chosenVerticalSourceHeight?: number | null;
      availableVerticalSources?: Array<{ source: string; height: number }>;
      parentSystemRect?: { x: number; y: number; w: number; h: number } | null;
      firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
      firstBarCalibratedRect: { x: number; y: number; w: number; h: number } | null;
    } | null;
    transformSummary?: {
      coordinateSpaceMode: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
      coordinateSpaceModeX?: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
      coordinateSpaceModeY?: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
      modeReason: string;
      hostLocalScore: number;
      svgPixelScore: number;
      viewBoxScore: number;
      svgViewBox: { x: number; y: number; width: number; height: number } | null;
      svgClientRect: { width: number; height: number } | null;
      transformScaleX: number;
      transformScaleY: number;
      transformOffsetX: number;
      transformOffsetY: number;
      transformAppliedX?: boolean;
      transformAppliedY?: boolean;
      firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
      firstBarCalibratedRect?: { x: number; y: number; w: number; h: number } | null;
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
  setTrackMuted: (trackIndex: number, muted: boolean) => boolean;
  setTrackSoloed: (trackIndex: number, soloed: boolean) => boolean;
  setTrackVolume: (trackIndex: number, volumePercent: number) => boolean;
  setTrackBalance: (trackIndex: number, balancePercent: number) => boolean;
  setMasterVolume: (volumePercent: number) => boolean;
  setMasterBalance: (balancePercent: number) => boolean;
  applyMixerState: (state: {
    mutedTrackIndexes: number[];
    soloTrackIndexes: number[];
    trackVolumeByIndex: Record<number, number>;
    trackBalanceByIndex: Record<number, number>;
    masterVolume: number;
    masterBalance: number;
  }) => boolean;
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
const GLOBAL_HIGHLIGHT_Y_OFFSET_PX = 6;

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
    chosenVerticalSource?: string | null;
    chosenVerticalSourceHeight?: number | null;
    availableVerticalSources?: Array<{ source: string; height: number }>;
    parentSystemRect?: { x: number; y: number; w: number; h: number } | null;
    firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
    firstBarCalibratedRect: { x: number; y: number; w: number; h: number } | null;
  } | null;
    transformSummary?: {
    coordinateSpaceMode: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
    coordinateSpaceModeX?: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
    coordinateSpaceModeY?: "host-local" | "svg-pixel-to-host" | "viewbox-to-host";
    modeReason: string;
    hostLocalScore: number;
    svgPixelScore: number;
    viewBoxScore: number;
    svgViewBox: { x: number; y: number; width: number; height: number } | null;
    svgClientRect: { width: number; height: number } | null;
    transformScaleX: number;
    transformScaleY: number;
    transformOffsetX: number;
    transformOffsetY: number;
    transformAppliedX?: boolean;
      transformAppliedY?: boolean;
      firstBarRawRect: { x: number; y: number; w: number; h: number } | null;
      firstBarCalibratedRect?: { x: number; y: number; w: number; h: number } | null;
      firstBarFinalRect: { x: number; y: number; w: number; h: number } | null;
      globalYOffsetPx?: number;
      firstBarYBeforeGlobalOffset?: number | null;
      firstBarYAfterGlobalOffset?: number | null;
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
      displayLabel: deriveCompactTrackDisplayLabel(track),
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

function deriveCompactTrackDisplayLabel(track: AlphaTabTrack): string {
  const unsafeTrack = track as AlphaTabTrack & { playbackInfo?: { programName?: string } };
  const metadataCandidates = [track.displayName, track.instrumentName, track.shortName, unsafeTrack.playbackInfo?.programName];
  for (const candidate of metadataCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const fallbackName = track.name?.trim() || `Track ${track.index + 1}`;
  const separators = ["|", "—", "-", ":"];
  for (const separator of separators) {
    const segments = fallbackName.split(separator).map((segment) => segment.trim()).filter((segment) => segment.length > 0);
    if (segments.length > 1) {
      return segments[segments.length - 1] as string;
    }
  }
  return fallbackName;
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
  const mutedTrackIndexes = new Set<number>();
  const soloTrackIndexes = new Set<number>();
  const trackVolumeByIndex = new Map<number, number>();
  const trackBalanceByIndex = new Map<number, number>();
  let masterVolume = 80;
  let masterBalance = 0;
  let hasLoggedMixerApplySuccess = false;

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

  const clampVolumePercent = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
  const clampBalancePercent = (value: number): number => Math.max(-50, Math.min(50, Math.round(value)));
  const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
  const clampPan = (value: number): number => Math.max(-1, Math.min(1, value));

  const trySetNumber = (target: Record<string, unknown> | null | undefined, key: string, value: number): boolean => {
    if (!target || !(key in target)) {
      return false;
    }
    const existing = target[key];
    if (typeof existing !== "number") {
      return false;
    }
    target[key] = value;
    return true;
  };

  const applyMixerStateToApi = (api: AlphaTabApi, reason: string): boolean => {
    const unsafeApi = api as unknown as Record<string, unknown>;
    const settingsPlayer = (unsafeApi.settings as { player?: Record<string, unknown> } | undefined)?.player ?? null;
    const anySoloActive = soloTrackIndexes.size > 0;
    const activeTrackIndex = api.tracks?.[0]?.index ?? confirmedActiveTrackIndex;
    const activeTrackObject =
      api.score?.tracks.find((track) => track.index === activeTrackIndex) ?? api.tracks?.[0] ?? null;
    const activeTrackName = activeTrackObject?.name ?? null;
    const activeTrackMuted = mutedTrackIndexes.has(activeTrackIndex);
    const activeTrackSoloed = soloTrackIndexes.has(activeTrackIndex);
    const activeTrackAudible = !activeTrackMuted && (!anySoloActive || activeTrackSoloed);

    const trackVolume01 = clampUnit((trackVolumeByIndex.get(activeTrackIndex) ?? 100) / 100);
    const masterVolume01 = clampUnit(masterVolume / 100);
    const effectiveTrackVolume01 = activeTrackAudible ? clampUnit(trackVolume01 * masterVolume01) : 0;

    const effectiveTrackPan = clampPan((trackBalanceByIndex.get(activeTrackIndex) ?? 0) / 50);
    const effectiveMasterPan = clampPan(masterBalance / 50);

    const usedApiPaths = new Set<string>();
    let usedOfficialTrackMute = false;
    let usedOfficialTrackSolo = false;
    let usedOfficialTrackVolume = false;
    let usedOfficialMasterVolume = false;

    if (activeTrackObject && typeof api.changeTrackMute === "function") {
      try {
        api.changeTrackMute([activeTrackObject], !activeTrackAudible);
        usedOfficialTrackMute = true;
        usedApiPaths.add("api.changeTrackMute");
      } catch {
        usedOfficialTrackMute = false;
      }
    }
    if (activeTrackObject && typeof api.changeTrackSolo === "function") {
      try {
        api.changeTrackSolo([activeTrackObject], anySoloActive ? activeTrackSoloed : false);
        usedOfficialTrackSolo = true;
        usedApiPaths.add("api.changeTrackSolo");
      } catch {
        usedOfficialTrackSolo = false;
      }
    }
    if (activeTrackObject && typeof api.changeTrackVolume === "function") {
      try {
        api.changeTrackVolume([activeTrackObject], effectiveTrackVolume01);
        usedOfficialTrackVolume = true;
        usedApiPaths.add("api.changeTrackVolume");
      } catch {
        usedOfficialTrackVolume = false;
      }
    }
    if (typeof api.masterVolume === "number") {
      api.masterVolume = masterVolume01;
      usedOfficialMasterVolume = true;
      usedApiPaths.add("api.masterVolume");
    } else if (trySetNumber(settingsPlayer, "masterVolume", masterVolume01)) {
      usedOfficialMasterVolume = true;
      usedApiPaths.add("settings.player.masterVolume");
    }

    const settingsUpdated = typeof api.updateSettings === "function" ? (() => {
      try {
        api.updateSettings();
        return true;
      } catch {
        return false;
      }
    })() : false;

    const trackOperationApplied = usedOfficialTrackMute || usedOfficialTrackSolo || usedOfficialTrackVolume;
    const masterOperationApplied = usedOfficialMasterVolume;
    const overallApplied = trackOperationApplied || masterOperationApplied;

    if (overallApplied && !hasLoggedMixerApplySuccess) {
      hasLoggedMixerApplySuccess = true;
      console.debug("[alphaTabGpRenderer] mixer apply", {
        reason,
        activeTrackIndex,
        activeTrackName,
        activeTrackAudible,
        activeTrackMuted,
        activeTrackSoloed,
        anySoloActive,
        effectiveTrackVolume01,
        effectiveTrackPan,
        effectiveMasterVolume01: masterVolume01,
        effectiveMasterPan,
        usedOfficialTrackMute,
        usedOfficialTrackSolo,
        usedOfficialTrackVolume,
        usedOfficialMasterVolume,
        trackOperationApplied,
        masterOperationApplied,
        settingsUpdated,
        overallApplied,
        usedApiPaths: Array.from(usedApiPaths),
      });
    }

    return overallApplied;
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
    const toFiniteNumber = (value: string | null): number | null => {
      if (value === null) {
        return null;
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const segmentOverlapsRange = (segStart: number, segEnd: number, rangeStart: number, rangeEnd: number): boolean => {
      const left = Math.min(segStart, segEnd);
      const right = Math.max(segStart, segEnd);
      return right >= rangeStart && left <= rangeEnd;
    };
    const collectHorizontalLineYs = (
      svgRoot: SVGSVGElement | null,
      rangeStartX: number,
      rangeEndX: number,
    ): Array<{ y: number; source: "line" | "rect" | "path" }> => {
      if (!svgRoot || !Number.isFinite(rangeStartX) || !Number.isFinite(rangeEndX)) {
        return [];
      }
      const xMin = Math.min(rangeStartX, rangeEndX);
      const xMax = Math.max(rangeStartX, rangeEndX);
      const minHorizontalSegmentLength = Math.max(12, (xMax - xMin) * 0.35);
      const yValues: Array<{ y: number; source: "line" | "rect" | "path" }> = [];
      const lineNodes = Array.from(svgRoot.querySelectorAll("line"));
      lineNodes.forEach((lineNode) => {
        const x1 = toFiniteNumber(lineNode.getAttribute("x1"));
        const x2 = toFiniteNumber(lineNode.getAttribute("x2"));
        const y1 = toFiniteNumber(lineNode.getAttribute("y1"));
        const y2 = toFiniteNumber(lineNode.getAttribute("y2"));
        if (x1 === null || x2 === null || y1 === null || y2 === null || Math.abs(y1 - y2) > 0.8) {
          return;
        }
        if (!segmentOverlapsRange(x1, x2, xMin, xMax)) {
          return;
        }
        if (Math.abs(x2 - x1) < minHorizontalSegmentLength) {
          return;
        }
        yValues.push({ y: (y1 + y2) / 2, source: "line" });
      });
      const rectNodes = Array.from(svgRoot.querySelectorAll("rect"));
      rectNodes.forEach((rectNode) => {
        const x = toFiniteNumber(rectNode.getAttribute("x"));
        const y = toFiniteNumber(rectNode.getAttribute("y"));
        const w = toFiniteNumber(rectNode.getAttribute("width"));
        const h = toFiniteNumber(rectNode.getAttribute("height"));
        if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0 || h > 2.5) {
          return;
        }
        if (!segmentOverlapsRange(x, x + w, xMin, xMax)) {
          return;
        }
        if (w < minHorizontalSegmentLength) {
          return;
        }
        yValues.push({ y: y + h * 0.5, source: "rect" });
      });
      const pathNodes = Array.from(svgRoot.querySelectorAll("path"));
      pathNodes.forEach((pathNode) => {
        const d = pathNode.getAttribute("d");
        if (!d) {
          return;
        }
        const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
        if (!tokens || tokens.length === 0) {
          return;
        }
        let index = 0;
        let command = "";
        let currentX = 0;
        let currentY = 0;
        const readNumber = (): number | null => {
          if (index >= tokens.length) {
            return null;
          }
          const token = tokens[index] ?? "";
          const parsed = Number(token);
          if (!Number.isFinite(parsed)) {
            return null;
          }
          index += 1;
          return parsed;
        };
        while (index < tokens.length) {
          const token = tokens[index] ?? "";
          if (/^[a-zA-Z]$/.test(token)) {
            command = token;
            index += 1;
            continue;
          }
          if (command === "M" || command === "L") {
            const nextX = readNumber();
            const nextY = readNumber();
            if (nextX === null || nextY === null) {
              break;
            }
            if (
              Math.abs(nextY - currentY) <= 0.8 &&
              Math.abs(nextX - currentX) >= minHorizontalSegmentLength &&
              segmentOverlapsRange(currentX, nextX, xMin, xMax)
            ) {
              yValues.push({ y: (currentY + nextY) * 0.5, source: "path" });
            }
            currentX = nextX;
            currentY = nextY;
            continue;
          }
          if (command === "m" || command === "l") {
            const dx = readNumber();
            const dy = readNumber();
            if (dx === null || dy === null) {
              break;
            }
            const nextX = currentX + dx;
            const nextY = currentY + dy;
            if (
              Math.abs(nextY - currentY) <= 0.8 &&
              Math.abs(nextX - currentX) >= minHorizontalSegmentLength &&
              segmentOverlapsRange(currentX, nextX, xMin, xMax)
            ) {
              yValues.push({ y: (currentY + nextY) * 0.5, source: "path" });
            }
            currentX = nextX;
            currentY = nextY;
            continue;
          }
          if (command === "H") {
            const nextX = readNumber();
            if (nextX === null) {
              break;
            }
            if (Math.abs(nextX - currentX) >= minHorizontalSegmentLength && segmentOverlapsRange(currentX, nextX, xMin, xMax)) {
              yValues.push({ y: currentY, source: "path" });
            }
            currentX = nextX;
            continue;
          }
          if (command === "h") {
            const dx = readNumber();
            if (dx === null) {
              break;
            }
            const nextX = currentX + dx;
            if (Math.abs(nextX - currentX) >= minHorizontalSegmentLength && segmentOverlapsRange(currentX, nextX, xMin, xMax)) {
              yValues.push({ y: currentY, source: "path" });
            }
            currentX = nextX;
            continue;
          }
          if (command === "V") {
            const nextY = readNumber();
            if (nextY === null) {
              break;
            }
            currentY = nextY;
            continue;
          }
          if (command === "v") {
            const dy = readNumber();
            if (dy === null) {
              break;
            }
            currentY += dy;
            continue;
          }
          index += 1;
        }
      });
      return yValues;
    };
    const clusterYValues = (values: number[], tolerance: number): number[][] => {
      if (values.length === 0) {
        return [];
      }
      const sorted = [...values].sort((left, right) => left - right);
      const clusters: number[][] = [[sorted[0] ?? 0]];
      for (let index = 1; index < sorted.length; index += 1) {
        const current = sorted[index] ?? 0;
        const activeCluster = clusters[clusters.length - 1];
        const activeLast = activeCluster[activeCluster.length - 1] ?? current;
        if (Math.abs(current - activeLast) <= tolerance) {
          activeCluster.push(current);
        } else {
          clusters.push([current]);
        }
      }
      return clusters;
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
    const horizontalAnchorSvg = container.querySelector<SVGSVGElement>("svg");
    const familyResults: Array<{
      sourcePath: string;
      rects: RenderedBarBound[];
      calibrationSummary: BarBoundsExtractionDiagnostics["calibrationSummary"];
    }> = [];
    directStaffSystemEntries.forEach(({ sourcePath, systems }) => {
      usedLayoutPaths.add(sourcePath);
      const familyRects: RenderedBarBound[] = [];
      let familyCalibrationSummary: BarBoundsExtractionDiagnostics["calibrationSummary"] = null;
      let didLogVerticalSelection = false;
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
        const systemVisualBounds =
          toXywhRect(systemBoundsContainer?.visualBounds) ?? toXywhRect(systemRecord.visualBounds);
        const systemRealBounds = toXywhRect(systemBoundsContainer?.realBounds) ?? toXywhRect(systemRecord.realBounds);
        const parentSystemOuterBounds =
          systemVisualBounds ??
          systemRealBounds ??
          toXywhRect(systemBoundsContainer) ??
          toXywhRect(systemRecord);
        const resolvedVerticalCandidates: Array<{ source: string; rect: { x: number; y: number; w: number; h: number } }> = [
          ...(toXywhRect(systemBoundsContainer?.lineAlignedBounds)
            ? [{ source: "staffSystemBounds.lineAlignedBounds", rect: toXywhRect(systemBoundsContainer?.lineAlignedBounds)! }]
            : []),
          ...(toXywhRect(systemRecord.lineAlignedBounds)
            ? [{ source: "system.lineAlignedBounds", rect: toXywhRect(systemRecord.lineAlignedBounds)! }]
            : []),
          ...(toXywhRect(systemBoundsContainer?.systemAlignedBounds)
            ? [{ source: "staffSystemBounds.systemAlignedBounds", rect: toXywhRect(systemBoundsContainer?.systemAlignedBounds)! }]
            : []),
          ...(toXywhRect(systemRecord.systemAlignedBounds)
            ? [{ source: "system.systemAlignedBounds", rect: toXywhRect(systemRecord.systemAlignedBounds)! }]
            : []),
          ...(systemVisualBounds ? [{ source: "system.visualBounds", rect: systemVisualBounds }] : []),
          ...(systemRealBounds ? [{ source: "system.realBounds", rect: systemRealBounds }] : []),
          ...(parentSystemOuterBounds ? [{ source: "system.outerBounds", rect: parentSystemOuterBounds }] : []),
        ];
        const chosenParentVerticalCandidate = resolvedVerticalCandidates[0] ?? null;
        const systemCalibrationBounds =
          toXywhRect(systemBoundsContainer?.visualBounds) ??
          toXywhRect(systemBoundsContainer?.realBounds) ??
          toXywhRect(systemBoundsContainer);

        const barBoundsByIndex = bars.map((barItem) => {
          if (!barItem || typeof barItem !== "object") {
            return null;
          }
          const barRecord = barItem as Record<string, unknown>;
          return toXywhRect(barRecord.lineAlignedBounds) ?? toXywhRect(barRecord.visualBounds) ?? toXywhRect(barRecord.realBounds);
        });
        const indexedBarBounds = barBoundsByIndex
          .map((rect, barIndexInSystem) => (rect ? { barIndexInSystem, rect } : null))
          .filter((entry): entry is { barIndexInSystem: number; rect: { x: number; y: number; w: number; h: number } } => entry !== null);
        const rawBarBounds = indexedBarBounds.map((entry) => entry.rect);
        const absXInsideCount =
          systemCalibrationBounds === null
            ? 0
            : rawBarBounds.filter(
                (bar) =>
                  bar.x >= systemCalibrationBounds.x - 2 &&
                  bar.x + bar.w <= systemCalibrationBounds.x + systemCalibrationBounds.w + 2,
              ).length;
        const localXInsideCount =
          systemCalibrationBounds === null
            ? 0
            : rawBarBounds.filter((bar) => bar.x >= -2 && bar.x + bar.w <= systemCalibrationBounds.w + 2).length;
        const absYInsideCount =
          systemCalibrationBounds === null
            ? 0
            : rawBarBounds.filter(
                (bar) =>
                  bar.y >= systemCalibrationBounds.y - 2 &&
                  bar.y + bar.h <= systemCalibrationBounds.y + systemCalibrationBounds.h + 2,
              ).length;
        const localYInsideCount =
          systemCalibrationBounds === null
            ? 0
            : rawBarBounds.filter((bar) => bar.y >= -2 && bar.y + bar.h <= systemCalibrationBounds.h + 2).length;
        const calibrationModeX: "local-to-system" | "absolute" =
          systemCalibrationBounds && localXInsideCount > absXInsideCount ? "local-to-system" : "absolute";
        const calibrationModeY: "local-to-system" | "absolute" =
          systemCalibrationBounds && localYInsideCount > absYInsideCount ? "local-to-system" : "absolute";
        const sortedClusterSeedRects = [...indexedBarBounds].sort((left, right) => left.rect.y - right.rect.y);
        const heightValues = sortedClusterSeedRects.map((entry) => entry.rect.h).sort((left, right) => left - right);
        const medianHeight =
          heightValues.length > 0 ? heightValues[Math.floor(heightValues.length / 2)] ?? heightValues[0] ?? 0 : 0;
        const clusterTolerance = medianHeight > 0 ? Math.max(1, medianHeight * 0.08) : 1;
        const rowClusters: Array<{ top: number; bottom: number; barIndices: number[]; bottoms: number[] }> = [];
        sortedClusterSeedRects.forEach(({ barIndexInSystem, rect }) => {
          const rectTop = rect.y;
          const rectBottom = rect.y + rect.h;
          const clusterIndex = rowClusters.findIndex(
            (cluster) => rectBottom >= cluster.top - clusterTolerance && rectTop <= cluster.bottom + clusterTolerance,
          );
          if (clusterIndex >= 0) {
            const cluster = rowClusters[clusterIndex];
            cluster.top = Math.min(cluster.top, rectTop);
            cluster.bottom = Math.max(cluster.bottom, rectBottom);
            cluster.barIndices.push(barIndexInSystem);
            cluster.bottoms.push(rectBottom);
            return;
          }
          rowClusters.push({ top: rectTop, bottom: rectBottom, barIndices: [barIndexInSystem], bottoms: [rectBottom] });
        });
        const toMedian = (values: number[]): number => {
          if (values.length === 0) {
            return 0;
          }
          const sorted = [...values].sort((left, right) => left - right);
          const midIndex = Math.floor(sorted.length / 2);
          return sorted[midIndex] ?? sorted[0] ?? 0;
        };
        const rowClusterBands = rowClusters.map((cluster) => ({
          y: cluster.top,
          h: cluster.bottom - cluster.top,
          rowBottom: toMedian(cluster.bottoms),
          barIndexSet: new Set(cluster.barIndices),
        }));

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
            systemCalibrationBounds && calibrationModeX === "local-to-system"
              ? systemCalibrationBounds.x + barBounds.x
              : barBounds.x;
          const matchedClusterIndex = rowClusterBands.findIndex((cluster) => cluster.barIndexSet.has(barIndexInSystem));
          const matchedCluster = matchedClusterIndex >= 0 ? rowClusterBands[matchedClusterIndex] : null;
          let systemVerticalBounds = matchedCluster ? { x: 0, y: matchedCluster.y, w: 0, h: matchedCluster.h } : null;
          let chosenVerticalSource: string = systemVerticalBounds ? "staffSystem.rowClusterBand" : "bar-local-fallback";
          if (systemVerticalBounds && parentSystemOuterBounds) {
            const clampedTop = Math.max(systemVerticalBounds.y, parentSystemOuterBounds.y);
            const clampedBottom = Math.min(
              systemVerticalBounds.y + systemVerticalBounds.h,
              parentSystemOuterBounds.y + parentSystemOuterBounds.h,
            );
            if (clampedBottom > clampedTop + 1) {
              systemVerticalBounds = { ...systemVerticalBounds, y: clampedTop, h: clampedBottom - clampedTop };
              chosenVerticalSource = "staffSystem.rowClusterBand-clamped";
            }
          } else if (!systemVerticalBounds && parentSystemOuterBounds) {
            systemVerticalBounds = parentSystemOuterBounds;
            chosenVerticalSource = "system.outerBounds-fallback";
          }
          let calibratedY = barBounds.y;
          let calibratedH = barBounds.h;
          if (systemVerticalBounds) {
            calibratedY = systemVerticalBounds.y;
            calibratedH = systemVerticalBounds.h;
          }
          const barRangeStartX = calibratedX;
          const barRangeEndX = calibratedX + barBounds.w;
          const detectedHorizontalLineEntries = collectHorizontalLineYs(horizontalAnchorSvg, barRangeStartX, barRangeEndX);
          const detectedHorizontalLineYs = detectedHorizontalLineEntries.map((entry) => entry.y);
          const detectedHorizontalLineSources = Array.from(new Set(detectedHorizontalLineEntries.map((entry) => entry.source)));
          const yClusterTolerance = Math.max(0.5, Math.min(3, calibratedH * 0.04));
          const horizontalLineClusters = clusterYValues(detectedHorizontalLineYs, yClusterTolerance);
          const clusterSummaries = horizontalLineClusters.map((cluster, clusterIndex) => {
            const top = Math.min(...cluster);
            const bottom = Math.max(...cluster);
            return {
              index: clusterIndex,
              top,
              bottom,
              center: (top + bottom) * 0.5,
              count: cluster.length,
            };
          });
          const currentBarCenterY = barBounds.y + barBounds.h * 0.5;
          const currentRowBottomHint = matchedCluster?.rowBottom ?? calibratedY + calibratedH;
          const nearestCenterClusterIndex =
            clusterSummaries.length > 0
              ? clusterSummaries
                  .map((cluster) => ({
                    clusterIndex: cluster.index,
                    centerDistance: Math.abs(cluster.center - currentBarCenterY),
                  }))
                  .sort((left, right) => left.centerDistance - right.centerDistance)[0]?.clusterIndex ?? -1
              : -1;
          const nearestCenterCluster =
            nearestCenterClusterIndex >= 0 ? horizontalLineClusters[nearestCenterClusterIndex] ?? null : null;
          const nearestCenterTopLineY = nearestCenterCluster ? Math.min(...nearestCenterCluster) : null;
          const nearestCenterBottomLineY = nearestCenterCluster ? Math.max(...nearestCenterCluster) : null;
          const nearestCenterRowBottom = nearestCenterBottomLineY ?? currentRowBottomHint;
          let chosenVerticalAnchorMode: "top" | "bottom" = "bottom";
          let restoredY = nearestCenterRowBottom - calibratedH;
          if (nearestCenterTopLineY !== null && nearestCenterBottomLineY !== null) {
            const rowLineSpan = Math.max(nearestCenterBottomLineY - nearestCenterTopLineY, 0);
            const topAnchoredY = nearestCenterTopLineY;
            const bottomAnchoredY = nearestCenterBottomLineY - calibratedH;
            chosenVerticalAnchorMode =
              calibratedH > rowLineSpan + yClusterTolerance || bottomAnchoredY > topAnchoredY + rowLineSpan * 0.25
                ? "top"
                : "bottom";
            restoredY = chosenVerticalAnchorMode === "top" ? topAnchoredY : bottomAnchoredY;
          }
          if (nearestCenterBottomLineY !== null) {
            chosenVerticalSource =
              chosenVerticalAnchorMode === "top" ? "svg.horizontalRowTopLine" : "svg.horizontalRowBottomLine";
          }
          const restoredBottomY = restoredY + calibratedH;
          const rowBandTop = matchedCluster?.y ?? restoredY;
          const rowBandBottom = matchedCluster ? matchedCluster.y + matchedCluster.h : restoredBottomY;
          const rowLocalWindowPad = Math.max(2, yClusterTolerance * 4, calibratedH * 0.25);
          const previousGlobalLowestClusterIndex =
            clusterSummaries
              .filter((cluster) => cluster.count >= 2)
              .sort((left, right) => right.bottom - left.bottom || right.count - left.count)[0]?.index ?? -1;
          const rowLocalTabClusterCandidates = clusterSummaries.filter(
            (cluster) =>
              cluster.count >= 2 &&
              cluster.bottom >= rowBandTop - rowLocalWindowPad &&
              cluster.top <= rowBandBottom + rowLocalWindowPad,
          );
          const chosenRowLocalTabClusterIndex =
            rowLocalTabClusterCandidates.sort((left, right) => right.bottom - left.bottom || right.count - left.count)[0]?.index ??
            -1;
          const chosenTabClusterIndex =
            chosenRowLocalTabClusterIndex >= 0 ? chosenRowLocalTabClusterIndex : nearestCenterClusterIndex;
          const chosenLineCluster =
            chosenTabClusterIndex >= 0 ? horizontalLineClusters[chosenTabClusterIndex] ?? null : null;
          const targetTabBottomLineY = chosenLineCluster ? Math.max(...chosenLineCluster) : null;
          const appliedYOffsetCorrection = targetTabBottomLineY !== null ? targetTabBottomLineY - restoredBottomY : 0;
          const correctedY = restoredY + appliedYOffsetCorrection;
          const correctedBottomY = correctedY + calibratedH;
          const bottomDeltaBeforeClamp =
            targetTabBottomLineY !== null ? correctedBottomY - targetTabBottomLineY : null;
          const correctedRect = {
            x: calibratedX,
            y: correctedY,
            w: barBounds.w,
            h: calibratedH,
          };
          const chosenRowClusterIndex = chosenTabClusterIndex;
          let rowAnchoredY = correctedY;
          const structuralBottomBoundary =
            parentSystemOuterBounds?.y !== undefined && parentSystemOuterBounds?.h !== undefined
              ? parentSystemOuterBounds.y + parentSystemOuterBounds.h
              : Number.POSITIVE_INFINITY;
          const effectiveBottomBoundary =
            targetTabBottomLineY !== null ? Math.max(structuralBottomBoundary, targetTabBottomLineY) : structuralBottomBoundary;
          const maxTopFromBottomBoundary = effectiveBottomBoundary - calibratedH;
          const bottomClampChangedY = rowAnchoredY > maxTopFromBottomBoundary;
          calibratedY = Math.min(rowAnchoredY, maxTopFromBottomBoundary);
          const structuralTopBoundary = parentSystemOuterBounds?.y ?? systemVerticalBounds?.y ?? calibratedY;
          calibratedY = Math.max(calibratedY, structuralTopBoundary);
          const finalBottomY = calibratedY + calibratedH;
          const bottomDeltaAfterClamp = targetTabBottomLineY !== null ? finalBottomY - targetTabBottomLineY : null;
          const finalRect = {
            x: calibratedX,
            y: calibratedY,
            w: barBounds.w,
            h: calibratedH,
          };
          if (!didLogVerticalSelection && systemIndex === 0 && barIndexInSystem === 0) {
            didLogVerticalSelection = true;
            console.debug("[alphaTabGpRenderer] bar bounds vertical source", {
              availableVerticalSources: resolvedVerticalCandidates
                .map((candidate) => ({ source: candidate.source, height: candidate.rect.h }))
                .sort((left, right) => left.height - right.height)
                .slice(0, 10),
              parentSystemCandidateRects: resolvedVerticalCandidates
                .map((candidate) => ({ source: candidate.source, rect: candidate.rect }))
                .slice(0, 8),
              chosenParentVerticalRectSource: chosenParentVerticalCandidate?.source ?? null,
              totalBarsInSystem: bars.length,
              rowClusterCount: rowClusterBands.length,
              firstBarClusterIndex: chosenRowClusterIndex >= 0 ? chosenRowClusterIndex : matchedClusterIndex,
              matchedClusterBand: matchedCluster
                ? { top: matchedCluster.y, bottom: matchedCluster.y + matchedCluster.h, height: matchedCluster.h }
                : null,
              restoredVerticalSource: chosenVerticalSource,
              restoredCalibratedRectBeforeYCorrection: {
                x: calibratedX,
                y: restoredY,
                w: barBounds.w,
                h: calibratedH,
              },
              detectedHorizontalLineYs: detectedHorizontalLineYs.slice(0, 24),
              horizontalLineClusters: clusterSummaries,
              rowLocalFilteredClusters: rowLocalTabClusterCandidates,
              detectedHorizontalLineSources,
              nearestCenterClusterIndex,
              previousGlobalLowestClusterIndex,
              chosenRowLocalTabClusterIndex,
              chosenTabClusterIndex,
              targetTabBottomLineY,
              restoredBottomY,
              appliedYOffsetCorrection,
              correctedY,
              correctedBottomY,
              structuralBottomBoundary,
              maxTopFromBottomBoundary,
              finalCalibratedY: calibratedY,
              finalBottomY,
              bottomDeltaBeforeClamp,
              bottomDeltaAfterClamp,
              bottomClampChangedY,
              correctedRect,
              chosenVerticalAnchorMode,
              finalVerticalSourcePath: chosenParentVerticalCandidate ? "parent-system-primary" : "cluster-fallback",
              firstBarHeight: calibratedH,
              chosenVerticalSource,
              systemVisualBounds,
              systemRealBounds,
              chosenVerticalSourceHeight: systemVerticalBounds?.h ?? null,
              firstBarRawRect: barBounds,
              finalRect,
            });
          }
          if (!familyCalibrationSummary) {
            familyCalibrationSummary = {
              calibrationModeX,
              calibrationModeY,
              systemOriginX: systemCalibrationBounds?.x ?? null,
              systemOriginY: systemCalibrationBounds?.y ?? null,
              chosenVerticalSource,
              chosenVerticalSourceHeight: systemVerticalBounds?.h ?? null,
              availableVerticalSources: resolvedVerticalCandidates
                .map((candidate) => ({ source: candidate.source, height: candidate.rect.h }))
                .sort((left, right) => left.height - right.height)
                .slice(0, 12),
              parentSystemRect: systemVerticalBounds,
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
    const nearZeroOffset = Math.abs(offsetX) <= 1 && Math.abs(offsetY) <= 1;
    const viewBoxScore = (looksLikeViewBoxUnits ? 4 : 0) + (hasValidViewBox ? 1 : 0);
    const svgPixelScore = (looksLikeSvgPixelUnits ? 3 : 0) + (!nearZeroOffset ? 1 : 0);
    const hostLocalScore = (nearZeroOffset ? 2 : -2) + (!svgRect ? 1 : 0);
    const coordinateSpaceMode: "host-local" | "svg-pixel-to-host" | "viewbox-to-host" =
      viewBoxScore >= svgPixelScore && viewBoxScore >= hostLocalScore
        ? "viewbox-to-host"
        : svgPixelScore >= hostLocalScore
          ? "svg-pixel-to-host"
          : "host-local";
    const coordinateSpaceModeX: "host-local" | "svg-pixel-to-host" | "viewbox-to-host" = coordinateSpaceMode;
    const coordinateSpaceModeY: "host-local" | "svg-pixel-to-host" | "viewbox-to-host" = "host-local";
    const modeReason =
      coordinateSpaceMode === "viewbox-to-host"
        ? `viewboxScore=${viewBoxScore} dominates`
        : coordinateSpaceMode === "svg-pixel-to-host"
          ? `svgPixelScore=${svgPixelScore} dominates`
          : `hostLocalScore=${hostLocalScore} dominates`;
    let transformAppliedX = false;
    let transformAppliedY = false;
    const transformedCandidateRects = candidateRects.map((rect) => {
      const width = Math.max(rect.endX - rect.startX, 1);
      let mappedStartX = rect.startX;
      let mappedWidth = width;
      if (coordinateSpaceModeX === "viewbox-to-host" && svgViewBox) {
        transformAppliedX = true;
        mappedStartX = offsetX + (rect.startX - svgViewBox.x) * scaleX;
        mappedWidth = width * scaleX;
      } else if (coordinateSpaceModeX === "svg-pixel-to-host") {
        transformAppliedX = true;
        mappedStartX = offsetX + rect.startX;
      }
      let mappedY = rect.y;
      let mappedHeight = rect.height;
      return {
        ...rect,
        startX: mappedStartX,
        endX: mappedStartX + mappedWidth,
        y: mappedY,
        height: mappedHeight,
      };
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

    let firstBarYBeforeGlobalOffset: number | null = null;
    let firstBarYAfterGlobalOffset: number | null = null;
    const normalizedBars = orderedBars
      .map((bar, barIndex) => {
        const yBeforeGlobalOffset = bar.y;
        const yAfterGlobalOffset = yBeforeGlobalOffset + GLOBAL_HIGHLIGHT_Y_OFFSET_PX;
        if (barIndex === 0) {
          firstBarYBeforeGlobalOffset = yBeforeGlobalOffset;
          firstBarYAfterGlobalOffset = yAfterGlobalOffset;
        }
        return {
          ...bar,
          y: yAfterGlobalOffset,
          rowIndex: normalizedRowMap.get(bar.rowIndex) ?? 0,
        };
      })
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
        coordinateSpaceModeX,
        coordinateSpaceModeY,
        modeReason,
        hostLocalScore,
        svgPixelScore,
        viewBoxScore,
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
        transformAppliedX,
        transformAppliedY,
        firstBarRawRect: firstRawRectForTransform,
        firstBarCalibratedRect: firstRawRectForTransform,
        firstBarFinalRect: firstFinalRectForTransform,
        globalYOffsetPx: GLOBAL_HIGHLIGHT_Y_OFFSET_PX,
        firstBarYBeforeGlobalOffset,
        firstBarYAfterGlobalOffset,
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
    applyMixerStateToApi(api, "renderer-created");
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
      applyMixerStateToApi(api, "score-loaded");
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
    setTrackMuted: (trackIndex: number, muted: boolean) => {
      if (!Number.isFinite(trackIndex)) {
        return false;
      }
      if (muted) {
        mutedTrackIndexes.add(trackIndex);
      } else {
        mutedTrackIndexes.delete(trackIndex);
      }
      if (!activeApi) {
        return false;
      }
      return applyMixerStateToApi(activeApi, "setTrackMuted");
    },
    setTrackSoloed: (trackIndex: number, soloed: boolean) => {
      if (!Number.isFinite(trackIndex)) {
        return false;
      }
      if (soloed) {
        soloTrackIndexes.add(trackIndex);
      } else {
        soloTrackIndexes.delete(trackIndex);
      }
      if (!activeApi) {
        return false;
      }
      return applyMixerStateToApi(activeApi, "setTrackSoloed");
    },
    setTrackVolume: (trackIndex: number, volumePercent: number) => {
      if (!Number.isFinite(trackIndex)) {
        return false;
      }
      trackVolumeByIndex.set(trackIndex, clampVolumePercent(volumePercent));
      if (!activeApi) {
        return false;
      }
      return applyMixerStateToApi(activeApi, "setTrackVolume");
    },
    setTrackBalance: (trackIndex: number, balancePercent: number) => {
      if (!Number.isFinite(trackIndex)) {
        return false;
      }
      trackBalanceByIndex.set(trackIndex, clampBalancePercent(balancePercent));
      if (!activeApi) {
        return false;
      }
      return applyMixerStateToApi(activeApi, "setTrackBalance");
    },
    setMasterVolume: (volumePercent: number) => {
      masterVolume = clampVolumePercent(volumePercent);
      if (!activeApi) {
        return false;
      }
      return applyMixerStateToApi(activeApi, "setMasterVolume");
    },
    setMasterBalance: (balancePercent: number) => {
      masterBalance = clampBalancePercent(balancePercent);
      if (!activeApi) {
        return false;
      }
      return applyMixerStateToApi(activeApi, "setMasterBalance");
    },
    applyMixerState: (state) => {
      mutedTrackIndexes.clear();
      state.mutedTrackIndexes.forEach((trackIndex) => {
        if (Number.isFinite(trackIndex)) {
          mutedTrackIndexes.add(trackIndex);
        }
      });
      soloTrackIndexes.clear();
      state.soloTrackIndexes.forEach((trackIndex) => {
        if (Number.isFinite(trackIndex)) {
          soloTrackIndexes.add(trackIndex);
        }
      });
      trackVolumeByIndex.clear();
      Object.entries(state.trackVolumeByIndex).forEach(([trackIndex, value]) => {
        const parsedTrackIndex = Number(trackIndex);
        if (Number.isFinite(parsedTrackIndex)) {
          trackVolumeByIndex.set(parsedTrackIndex, clampVolumePercent(value));
        }
      });
      trackBalanceByIndex.clear();
      Object.entries(state.trackBalanceByIndex).forEach(([trackIndex, value]) => {
        const parsedTrackIndex = Number(trackIndex);
        if (Number.isFinite(parsedTrackIndex)) {
          trackBalanceByIndex.set(parsedTrackIndex, clampBalancePercent(value));
        }
      });
      masterVolume = clampVolumePercent(state.masterVolume);
      masterBalance = clampBalancePercent(state.masterBalance);
      if (!activeApi) {
        return false;
      }
      return applyMixerStateToApi(activeApi, "applyMixerState");
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
        pendingPlayAfterProgrammaticSeek = true;
        console.debug("[alphaTabGpRenderer] queued play after pending seek", {
          tick: pendingProgrammaticSeek.tick,
          trackIndex: pendingProgrammaticSeek.trackIndex,
        });
        return;
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
