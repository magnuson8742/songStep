import type { SelectedSourceFile } from "../projectPersistence/projectPersistence";

export interface NewProjectSubmitPayload {
  sourceFile: SelectedSourceFile;
  projectTitle: string;
}

export interface NewProjectScreenActions {
  onBack: () => void;
  onPickGpFile: () => Promise<SelectedSourceFile | null>;
  onCreateProject: (payload: NewProjectSubmitPayload) => Promise<void>;
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
        <label class="fieldLabel">GP file</label>
        <button class="secondaryButton" type="button" data-action="pick-gp-file">Choose GP File</button>
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

  const pickGpFileButton = container.querySelector<HTMLButtonElement>('[data-action="pick-gp-file"]');
  const projectTitleInput = container.querySelector<HTMLInputElement>("#projectTitle");
  const selectedFileName = container.querySelector<HTMLElement>("#selectedFileName");
  const createProjectButton = container.querySelector<HTMLButtonElement>(
    '[data-action="create-project"]',
  );
  const backButton = container.querySelector<HTMLButtonElement>('[data-action="back"]');

  let selectedSourceFile: SelectedSourceFile | null = null;

  const updateCreateButtonState = (): void => {
    const hasFile = Boolean(selectedSourceFile);
    const hasTitle = Boolean(projectTitleInput?.value.trim());

    if (createProjectButton) {
      createProjectButton.disabled = !(hasFile && hasTitle);
    }
  };

  pickGpFileButton?.addEventListener("click", async () => {
    const sourceFile = await actions.onPickGpFile();
    if (!sourceFile) {
      return;
    }

    selectedSourceFile = sourceFile;

    if (selectedFileName) {
      selectedFileName.textContent = `Selected: ${sourceFile.fileName}`;
    }

    if (projectTitleInput && !projectTitleInput.value.trim()) {
      projectTitleInput.value = removeGpExtension(sourceFile.fileName) || sourceFile.fileName;
    }

    updateCreateButtonState();
  });

  projectTitleInput?.addEventListener("input", updateCreateButtonState);

  createProjectButton?.addEventListener("click", async () => {
    if (!selectedSourceFile || !projectTitleInput) {
      return;
    }

    await actions.onCreateProject({
      sourceFile: selectedSourceFile,
      projectTitle: projectTitleInput.value,
    });
  });

  backButton?.addEventListener("click", actions.onBack);
}
