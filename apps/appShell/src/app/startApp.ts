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

type AppView = "home" | "newProject" | "openProject" | "project";

interface PlaybackBarAnchor {
  barNumber: number;
  x: number;
  y: number;
  height: number;
}

const ENABLE_CUSTOM_PLAYHEAD = false;

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
  playbackPositionLabel: string | null;
  playbackCurrentBar: number | null;
  playbackCurrentTick: number | null;
  playbackIsPlaying: boolean | null;
  playerPositionPayloadShape: string | null;
  playerStatePayloadShape: string | null;
  currentBarSourcePath: string | null;
  playbackFollowTargetFound: boolean;
  playbackFollowSource: string | null;
  playbackBarAnchorCount: number;
  playbackBarAnchorSource: string | null;
  playbackAnchorStrategyAttempts: string | null;
  renderHostHasSvg: boolean;
  renderHostChildTags: string | null;
  renderHostTopTagClassCombos: string | null;
  renderHostElementCounts: string | null;
  playbackPlayheadVisible: boolean;
  playbackBarAnchors: PlaybackBarAnchor[];
  activeTrackName: string | null;
  scoreOverview: GpScoreOverviewRuntimeInfo | null;
  trackVolumeByIndex: Record<number, number>;
  trackBalanceByIndex: Record<number, number>;
  mutedTrackIndexes: number[];
  soloTrackIndexes: number[];
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
    const badge = item.querySelector<HTMLElement>("[data-track-state-badge]");
    if (badge) {
      badge.textContent = isActive ? "Active" : "Idle";
    }
  });
}

function renderPlayerFieldValue(value: string | number | null): string {
  if (value === null || value === "") {
    return "-";
  }

  return String(value);
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

  const balanceInputs = rootElement.querySelectorAll<HTMLInputElement>("[data-track-balance-index]");
  balanceInputs.forEach((input) => {
    const trackIndex = Number(input.dataset.trackBalanceIndex);
    if (Number.isNaN(trackIndex)) {
      return;
    }

    const value = state.trackBalanceByIndex[trackIndex] ?? 0;
    input.value = String(value);
    const valueLabel = rootElement.querySelector<HTMLElement>(`[data-track-balance-value="${trackIndex}"]`);
    if (valueLabel) {
      valueLabel.textContent = `${value}`;
    }
  });
}

function updateArrangementOverview(state: AppState, rootElement: HTMLElement): void {
  const overviewContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-overview='true']");
  const barHeaderContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-bar-header]");
  const rowsContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-rows]");
  const markersContainer = rootElement.querySelector<HTMLElement>("[data-arrangement-markers]");
  const emptyState = rootElement.querySelector<HTMLElement>("[data-arrangement-empty]");

  if (!overviewContainer || !barHeaderContainer || !rowsContainer || !markersContainer || !emptyState) {
    return;
  }

  const overview = state.scoreOverview;
  if (!overview || overview.trackRows.length === 0 || overview.totalBars <= 0) {
    overviewContainer.style.removeProperty("--arrangement-bar-count");
    overviewContainer.style.removeProperty("--arrangement-grid-width");
    barHeaderContainer.innerHTML = "";
    rowsContainer.innerHTML = "";
    markersContainer.innerHTML = "";
    markersContainer.style.height = "16px";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";
  const arrangementBarCount = Math.max(overview.totalBars, 1);
  const arrangementGridWidthPx = arrangementBarCount * 19;
  overviewContainer.style.setProperty("--arrangement-bar-count", String(arrangementBarCount));
  overviewContainer.style.setProperty("--arrangement-grid-width", `${arrangementGridWidthPx}px`);
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
        <div class="arrangementRow" data-arrangement-track-index="${row.trackIndex}">
          <span class="arrangementTrackLabel">${row.trackName}</span>
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
}

