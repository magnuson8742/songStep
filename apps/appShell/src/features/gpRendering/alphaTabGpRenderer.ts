import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  score?: AlphaTabScore;
  tracks?: AlphaTabTrack[];
  destroy?: () => void;
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
  tracks: AlphaTabTrack[];
  masterBars?: unknown[];
  stylesheet?: {
    singleTrackTrackNamePolicy?: string;
    firstSystemTrackNameMode?: string;
    otherSystemsTrackNameMode?: string;
  };
}

interface AlphaTabTrack {
  index: number;
  name: string;
  staves?: AlphaTabStaff[];
}

interface AlphaTabStaff {
  bars?: AlphaTabBar[];
}

interface AlphaTabBar {
  voices?: AlphaTabVoice[];
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
  scoreTrackCount: number;
  scoreTracks: GpTrackRuntimeInfo[];
  renderedTracks: GpTrackRuntimeInfo[];
}

export interface GpRendererHooks {
  onTracksLoaded: (tracks: GpTrackInfo[]) => void;
  onDebugInfo: (debugInfo: GpRenderDebugInfo) => void;
  onActiveTrackConfirmed: (trackIndex: number) => void;
  onRenderError: (message: string) => void;
}

export interface GpRendererController {
  selectTrack: (trackIndex: number) => void;
  destroy: () => void;
}

const BRAVURA_FONT_DIRECTORY = "/font/";
const SONIVOX_SOUND_FONT_PATH = "/soundfont/sonivox.sf2";
const TAB_ONLY_STAVE_PROFILE = "Tab";
const ENABLE_LAZY_LOADING = false;
const USE_WORKERS = false;
const RENDER_TIMEOUT_MS = 5000;

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

function buildAlphaTabSettings(): alphaTab.json.SettingsJson {
  return {
    core: {
      fontDirectory: BRAVURA_FONT_DIRECTORY,
      enableLazyLoading: ENABLE_LAZY_LOADING,
      useWorkers: USE_WORKERS,
    },
    display: {
      staveProfile: TAB_ONLY_STAVE_PROFILE,
    },
    notation: {
      elements: {
        trackNames: true,
      },
    },
    player: {
      enablePlayer: false,
      soundFont: SONIVOX_SOUND_FONT_PATH,
    },
  };
}

function createAlphaTabApi(container: HTMLElement): AlphaTabApi {
  return new alphaTab.AlphaTabApi(container, buildAlphaTabSettings()) as unknown as AlphaTabApi;
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
      scoreTrackCount: scoreTracks.length,
      scoreTracks: toTrackRuntimeInfoList(scoreTracks, activeApi?.score),
      renderedTracks: toTrackRuntimeInfoList(renderedTracks, activeApi?.score),
    });
  };

  const destroyActiveRenderer = (): void => {
    activeApi?.destroy?.();
    activeApi = null;
  };

  const clearRenderTimeout = (): void => {
    if (activeRenderTimeoutId === null) {
      return;
    }

    window.clearTimeout(activeRenderTimeoutId);
    activeRenderTimeoutId = null;
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
      clearRenderHost(container);
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
    emitDebugInfo();

    const sessionToken = activeSessionToken + 1;
    activeSessionToken = sessionToken;

    destroyActiveRenderer();
    clearRenderHost(container);
    await waitForAnimationFrame();

    if (sessionToken !== activeSessionToken) {
      rendererBusy = false;
      clearRenderTimeout();
      emitDebugInfo();
      return;
    }

    const api = createAlphaTabApi(container);
    activeApi = api;

    api.scoreLoaded.on((score) => {
      if (sessionToken !== activeSessionToken) {
        return;
      }

      applyTrackNamePolicies(score);
      lastLoadedScoreTracks = score.tracks ?? [];
      lastRendererErrorStage = "load";
      hooks.onTracksLoaded(toTrackInfoList(lastLoadedScoreTracks));
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
      clearRenderHost(container);
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
      clearRenderHost(container);
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
    destroy: () => {
      activeSessionToken += 1;
      clearRenderTimeout();
      rendererBusy = false;
      pendingRequestedTrackIndex = null;
      destroyActiveRenderer();
      clearRenderHost(container);
    },
  };
}
