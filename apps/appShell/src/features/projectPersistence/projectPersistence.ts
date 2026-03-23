import type {
  SongStepProject,
  SourceFileData,
  StoredProjectFile,
} from "../../domain/project/projectModel";

const PROJECT_FORMAT = "songStepProject";
const PROJECT_FILE_EXTENSION = ".songstep.json";

function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").toLowerCase();
}

function readFileAsText(file: File): Promise<string> {
  return file.text();
}

export async function createProjectFromSource(
  sourceFile: File,
  projectTitle: string,
): Promise<SongStepProject> {
  const sourceFileBuffer = await sourceFile.arrayBuffer();
  const nowIso = new Date().toISOString();

  const sourceData: SourceFileData = {
    fileName: sourceFile.name,
    mimeType: sourceFile.type || "application/octet-stream",
    size: sourceFile.size,
    contentBase64: arrayBufferToBase64(sourceFileBuffer),
  };

  return {
    id: crypto.randomUUID(),
    title: projectTitle.trim(),
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    sourceFile: sourceData,
  };
}

export function saveProjectToDisk(project: SongStepProject): void {
  const storedProject: StoredProjectFile = {
    format: PROJECT_FORMAT,
    version: 1,
    project: {
      ...project,
      updatedAtIso: new Date().toISOString(),
    },
  };

  const serializedProject = JSON.stringify(storedProject, null, 2);
  const projectBlob = new Blob([serializedProject], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(projectBlob);
  const fileName = `${sanitizeFileName(project.title) || "songstep-project"}${PROJECT_FILE_EXTENSION}`;

  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.click();

  URL.revokeObjectURL(downloadUrl);
}

export async function loadProjectFromDisk(file: File): Promise<SongStepProject> {
  const serializedProject = await readFileAsText(file);

  let parsedProject: StoredProjectFile;
  try {
    parsedProject = JSON.parse(serializedProject) as StoredProjectFile;
  } catch {
    throw new Error("The selected file is not a valid songStep project JSON file.");
  }

  if (parsedProject.format !== PROJECT_FORMAT || parsedProject.version !== 1) {
    throw new Error("Unsupported project format. Please choose a songStep MVP project file.");
  }

  if (!parsedProject.project?.title || !parsedProject.project?.sourceFile?.fileName) {
    throw new Error("Project file is missing required data.");
  }

  return parsedProject.project;
}