function updateArrangementPlaybackHighlight(state: AppState, rootElement: HTMLElement): void {
  const arrangementCells = rootElement.querySelectorAll<HTMLElement>("[data-arrangement-bar-index]");
  arrangementCells.forEach((cell) => {
    cell.classList.remove("isPlaybackCurrentBar");
  });

  if (state.playbackCurrentBar === null || state.playbackCurrentBar <= 0) {
    return;
  }

  const playbackBarIndex = state.playbackCurrentBar - 1;
  const activeTrackIndex = state.gpRenderDebugInfo?.confirmedActiveTrackIndex ?? state.selectedTrackIndex;
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

function hidePlaybackPlayhead(rootElement: HTMLElement, state: AppState): void {
  const playhead = rootElement.querySelector<HTMLElement>("[data-playback-playhead='true']");
  if (playhead) {
    playhead.style.display = "none";
  }

  state.playbackPlayheadVisible = false;
}

function updateRenderHostDomDiagnostics(state: AppState, rootElement: HTMLElement, renderHost: HTMLElement): void {
  const hasSvg = renderHost.querySelector("svg") !== null;
  const firstLevelChildTags = Array.from(renderHost.children)
    .slice(0, 8)
    .map((child) => child.tagName.toLowerCase())
    .join(", ");

  const elements = Array.from(renderHost.querySelectorAll<HTMLElement>("*"));
  const tagClassCombos = Array.from(
    new Set(
      elements
        .slice(0, 120)
        .map((element) => {
          const firstClass = element.className.trim().split(/\s+/)[0] ?? "";
          return firstClass ? `${element.tagName.toLowerCase()}.${firstClass}` : element.tagName.toLowerCase();
        }),
    ),
  )
    .slice(0, 10)
    .join(", ");

  const elementCounts = [
    `svg=${renderHost.querySelectorAll("svg").length}`,
    `g=${renderHost.querySelectorAll("g").length}`,
    `rect=${renderHost.querySelectorAll("rect").length}`,
    `line=${renderHost.querySelectorAll("line").length}`,
    `text=${renderHost.querySelectorAll("text").length}`,
    `class=${renderHost.querySelectorAll("[class]").length}`,
    `id=${renderHost.querySelectorAll("[id]").length}`,
  ].join(", ");

  state.renderHostHasSvg = hasSvg;
  state.renderHostChildTags = firstLevelChildTags || null;
  state.renderHostTopTagClassCombos = tagClassCombos || null;
  state.renderHostElementCounts = elementCounts;
  updateDebugField(rootElement, "render-host-has-svg", hasSvg ? "yes" : "no");
  updateDebugField(rootElement, "render-host-child-tags", firstLevelChildTags || "-");
  updateDebugField(rootElement, "render-host-tag-class", tagClassCombos || "-");
  updateDebugField(rootElement, "render-host-element-counts", elementCounts);
}

function rebuildPlaybackBarAnchors(state: AppState, rootElement: HTMLElement): void {
  if (!ENABLE_CUSTOM_PLAYHEAD) {
    state.playbackBarAnchors = [];
    state.playbackBarAnchorCount = 0;
    state.playbackBarAnchorSource = "disabled";
    state.playbackAnchorStrategyAttempts = "disabled";
    updateDebugField(rootElement, "playback-bar-anchor-count", "0");
    updateDebugField(rootElement, "playback-bar-anchor-source", "disabled");
    updateDebugField(rootElement, "playback-anchor-strategy-attempts", "disabled");
    updateDebugField(rootElement, "render-host-has-svg", "-");
    updateDebugField(rootElement, "render-host-child-tags", "-");
    updateDebugField(rootElement, "render-host-tag-class", "-");
    updateDebugField(rootElement, "render-host-element-counts", "-");
    return;
  }

  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    state.playbackBarAnchors = [];
    state.playbackBarAnchorCount = 0;
    state.playbackBarAnchorSource = null;
    updateDebugField(rootElement, "playback-bar-anchor-count", "0");
    updateDebugField(rootElement, "playback-bar-anchor-source", "-");
    state.playbackAnchorStrategyAttempts = null;
    updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
    return;
  }
  updateRenderHostDomDiagnostics(state, rootElement, renderHost);

  const selectorStrategies = [
    {
      source: "dom:[data-bar-index]",
      resolveAnchors: () => Array.from(renderHost.querySelectorAll<HTMLElement>("[data-bar-index]")),
    },
    {
      source: "dom:.at-bar",
      resolveAnchors: () => Array.from(renderHost.querySelectorAll<HTMLElement>(".at-bar")),
    },
    {
      source: "geometry:svg-line-vertical",
      resolveAnchors: () =>
        Array.from(renderHost.querySelectorAll<SVGLineElement>("svg line")).filter((line) => {
          const x1 = Number(line.getAttribute("x1"));
          const x2 = Number(line.getAttribute("x2"));
          const y1 = Number(line.getAttribute("y1"));
          const y2 = Number(line.getAttribute("y2"));
          return Number.isFinite(x1) && Number.isFinite(x2) && Number.isFinite(y1) && Number.isFinite(y2) && Math.abs(x1 - x2) <= 0.8 && Math.abs(y1 - y2) > 16;
        }),
    },
    {
      source: "geometry:svg-rect-vertical",
      resolveAnchors: () =>
        Array.from(renderHost.querySelectorAll<SVGRectElement>("svg rect")).filter((rect) => {
          const width = Number(rect.getAttribute("width"));
          const height = Number(rect.getAttribute("height"));
          return Number.isFinite(width) && Number.isFinite(height) && width > 0 && width <= 3 && height > 18;
        }),
    },
  ] as const;
  const renderHostRect = renderHost.getBoundingClientRect();
  const totalBars = state.totalBars ?? 0;
  const strategyAttempts: string[] = [];

  for (const strategy of selectorStrategies) {
    const elements = strategy.resolveAnchors();
    strategyAttempts.push(`${strategy.source} => ${elements.length}`);
    if (elements.length === 0) {
      continue;
    }

    const rawAnchors = elements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width < 2 && rect.height < 6) {
          return null;
        }

        return {
          x: rect.left - renderHostRect.left + renderHost.scrollLeft,
          y: rect.top - renderHostRect.top + renderHost.scrollTop,
          height: Math.max(rect.height, 28),
        };
      })
      .filter((anchor): anchor is { x: number; y: number; height: number } => anchor !== null)
      .sort((left, right) => (left.y === right.y ? left.x - right.x : left.y - right.y));

    if (rawAnchors.length === 0) {
      continue;
    }

    const dedupedAnchors = rawAnchors.filter((anchor, index) => {
      if (index === 0) {
        return true;
      }

      const previous = rawAnchors[index - 1];
      if (!previous) {
        return true;
      }

      return Math.abs(anchor.x - previous.x) > 8 || Math.abs(anchor.y - previous.y) > 8;
    });
    const limitedAnchors = totalBars > 0 ? dedupedAnchors.slice(0, totalBars) : dedupedAnchors;
    if (limitedAnchors.length === 0) {
      continue;
    }

    state.playbackBarAnchors = limitedAnchors.map((anchor, index) => ({
      barNumber: index + 1,
      x: anchor.x,
      y: anchor.y,
      height: anchor.height,
    }));
    state.playbackBarAnchorCount = state.playbackBarAnchors.length;
    state.playbackBarAnchorSource = strategy.source;
    state.playbackAnchorStrategyAttempts = strategyAttempts.join(" | ");
    updateDebugField(rootElement, "playback-bar-anchor-count", String(state.playbackBarAnchorCount));
    updateDebugField(rootElement, "playback-bar-anchor-source", strategy.source);
    updateDebugField(rootElement, "playback-anchor-strategy-attempts", state.playbackAnchorStrategyAttempts);
    return;
  }

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
}

