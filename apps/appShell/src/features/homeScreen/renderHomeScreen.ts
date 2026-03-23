export function renderHomeScreen(container: HTMLElement): void {
  container.innerHTML = `
    <main class="appShell">
      <header class="appHeader">
        <h1 class="appTitle">songStep</h1>
        <p class="appSubtitle">GP player for Windows and Android</p>
      </header>

      <section class="homeCard">
        <h2 class="sectionTitle">MVP 0.1</h2>
        <ul class="featureList">
          <li>Import GP files</li>
          <li>Manual key selection during import</li>
          <li>Playback</li>
          <li>Save and open self-contained project</li>
        </ul>
      </section>

      <section class="homeActions" aria-label="Home actions">
        <button class="primaryButton" data-home-action="import-gp" type="button">
          Import GP
        </button>
        <button class="primaryButton" data-home-action="open-project" type="button">
          Open Project
        </button>
      </section>
    </main>
  `;

  const importButton = container.querySelector<HTMLButtonElement>(
    '[data-home-action="import-gp"]',
  );
  const openProjectButton = container.querySelector<HTMLButtonElement>(
    '[data-home-action="open-project"]',
  );

  importButton?.addEventListener("click", () => {
    alert("Import GP flow will be added in the next step.");
  });

  openProjectButton?.addEventListener("click", () => {
    alert("Open Project flow will be added in the next step.");
  });
}
