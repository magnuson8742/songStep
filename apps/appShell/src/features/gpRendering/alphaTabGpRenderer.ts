import * as alphaTab from "@coderline/alphatab";

import type { SourceFileData } from "../../domain/project/projectModel";

interface AlphaTabApi {
  load: (scoreData: unknown, trackIndexes?: number[]) => boolean;
  renderTracks: (tracks: AlphaTabTrack[]) => void;
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

interface AlphaTabSettingsJson {
  core?: {
    fontDirectory?: string;
  };
  display?: {
    staveProfile?: string;
  };
  player?: {
    enablePlayer?: boolean;
    soundFont?: string;
  };
}

export interface GpTrackInfo {
  index: number;
  name: string;
}

export interface GpRendererHooks {
  onTracksLoaded: (tracks: GpTrackInfo[]) => void;
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

function buildAlphaTabSettings(): AlphaTabSettingsJson {
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

export async function createGpRenderer(
  container: HTMLElement,
  sourceFile: SourceFileData,
  selectedTrackIndex: number,
  hooks: GpRendererHooks,
): Promise<GpRendererController> {
  const api = createAlphaTabApi(container);
  let loadedTracks: AlphaTabTrack[] = [];

  api.scoreLoaded.on((score) => {
    loadedTracks = score.tracks ?? [];

    hooks.onTracksLoaded(toTrackInfoList(loadedTracks));

    const selectedTrack = loadedTracks.find((track) => track.index === selectedTrackIndex) ?? loadedTracks[0];
    if (selectedTrack) {
      api.renderTracks([selectedTrack]);
    }
  });

  api.error?.on(() => {
    hooks.onRenderError("alphaTab failed to render this GP file.");
  });

  const loadWasStarted = api.load(base64ToBytes(sourceFile.contentBase64), [selectedTrackIndex]);

  if (!loadWasStarted) {
    throw new Error("GP renderer rejected the source data.");
  }

  return {
    selectTrack: (trackIndex: number) => {
      const selectedTrack = loadedTracks.find((track) => track.index === trackIndex);
      if (!selectedTrack) {
        return;
      }

      api.renderTracks([selectedTrack]);
    },
    destroy: () => {
      api.destroy?.();
    },
  };
}