function updatePlaybackPlayheadFromRuntime(state: AppState, rootElement: HTMLElement): void {
  if (!ENABLE_CUSTOM_PLAYHEAD) {
    hidePlaybackPlayhead(rootElement, state);
    return;
  }

  if (state.playbackCurrentBar === null || state.playbackCurrentBar <= 0) {
    hidePlaybackPlayhead(rootElement, state);
    return;
  }

  const anchor = state.playbackBarAnchors.find((item) => item.barNumber === state.playbackCurrentBar);
  if (!anchor) {
    hidePlaybackPlayhead(rootElement, state);
    return;
  }

  const playhead = ensurePlaybackPlayheadElement(rootElement);
  if (!playhead) {
    state.playbackPlayheadVisible = false;
    return;
  }

  playhead.style.left = `${anchor.x}px`;
  playhead.style.top = `${anchor.y}px`;
  playhead.style.height = `${Math.max(anchor.height, 28)}px`;
  playhead.style.display = "block";
  state.playbackPlayheadVisible = true;
}

function updatePlaybackFollowDiagnostics(
  rootElement: HTMLElement,
  followTargetFound: boolean,
  followSource: string | null,
): void {
  updateDebugField(rootElement, "playback-follow-target-found", followTargetFound ? "yes" : "no");
  updateDebugField(rootElement, "playback-follow-source", followSource ?? "-");
}

