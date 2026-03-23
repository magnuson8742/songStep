import type { SongStepProject } from "../../domain/project/projectModel";

export interface ProjectScreenActions {
  statusMessage: string | null;
  onBackToHome: () => void;
  onSaveProject: () => Promise<void>;
  onPlay: () => void;
  onPause: () => void;
}

export function renderProjectScreen(
  container: HTMLElement,
  project: SongStepProject,
  actions: ProjectScreenActions,
): void {
  const statusBanner = actions.statusMessage
    ? `<p class="statusBanner" role="status">${actions.statusMessage}</p>`
    : "";

  container.innerHTML = `
    <main class="appShell">
      <header class="appHeader projectHeader">
        <div>
          <h1 class="appTitle">${project.title}</h1>
          <p class="appSubtitle">Source file: ${project.sourceFile.fileName}</p>
        </div>
        <div class="projectTopActions">
          <button class="secondaryButton" type="button" data-action="back-home">Main Menu</button>
          <button class="primaryButton" type="button" data-action="save-project">Save Project</button>
        </div>
      </header>

      ${statusBanner}

      <section class="homeCard">
        <h2 class="sectionTitle">Tab area</h2>
        <p class="sectionText">Tab rendering will be connected in the next step.</p>
      </section>

      <section class="homeCard">
        <h2 class="sectionTitle">Playback controls</h2>
        <div class="homeActions" aria-label="Playback controls">
          <button class="primaryButton" type="button" data-action="play">Play</button>
          <button class="secondaryButton" type="button" data-action="pause">Pause</button>
        </div>
        <p class="helperText">Playback is currently a placeholder in MVP 0.1.</p>
      </section>
    </main>
  `;

  const saveProjectButton = container.querySelector<HTMLButtonElement>('[data-action="save-project"]');
  const playButton = container.querySelector<HTMLButtonElement>('[data-action="play"]');
  const pauseButton = container.querySelector<HTMLButtonElement>('[data-action="pause"]');
  const backHomeButton = container.querySelector<HTMLButtonElement>('[data-action="back-home"]');

  saveProjectButton?.addEventListener("click", actions.onSaveProject);
  playButton?.addEventListener("click", actions.onPlay);
  pauseButton?.addEventListener("click", actions.onPause);
  backHomeButton?.addEventListener("click", actions.onBackToHome);
}
