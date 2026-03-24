import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  renderTracks: (tracks: AlphaTabTrack[]) => void;
  score?: AlphaTabScore;
  tracks?: AlphaTabTrack[];
  destroy?: () => void;
  scoreLoaded: {
    on: (handler: (score: AlphaTabScore) => void) => void;
  };
  renderStarted?: {
    on: (handler: () => void) => void;
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

function getScoreTracks(api: AlphaTabApi, fallbackTracks: AlphaTabTrack[]): AlphaTabTrack[] {
  return api.score?.tracks ?? fallbackTracks;
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

export async function createGpRenderer(
  container: HTMLElement,
  sourceFile: SourceFileData,
  selectedTrackIndex: number,
  hooks: GpRendererHooks,
): Promise<GpRendererController> {
  const api = createAlphaTabApi(container);
  let loadedScoreTracks: AlphaTabTrack[] = [];
  let currentSelectedTrackIndex = selectedTrackIndex;
  let lastSwitchWasManual = false;

  const emitDebugInfo = (): void => {
    const scoreTracks = getScoreTracks(api, loadedScoreTracks);
    const renderedTracks = api.tracks ?? [];
    const selection = resolveTrackSelection(scoreTracks, currentSelectedTrackIndex);

    if (!selection) {
      hooks.onRenderError("No tracks were found in this GP file.");
      return;
    }

    hooks.onDebugInfo({
      selectedTrackIndex: currentSelectedTrackIndex,
      resolvedTrackName: selection.track.name || `Track ${selection.track.index + 1}`,
      resolvedTrackIndex: selection.track.index,
      resolvedTrackPosition: selection.trackPosition,
      rendererReloaded: false,
      scoreTrackCount: scoreTracks.length,
      scoreTracks: toTrackRuntimeInfoList(scoreTracks),
      renderedTracks: toTrackRuntimeInfoList(renderedTracks),
    });

    lastSwitchWasManual = false;
  };

  const renderSelectedTrack = (): void => {
    const scoreTracks = getScoreTracks(api, loadedScoreTracks);
    const selection = resolveTrackSelection(scoreTracks, currentSelectedTrackIndex);
    if (!selection) {
      hooks.onRenderError("No tracks were found in this GP file.");
      return;
    }

    api.renderTracks([selection.track]);
  };

  api.scoreLoaded.on((score) => {
    loadedScoreTracks = score.tracks ?? [];
    hooks.onTracksLoaded(toTrackInfoList(loadedScoreTracks));

    renderSelectedTrack();
    emitDebugInfo();
  });

  api.renderStarted?.on(() => {
    if (!lastSwitchWasManual) {
      return;
    }

    emitDebugInfo();
  });

  api.error?.on(() => {
    hooks.onRenderError("alphaTab failed to render this GP file.");
  });

  const loadWasStarted = api.load(base64ToBytes(sourceFile.contentBase64));
  if (!loadWasStarted) {
    throw new Error("GP renderer rejected the source data.");
  }

  return {
    selectTrack: (trackIndex: number) => {
      currentSelectedTrackIndex = trackIndex;
      lastSwitchWasManual = true;
      renderSelectedTrack();
      emitDebugInfo();
    },
    destroy: () => {
      api.destroy?.();
    },
  };
}
