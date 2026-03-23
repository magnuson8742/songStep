import type { SongStepProject } from "../domain/project/projectModel";
import { renderHomeScreen } from "../features/homeScreen/renderHomeScreen";
import {
  renderNewProjectScreen,
  type NewProjectSubmitPayload,
} from "../features/newProject/renderNewProjectScreen";
import { renderOpenProjectScreen } from "../features/openProject/renderOpenProjectScreen";
import {
  createProjectFromSource,
  pickAndLoadProjectFromDisk,
  pickGpSourceFile,
  saveProjectToDisk,
} from "../features/projectPersistence/projectPersistence";
import { renderProjectScreen } from "../features/projectScreen/renderProjectScreen";

type AppView = "home" | "newProject" | "openProject" | "project";

interface AppState {
  currentView: AppView;
  currentProject: SongStepProject | null;
}

function sourceNameFromProject(project: SongStepProject): string {
  return project.sourceFile.fileName;
}

export function startApp(rootElement: HTMLElement): void {
  const state: AppState = {
    currentView: "home",
    currentProject: null,
  };

  const render = (): void => {
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
            render();
            return sourceNameFromProject(project);
          } catch (error) {
            alert(error instanceof Error ? error.message : "Could not open project.");
            return null;
          }
        },
      });
      return;
    }

    if (state.currentView === "project" && state.currentProject) {
      renderProjectScreen(rootElement, state.currentProject, {
        onBackToHome: () => {
          state.currentView = "home";
          render();
        },
        onSaveProject: async () => {
          if (!state.currentProject) {
            return;
          }

          try {
            const wasSaved = await saveProjectToDisk(state.currentProject);
            if (!wasSaved) {
              return;
            }

            alert("Project saved.");
          } catch (error) {
            alert(error instanceof Error ? error.message : "Project save failed.");
          }
        },
        onPlay: () => {
          alert("Playback engine is not connected yet. This is a placeholder.");
        },
        onPause: () => {
          alert("Playback engine is not connected yet. This is a placeholder.");
        },
      });
      return;
    }

    state.currentView = "home";
    render();
  };

  render();
}
