export interface OpenProjectScreenActions {
  onBack: () => void;
  onProjectFileSelected: (projectFile: File) => void;
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
        <label class="fieldLabel" for="projectFile">Project file</label>
        <input id="projectFile" class="fieldInput" type="file" accept=".songstep.json,application/json" />
        <p class="helperText" id="selectedProjectFile">No project selected</p>
      </section>

      <section class="homeActions" aria-label="Open project actions">
        <button class="secondaryButton" type="button" data-action="back">Back</button>
      </section>
    </main>
  `;

  const projectFileInput = container.querySelector<HTMLInputElement>("#projectFile");
  const selectedProjectFile = container.querySelector<HTMLElement>("#selectedProjectFile");
  const backButton = container.querySelector<HTMLButtonElement>('[data-action="back"]');

  projectFileInput?.addEventListener("change", () => {
    const file = projectFileInput.files?.[0] ?? null;

    if (selectedProjectFile) {
      selectedProjectFile.textContent = file ? `Selected: ${file.name}` : "No project selected";
    }

    if (file) {
      actions.onProjectFileSelected(file);
    }
  });

  backButton?.addEventListener("click", actions.onBack);
}
