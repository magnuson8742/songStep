import type { SourceFileData } from "../../domain/project/projectModel";

const ALPHATAB_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@coderline/alphatab@1.5.0/dist/alphaTab.js";

let alphaTabLoadPromise: Promise<AlphaTabGlobal> | null = null;

interface AlphaTabGlobal {
  AlphaTabApi: new (element: HTMLElement, settings: unknown) => AlphaTabApi;
}

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

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function getAlphaTabFromWindow(): AlphaTabGlobal | null {
  const candidate = (window as Window & { alphaTab?: AlphaTabGlobal }).alphaTab;

  if (!candidate?.AlphaTabApi) {
    return null;
  }

  return candidate;
}

async function loadAlphaTab(): Promise<AlphaTabGlobal> {
  const existing = getAlphaTabFromWindow();
  if (existing) {
    return existing;
  }

  if (!alphaTabLoadPromise) {
    alphaTabLoadPromise = new Promise<AlphaTabGlobal>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = ALPHATAB_SCRIPT_URL;
      script.async = true;

      script.onload = () => {
        const loaded = getAlphaTabFromWindow();
        if (!loaded) {
          reject(new Error("alphaTab script loaded but API is unavailable."));
          return;
        }

        resolve(loaded);
      };

      script.onerror = () => {
        reject(new Error("Could not load alphaTab renderer script."));
      };

      document.head.appendChild(script);
    });
  }

  return alphaTabLoadPromise;
}

function toTrackInfoList(tracks: AlphaTabTrack[]): GpTrackInfo[] {
  return tracks.map((track) => ({
    index: track.index,
    name: track.name || `Track ${track.index + 1}`,
  }));
}

export async function createGpRenderer(
  container: HTMLElement,
  sourceFile: SourceFileData,
  selectedTrackIndex: number,
  hooks: GpRendererHooks,
): Promise<GpRendererController> {
  const alphaTab = await loadAlphaTab();
  const api = new alphaTab.AlphaTabApi(container, {});
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
