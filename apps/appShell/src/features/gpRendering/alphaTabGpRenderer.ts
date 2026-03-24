import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  renderTracks: (tracks: AlphaTabTrack[]) => void;
  renderScore?: (score: AlphaTabScore, trackIndexes: number[]) => void;
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

export interface GpRenderDebugInfo {
  selectedTrackIndex: number;
  resolvedTrackName: string;
  resolvedTrackIndex: number;
  resolvedTrackPosition: number;
  rendererReloaded: boolean;
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

function buildAlphaTabSettings(): alphaTab.json.SettingsJson {
  return {
    core: {
      fontDirectory: BRAVURA_FONT_DIRECTORY,
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

function createAlphaTabApi(container: HTMLElement): AlphaTabApi {
  return new alphaTab.AlphaTabApi(container, buildAlphaTabSettings()) as unknown as AlphaTabApi;
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

function renderSelectedTrack(api: AlphaTabApi, loadedScore: AlphaTabScore, selection: TrackSelection): void {
  if (api.renderScore) {
    api.renderScore(loadedScore, [selection.trackPosition]);
    return;
  }

  api.renderTracks([selection.track]);
}

export async function createGpRenderer(
  container: HTMLElement,
  sourceFile: SourceFileData,
  selectedTrackIndex: number,
  hooks: GpRendererHooks,
): Promise<GpRendererController> {
  let activeApi: AlphaTabApi | null = null;
  let activeSessionId = 0;
  const sourceBytes = base64ToBytes(sourceFile.contentBase64);

  const startRendererSession = (targetTrackIndex: number, rendererReloaded: boolean): void => {
    activeSessionId += 1;
    const sessionId = activeSessionId;

    activeApi?.destroy?.();
    const api = createAlphaTabApi(container);
    activeApi = api;

    let hasRenderedForSession = false;

    api.scoreLoaded.on((score) => {
      if (sessionId !== activeSessionId || hasRenderedForSession) {
        return;
      }

      const loadedTracks = score.tracks ?? [];
      hooks.onTracksLoaded(toTrackInfoList(loadedTracks));

      const selection = resolveTrackSelection(loadedTracks, targetTrackIndex);
      if (!selection) {
        hooks.onRenderError("No tracks were found in this GP file.");
        return;
      }

      hooks.onDebugInfo({
        selectedTrackIndex: targetTrackIndex,
        resolvedTrackName: selection.track.name || `Track ${selection.track.index + 1}`,
        resolvedTrackIndex: selection.track.index,
        resolvedTrackPosition: selection.trackPosition,
        rendererReloaded,
      });

      hasRenderedForSession = true;
      renderSelectedTrack(api, score, selection);
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
