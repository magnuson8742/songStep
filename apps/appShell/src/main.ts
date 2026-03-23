import "./shared/styles/global.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root element was not found");
}

app.innerHTML = `
  <main class="appShell">
    <header class="appHeader">
      <h1 class="appTitle">songStep</h1>
      <p class="appSubtitle">GP player for Windows and Android</p>
    </header>

    <section class="homeCard">
      <h2 class="sectionTitle">MVP 0.1</h2>
      <ul class="featureList">
        <li>Import GP files</li>
        <li>Manual key selection</li>
        <li>Playback</li>
        <li>Save and open project</li>
      </ul>
    </section>

    <section class="homeCard">
      <h2 class="sectionTitle">Next step</h2>
      <p class="sectionText">
        Prepare the application shell for GP import and project loading.
      </p>
    </section>
  </main>
`;