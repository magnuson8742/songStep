export interface OpenProjectScreenActions {
  onBack: () => void;
  onOpenProjectFile: () => Promise<string | null>;
}

export function renderOpenProjectScreen(
  container: HTMLElement,
  actions: OpenProjectScreenActions,
): void {
  container.innerHTML = `
    <main class="appShell">
      <header class="appHeader">
        <h1 class="appTitle">Open Project</h1>
        <p class="appSubtitle">Select a saved songStep project file to continue.</p>
      </header>

      <section class="homeCard formBlock">
        <label class="fieldLabel">Project file</label>
        <button class="secondaryButton" type="button" data-action="open-project-file">
          Choose Project File
        </button>
        <p class="helperText" id="selectedProjectFile">No project selected</p>
      </section>

      <section class="homeActions" aria-label="Open project actions">
        <button class="secondaryButton" type="button" data-action="back">Back</button>
      </section>
    </main>
  `;

  const selectedProjectFile = container.querySelector<HTMLElement>("#selectedProjectFile");
  const openProjectFileButton = container.querySelector<HTMLButtonElement>(
    '[data-action="open-project-file"]',
  );
  const backButton = container.querySelector<HTMLButtonElement>('[data-action="back"]');

  openProjectFileButton?.addEventListener("click", async () => {
    const openedProjectName = await actions.onOpenProjectFile();

    if (selectedProjectFile && openedProjectName) {
      selectedProjectFile.textContent = `Opened: ${openedProjectName}`;
    }
  });

  backButton?.addEventListener("click", actions.onBack);
}
