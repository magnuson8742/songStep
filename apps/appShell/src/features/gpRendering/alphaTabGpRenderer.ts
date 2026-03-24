import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  renderTracks: (tracks: AlphaTabTrack[]) => void;
  renderScore?: (score: AlphaTabScore, trackIndexes: number[]) => void;
  score?: AlphaTabScore;
  tracks?: AlphaTabTrack[];
  destroy?: () => void;
  scoreLoaded: {
    on: (handler: (score: AlphaTabScore) => void) => void;
  };
  error?: {
    on: (handler: (error: unknown) => void) => void;
  };
}

interface AlphaTabScore {
  tracks: AlphaTabTrack[];
}

interface AlphaTabTrack {
  index: number;
  name: string;
}

interface TrackSelection {
  track: AlphaTabTrack;
  trackPosition: number;
}

export interface GpTrackInfo {
  index: number;
  name: string;
}

export interface GpTrackRuntimeInfo {
  position: number;
  trackIndex: number;
  trackName: string;
}

export interface GpRenderDebugInfo {
  selectedTrackIndex: number;
  resolvedTrackName: string;
  resolvedTrackIndex: number;
  resolvedTrackPosition: number;
  rendererReloaded: boolean;
  scoreTrackCount: number;
  scoreTracks: GpTrackRuntimeInfo[];
  renderedTracks: GpTrackRuntimeInfo[];
}

export interface GpRendererHooks {
  onTracksLoaded: (tracks: GpTrackInfo[]) => void;
  onDebugInfo: (debugInfo: GpRenderDebugInfo) => void;
  onRenderError: (message: string) => void;
}

export interface GpRendererController {
  selectTrack: (trackIndex: number) => void;
  destroy: () => void;
}

const BRAVURA_FONT_DIRECTORY = "/font/";
const SONIVOX_SOUND_FONT_PATH = "/soundfont/sonivox.sf2";
const TAB_ONLY_STAVE_PROFILE = "Tab";

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

function toTrackRuntimeInfoList(tracks: AlphaTabTrack[]): GpTrackRuntimeInfo[] {
  return tracks.map((track, position) => ({
    position,
    trackIndex: track.index,
    trackName: track.name || `Track ${track.index + 1}`,
  }));
}

function buildAlphaTabSettings(trackPositions: number[]): alphaTab.json.SettingsJson {
  return {
    core: {
      fontDirectory: BRAVURA_FONT_DIRECTORY,
      tracks: trackPositions,
    },
    display: {
      staveProfile: TAB_ONLY_STAVE_PROFILE,
    },
    player: {
      enablePlayer: false,
      soundFont: SONIVOX_SOUND_FONT_PATH,
    },
  };
}

function createAlphaTabApi(container: HTMLElement, trackPositions: number[]): AlphaTabApi {
  return new alphaTab.AlphaTabApi(container, buildAlphaTabSettings(trackPositions)) as unknown as AlphaTabApi;
}

function resolveTrackPositionFromKnownTracks(knownTracks: AlphaTabTrack[], selectedTrackIndex: number): number {
  const resolvedTrackPosition = knownTracks.findIndex((track) => track.index === selectedTrackIndex);
  if (resolvedTrackPosition >= 0) {
    return resolvedTrackPosition;
  }

  return 0;
}

function resolveTrackSelection(loadedTracks: AlphaTabTrack[], selectedTrackIndex: number): TrackSelection | null {
  if (loadedTracks.length === 0) {
    return null;
  }

  const selectedTrackPosition = loadedTracks.findIndex((track) => track.index === selectedTrackIndex);
  const fallbackTrack = loadedTracks[0];

  if (!fallbackTrack) {
    return null;
  }

  if (selectedTrackPosition < 0) {
    return {
      track: fallbackTrack,
      trackPosition: 0,
    };
  }

  const selectedTrack = loadedTracks[selectedTrackPosition];
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

export async function createGpRenderer(
  container: HTMLElement,
  sourceFile: SourceFileData,
  selectedTrackIndex: number,
  hooks: GpRendererHooks,
): Promise<GpRendererController> {
  let activeApi: AlphaTabApi | null = null;
  let activeSessionId = 0;
  let lastKnownTracks: AlphaTabTrack[] = [];
  const sourceBytes = base64ToBytes(sourceFile.contentBase64);

  const startRendererSession = (targetTrackIndex: number, rendererReloaded: boolean): void => {
    activeSessionId += 1;
    const sessionId = activeSessionId;

    const selectedTrackPosition = resolveTrackPositionFromKnownTracks(lastKnownTracks, targetTrackIndex);

    activeApi?.destroy?.();
    const api = createAlphaTabApi(container, [selectedTrackPosition]);
    activeApi = api;

    let hasHandledScoreLoaded = false;

    api.scoreLoaded.on((score) => {
      if (sessionId !== activeSessionId || hasHandledScoreLoaded) {
        return;
      }

      const loadedTracks = score.tracks ?? [];
      lastKnownTracks = loadedTracks;
      hooks.onTracksLoaded(toTrackInfoList(loadedTracks));

      const selection = resolveTrackSelection(loadedTracks, targetTrackIndex);
      if (!selection) {
        hooks.onRenderError("No tracks were found in this GP file.");
        return;
      }

      const scoreTracks = api.score?.tracks ?? loadedTracks;
      const renderedTracks = api.tracks ?? [];

      hooks.onDebugInfo({
        selectedTrackIndex: targetTrackIndex,
        resolvedTrackName: selection.track.name || `Track ${selection.track.index + 1}`,
        resolvedTrackIndex: selection.track.index,
        resolvedTrackPosition: selection.trackPosition,
        rendererReloaded,
        scoreTrackCount: scoreTracks.length,
        scoreTracks: toTrackRuntimeInfoList(scoreTracks),
        renderedTracks: toTrackRuntimeInfoList(renderedTracks),
      });

      hasHandledScoreLoaded = true;
    });

    api.error?.on(() => {
      if (sessionId !== activeSessionId) {
        return;
      }

      hooks.onRenderError("alphaTab failed to render this GP file.");
    });

    const loadWasStarted = api.load(sourceBytes);
    if (!loadWasStarted) {
      throw new Error("GP renderer rejected the source data.");
    }
  };

  startRendererSession(selectedTrackIndex, false);

  return {
    selectTrack: (trackIndex: number) => {
      try {
        startRendererSession(trackIndex, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not reload GP renderer session.";
        hooks.onRenderError(message);
      }
    },
    destroy: () => {
      activeSessionId += 1;
      activeApi?.destroy?.();
      activeApi = null;
    },
  };
}