function resolvePlaybackFollowTarget(renderHost: HTMLElement): { targetElement: HTMLElement; source: string } | null {
  const customPlayhead = renderHost.querySelector<HTMLElement>("[data-playback-playhead='true']");
  if (customPlayhead && customPlayhead.style.display !== "none") {
    return {
      targetElement: customPlayhead,
      source: "custom:playhead",
    };
  }

  const selectorPriority = [
    { selector: ".at-cursor-beat", source: "alphaTab:cursor-beat" },
    { selector: ".at-cursor-bar", source: "alphaTab:cursor-bar" },
    { selector: ".at-cursor", source: "alphaTab:cursor" },
    { selector: ".at-highlight", source: "alphaTab:highlight" },
    { selector: "[class*='cursor']", source: "dom:cursor-class" },
  ] as const;

  for (const entry of selectorPriority) {
    const candidate = renderHost.querySelector<HTMLElement>(entry.selector);
    if (!candidate) {
      continue;
    }

    const candidateRect = candidate.getBoundingClientRect();
    if (candidateRect.width <= 0 && candidateRect.height <= 0) {
      continue;
    }

    return {
      targetElement: candidate,
      source: entry.source,
    };
  }

  return null;
}

function updatePlaybackFollowInRenderHost(state: AppState, rootElement: HTMLElement): void {
  if (!ENABLE_CUSTOM_PLAYHEAD) {
    state.playbackFollowTargetFound = false;
    state.playbackFollowSource = "disabled";
    updatePlaybackFollowDiagnostics(rootElement, false, "disabled");
    return;
  }

  const renderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
  if (!renderHost) {
    return;
  }

  if (!state.playbackIsPlaying || state.playbackCurrentTick === null) {
    state.playbackFollowTargetFound = false;
    state.playbackFollowSource = null;
    updatePlaybackFollowDiagnostics(rootElement, false, null);
    return;
  }

  const followTarget = resolvePlaybackFollowTarget(renderHost);
  if (!followTarget) {
    state.playbackFollowTargetFound = false;
    state.playbackFollowSource = "none";
    updatePlaybackFollowDiagnostics(rootElement, false, "none");
    return;
  }

  state.playbackFollowTargetFound = true;
  state.playbackFollowSource = followTarget.source;
  updatePlaybackFollowDiagnostics(rootElement, true, followTarget.source);

  const targetRect = followTarget.targetElement.getBoundingClientRect();
  const hostRect = renderHost.getBoundingClientRect();

  const targetCenterX = targetRect.left - hostRect.left + renderHost.scrollLeft + targetRect.width / 2;
  const targetCenterY = targetRect.top - hostRect.top + renderHost.scrollTop + targetRect.height / 2;
  const horizontalMargin = Math.max(renderHost.clientWidth * 0.25, 32);
  const verticalMargin = Math.max(renderHost.clientHeight * 0.25, 24);

  const leftBound = renderHost.scrollLeft + horizontalMargin;
  const rightBound = renderHost.scrollLeft + renderHost.clientWidth - horizontalMargin;
  const topBound = renderHost.scrollTop + verticalMargin;
  const bottomBound = renderHost.scrollTop + renderHost.clientHeight - verticalMargin;

  let nextScrollLeft = renderHost.scrollLeft;
  let nextScrollTop = renderHost.scrollTop;

  if (targetCenterX < leftBound || targetCenterX > rightBound) {
    nextScrollLeft = targetCenterX - renderHost.clientWidth / 2;
  }
  if (targetCenterY < topBound || targetCenterY > bottomBound) {
    nextScrollTop = targetCenterY - renderHost.clientHeight / 2;
  }

  const maxScrollLeft = Math.max(renderHost.scrollWidth - renderHost.clientWidth, 0);
  const maxScrollTop = Math.max(renderHost.scrollHeight - renderHost.clientHeight, 0);
  const clampedScrollLeft = Math.min(Math.max(nextScrollLeft, 0), maxScrollLeft);
  const clampedScrollTop = Math.min(Math.max(nextScrollTop, 0), maxScrollTop);

  if (Math.abs(clampedScrollLeft - renderHost.scrollLeft) > 4 || Math.abs(clampedScrollTop - renderHost.scrollTop) > 4) {
    renderHost.scrollTo({
      left: clampedScrollLeft,
      top: clampedScrollTop,
      behavior: "auto",
    });
  }
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
    playbackPositionLabel: null,
    playbackCurrentBar: null,
    playbackCurrentTick: null,
    playbackIsPlaying: null,
    playerPositionPayloadShape: null,
    playerStatePayloadShape: null,
    currentBarSourcePath: null,
    playbackFollowTargetFound: false,
    playbackFollowSource: null,
    playbackBarAnchorCount: 0,
    playbackBarAnchorSource: null,
    playbackAnchorStrategyAttempts: null,
    renderHostHasSvg: false,
    renderHostChildTags: null,
    renderHostTopTagClassCombos: null,
    renderHostElementCounts: null,
    playbackPlayheadVisible: false,
    playbackBarAnchors: [],
    activeTrackName: null,
    scoreOverview: null,
    trackVolumeByIndex: {},
    trackBalanceByIndex: {},
    mutedTrackIndexes: [],
    soloTrackIndexes: [],
  };

  const cleanupRenderer = (): void => {
    if (!state.gpRenderer) {
      return;
    }

    state.gpRenderer.destroy();
    state.gpRenderer = null;
  };

  const render = (): void => {
    if (state.currentView !== "project") {
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
          state.playbackIsPlaying = null;
          state.playerPositionPayloadShape = null;
          state.playerStatePayloadShape = null;
          state.currentBarSourcePath = null;
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
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
          state.trackBalanceByIndex = {};
          state.mutedTrackIndexes = [];
          state.soloTrackIndexes = [];
          state.lastClickedTrackIndex = null;
          state.clickCounter = 0;
          state.lastClickTimestampIso = null;
          state.selectionFired = false;
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
            state.playbackIsPlaying = null;
            state.playerPositionPayloadShape = null;
            state.playerStatePayloadShape = null;
            state.currentBarSourcePath = null;
            state.playbackFollowTargetFound = false;
            state.playbackFollowSource = null;
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
            state.trackBalanceByIndex = {};
            state.mutedTrackIndexes = [];
            state.soloTrackIndexes = [];
            state.lastClickedTrackIndex = null;
            state.clickCounter = 0;
            state.lastClickTimestampIso = null;
            state.selectionFired = false;
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
      cleanupRenderer();

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
        playbackIsPlaying: state.playbackIsPlaying,
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
        trackBalanceByIndex: state.trackBalanceByIndex,
        mutedTrackIndexes: state.mutedTrackIndexes,
        soloTrackIndexes: state.soloTrackIndexes,
        onTrackSelectionChange: (trackIndex: number) => {
          state.requestedTrackIndex = trackIndex;
          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playerPositionPayloadShape = null;
          state.playerStatePayloadShape = null;
          state.currentBarSourcePath = null;
          state.lastClickedTrackIndex = trackIndex;
          state.clickCounter += 1;
          state.lastClickTimestampIso = new Date().toISOString();
          state.selectionFired = true;

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
          updatePlaybackFollowDiagnostics(rootElement, false, null);
          updateArrangementPlaybackHighlight(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
          state.gpRenderer?.selectTrack(trackIndex);
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
        onToggleTrackMute: (trackIndex) => {
          const isMuted = state.mutedTrackIndexes.includes(trackIndex);
          state.mutedTrackIndexes = isMuted
            ? state.mutedTrackIndexes.filter((value) => value !== trackIndex)
            : [...state.mutedTrackIndexes, trackIndex];
          updateTrackToggleVisualState(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
        },
        onToggleTrackSolo: (trackIndex) => {
          const isSolo = state.soloTrackIndexes.includes(trackIndex);
          state.soloTrackIndexes = isSolo
            ? state.soloTrackIndexes.filter((value) => value !== trackIndex)
            : [...state.soloTrackIndexes, trackIndex];
          updateTrackToggleVisualState(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
        },
        onTrackVolumeChange: (trackIndex, volume) => {
          state.trackVolumeByIndex[trackIndex] = volume;
          updateTrackControlVisualState(state, rootElement);
        },
        onTrackBalanceChange: (trackIndex, balance) => {
          state.trackBalanceByIndex[trackIndex] = balance;
          updateTrackControlVisualState(state, rootElement);
        },
        onPlay: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }

          state.gpRenderer.play();
        },
        onPause: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }

          state.gpRenderer.pause();
        },
        onStop: () => {
          if (!state.gpRenderer) {
            state.projectStatusMessage = "Playback is unavailable because renderer is not ready.";
            updateProjectStatusBanner(rootElement, state.projectStatusMessage);
            return;
          }

          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
          state.playbackPlayheadVisible = false;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          updatePlaybackFollowDiagnostics(rootElement, false, null);
          updateDebugField(rootElement, "playback-bar-anchor-count", "0");
          updateDebugField(rootElement, "playback-bar-anchor-source", "-");
          updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
          updateArrangementPlaybackHighlight(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
          state.gpRenderer.stop();
        },
      });

      const gpRenderHost = rootElement.querySelector<HTMLElement>("#gpRenderHost");
      if (!gpRenderHost) {
        state.projectStatusMessage = "GP render area is unavailable.";
        return;
      }

      updateArrangementOverview(state, rootElement);
      updateTrackControlVisualState(state, rootElement);

      const project = state.currentProject;
      createGpRenderer(gpRenderHost, project.sourceFile, state.selectedTrackIndex, {
        onTracksLoaded: (tracks) => {
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
          render();
        },
        onDebugInfo: (debugInfo) => {
          state.gpRenderDebugInfo = debugInfo;
          state.activeTrackName = debugInfo.confirmedActiveTrackName ?? null;
          updateProjectDebugInfoPanel(rootElement, debugInfo);
          updatePlayerRuntimeFields(state, rootElement);
          updateDebugField(rootElement, "requested-track-index", String(state.requestedTrackIndex ?? "-"));
          updateDebugField(rootElement, "last-clicked-track-index", String(state.lastClickedTrackIndex ?? "-"));
          updateDebugField(rootElement, "click-counter", String(state.clickCounter));
          updateDebugField(rootElement, "last-click-timestamp", state.lastClickTimestampIso ?? "-");
          updateDebugField(rootElement, "selection-fired", state.selectionFired ? "yes" : "no");
          updateTrackStripActive(rootElement, debugInfo.confirmedActiveTrackIndex);
          if (debugInfo.lastRendererErrorStage === "renderFinished") {
            rebuildPlaybackBarAnchors(state, rootElement);
            updatePlaybackPlayheadFromRuntime(state, rootElement);
          }
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
            if (state.trackBalanceByIndex[row.trackIndex] === undefined) {
              state.trackBalanceByIndex[row.trackIndex] = 0;
            }
          });
          updateArrangementOverview(state, rootElement);
          updateTrackControlVisualState(state, rootElement);
          rebuildPlaybackBarAnchors(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
        },
        onPlaybackRuntimeInfo: (info) => {
          state.playbackIsPlaying = info.isPlaying;
          state.playbackPositionLabel = info.positionLabel;
          state.playbackCurrentBar = info.currentBar;
          state.playbackCurrentTick = info.currentTick;
          state.playerPositionPayloadShape = info.playerPositionPayloadShape;
          state.playerStatePayloadShape = info.playerStatePayloadShape;
          state.currentBarSourcePath = info.currentBarSourcePath;
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
          updatePlaybackFollowInRenderHost(state, rootElement);
        },
        onRuntimeNotice: (message) => {
          state.projectStatusMessage = message;
          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
          state.playbackPlayheadVisible = false;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          updateProjectStatusBanner(rootElement, message);
          updateDebugField(rootElement, "current-tick", "-");
          updateDebugField(rootElement, "playback-bar-anchor-count", "0");
          updateDebugField(rootElement, "playback-bar-anchor-source", "-");
          updateDebugField(rootElement, "playback-anchor-strategy-attempts", "-");
          updatePlaybackFollowDiagnostics(rootElement, false, null);
          updateArrangementPlaybackHighlight(state, rootElement);
          hidePlaybackPlayhead(rootElement, state);
        },
        onActiveTrackConfirmed: (trackIndex) => {
          state.selectedTrackIndex = trackIndex;
          state.playbackCurrentBar = null;
          state.playbackCurrentTick = null;
          state.playbackFollowTargetFound = false;
          state.playbackFollowSource = null;
          state.playbackPlayheadVisible = false;
          state.playbackBarAnchorCount = 0;
          state.playbackBarAnchorSource = null;
          state.playbackAnchorStrategyAttempts = null;
          state.currentBarSourcePath = null;
          state.requestedTrackIndex = null;
          state.selectionFired = false;
          if (state.currentProject) {
            state.currentProject.viewState.selectedTrackIndex = trackIndex;
          }
          state.activeTrackName = state.gpTracks.find((track) => track.index === trackIndex)?.name ?? state.activeTrackName;

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
        onRenderError: (message) => {
          state.projectStatusMessage = message;
          render();
        },
      })
        .then((renderer) => {
          state.gpRenderer = renderer;
        })
        .catch((error: unknown) => {
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
