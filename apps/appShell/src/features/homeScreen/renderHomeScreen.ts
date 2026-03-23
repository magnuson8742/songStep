export interface HomeScreenActions {
  onNewProject: () => void;
  onOpenProject: () => void;
}

export function renderHomeScreen(container: HTMLElement, actions: HomeScreenActions): void {
  container.innerHTML = `
    <main class="appShell">
      <header class="appHeader">
        <h1 class="appTitle">songStep</h1>
        <p class="appSubtitle">GP player for Windows and Android</p>
      </header>

      <section class="homeCard">
        <h2 class="sectionTitle">Main menu</h2>
        <p class="sectionText">Start a new project from a GP source file or open an existing project.</p>
      </section>

      <section class="homeActions" aria-label="Main menu actions">
        <button class="primaryButton" data-home-action="new-project" type="button">
          New Project
        </button>
        <button class="primaryButton" data-home-action="open-project" type="button">
          Open Project
        </button>
      </section>
    </main>
  `;

  const newProjectButton = container.querySelector<HTMLButtonElement>(
    '[data-home-action="new-project"]',
  );
  const openProjectButton = container.querySelector<HTMLButtonElement>(
    '[data-home-action="open-project"]',
  );

  newProjectButton?.addEventListener("click", actions.onNewProject);
  openProjectButton?.addEventListener("click", actions.onOpenProject);
}
