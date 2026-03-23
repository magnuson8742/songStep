export interface NewProjectSubmitPayload {
  sourceFile: File;
  projectTitle: string;
}

export interface NewProjectScreenActions {
  onBack: () => void;
  onCreateProject: (payload: NewProjectSubmitPayload) => void;
}

function removeGpExtension(fileName: string): string {
  return fileName.replace(/\.(gp\d?|gpx|gp)$/i, "").trim();
}

export function renderNewProjectScreen(
  container: HTMLElement,
  actions: NewProjectScreenActions,
): void {
  container.innerHTML = `
    <main class="appShell">
      <header class="appHeader">
        <h1 class="appTitle">New Project</h1>
        <p class="appSubtitle">Import a GP source file and set initial project information.</p>
      </header>

      <section class="homeCard formBlock">
        <label class="fieldLabel" for="gpSourceFile">GP file</label>
        <input id="gpSourceFile" class="fieldInput" type="file" accept=".gp,.gp3,.gp4,.gp5,.gpx" />
        <p class="helperText" id="selectedFileName">No file selected</p>

        <label class="fieldLabel" for="projectTitle">Project name</label>
        <input id="projectTitle" class="fieldInput" type="text" placeholder="Project name" />
      </section>

      <section class="homeActions" aria-label="New project actions">
        <button class="secondaryButton" type="button" data-action="back">Back</button>
        <button class="primaryButton" type="button" data-action="create-project" disabled>Create Project</button>
      </section>
    </main>
  `;

  const gpSourceFileInput = container.querySelector<HTMLInputElement>("#gpSourceFile");
  const projectTitleInput = container.querySelector<HTMLInputElement>("#projectTitle");
  const selectedFileName = container.querySelector<HTMLElement>("#selectedFileName");
  const createProjectButton = container.querySelector<HTMLButtonElement>(
    '[data-action="create-project"]',
  );
  const backButton = container.querySelector<HTMLButtonElement>('[data-action="back"]');

  let selectedSourceFile: File | null = null;

  const updateCreateButtonState = (): void => {
    const hasFile = Boolean(selectedSourceFile);
    const hasTitle = Boolean(projectTitleInput?.value.trim());

    if (createProjectButton) {
      createProjectButton.disabled = !(hasFile && hasTitle);
    }
  };

  gpSourceFileInput?.addEventListener("change", () => {
    const file = gpSourceFileInput.files?.[0] ?? null;
    selectedSourceFile = file;

    if (selectedFileName) {
      selectedFileName.textContent = file ? `Selected: ${file.name}` : "No file selected";
    }

    if (file && projectTitleInput && !projectTitleInput.value.trim()) {
      projectTitleInput.value = removeGpExtension(file.name) || file.name;
    }

    updateCreateButtonState();
  });

  projectTitleInput?.addEventListener("input", updateCreateButtonState);

  createProjectButton?.addEventListener("click", () => {
    if (!selectedSourceFile || !projectTitleInput) {
      return;
    }

    actions.onCreateProject({
      sourceFile: selectedSourceFile,
      projectTitle: projectTitleInput.value,
    });
  });

  backButton?.addEventListener("click", actions.onBack);
}
