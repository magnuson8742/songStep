import type {
  SongStepProject,
  SourceFileData,
  StoredProjectFile,
} from "../../domain/project/projectModel";

const PROJECT_FORMAT = "songStepProject";
const PROJECT_VERSION = 1;
const PROJECT_FILE_EXTENSION = ".songstep";
const PROJECT_FILE_MIME = "application/x-songstep-project";

export interface SelectedSourceFile {
  fileName: string;
  content: Uint8Array;
}

export type SaveMethod = "system-dialog" | "download-fallback";

export interface SaveProjectResult {
  saved: boolean;
  method: SaveMethod | "cancelled";
  fileName?: string;
}

interface PickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: PickerAcceptType[];
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: PickerAcceptType[];
}

interface FilePickerHandle {
  getFile: () => Promise<File>;
}

interface FileSystemWritableFileStreamLike {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

interface SaveFilePickerHandle {
  createWritable: () => Promise<FileSystemWritableFileStreamLike>;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").toLowerCase();
}

function getDefaultProjectFileName(projectTitle: string): string {
  const normalizedName = sanitizeFileName(projectTitle) || "songstep-project";
  return `${normalizedName}${PROJECT_FILE_EXTENSION}`;
}

function getWindowWithPickers(): Window & {
  showOpenFilePicker?: (options: OpenFilePickerOptions) => Promise<FilePickerHandle[]>;
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<SaveFilePickerHandle>;
} {
  return window;
}

function buildProjectPickerTypes(): PickerAcceptType[] {
  return [
    {
      description: "songStep Project",
      accept: {
        [PROJECT_FILE_MIME]: [PROJECT_FILE_EXTENSION],
        "application/json": [PROJECT_FILE_EXTENSION],
      },
    },
  ];
}

function pickFileWithInput(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;

    input.addEventListener("change", () => {
      resolve(input.files?.[0] ?? null);
    });

    input.click();
  });
}

async function pickFileWithDialog(options: OpenFilePickerOptions, fallbackAccept: string): Promise<File | null> {
  const pickerWindow = getWindowWithPickers();

  if (pickerWindow.showOpenFilePicker) {
    const handles = await pickerWindow.showOpenFilePicker(options);
    const firstHandle = handles[0];
    if (!firstHandle) {
      return null;
    }

    return firstHandle.getFile();
  }

  return pickFileWithInput(fallbackAccept);
}

export async function pickGpSourceFile(): Promise<SelectedSourceFile | null> {
  const selectedFile = await pickFileWithDialog(
    {
      multiple: false,
      types: [
        {
          description: "Guitar Pro",
          accept: {
            "application/octet-stream": [".gp", ".gp3", ".gp4", ".gp5", ".gpx"],
          },
        },
      ],
    },
    ".gp,.gp3,.gp4,.gp5,.gpx",
  );

  if (!selectedFile) {
    return null;
  }

  const content = new Uint8Array(await selectedFile.arrayBuffer());
  return {
    fileName: selectedFile.name,
    content,
  };
}

export async function createProjectFromSource(
  sourceFile: SelectedSourceFile,
  projectTitle: string,
): Promise<SongStepProject> {
  const nowIso = new Date().toISOString();

  const sourceData: SourceFileData = {
    fileName: sourceFile.fileName,
    mimeType: "application/octet-stream",
    size: sourceFile.content.byteLength,
    contentBase64: bytesToBase64(sourceFile.content),
  };

  return {
    id: crypto.randomUUID(),
    title: projectTitle.trim(),
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
    sourceFile: sourceData,
    viewState: {
      selectedTrackIndex: 0,
    },
  };
}

function serializeProject(project: SongStepProject): string {
  const storedProject: StoredProjectFile = {
    format: PROJECT_FORMAT,
    version: PROJECT_VERSION,
    project: {
      ...project,
      updatedAtIso: new Date().toISOString(),
    },
  };

  return JSON.stringify(storedProject, null, 2);
}

function downloadProjectFile(serializedProject: string, fileName: string): void {
  const projectBlob = new Blob([serializedProject], { type: PROJECT_FILE_MIME });
  const downloadUrl = URL.createObjectURL(projectBlob);

  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.click();

  URL.revokeObjectURL(downloadUrl);
}

export async function saveProjectToDisk(project: SongStepProject): Promise<SaveProjectResult> {
  const defaultFileName = getDefaultProjectFileName(project.title);
  const serializedProject = serializeProject(project);
  const pickerWindow = getWindowWithPickers();

  if (pickerWindow.showSaveFilePicker) {
    try {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: buildProjectPickerTypes(),
      });

      const writable = await handle.createWritable();
      await writable.write(serializedProject);
      await writable.close();

      return {
        saved: true,
        method: "system-dialog",
        fileName: defaultFileName,
      };
    } catch {
      return {
        saved: false,
        method: "cancelled",
      };
    }
  }

  downloadProjectFile(serializedProject, defaultFileName);
  return {
    saved: true,
    method: "download-fallback",
    fileName: defaultFileName,
  };
}

export async function saveProjectAsToDisk(project: SongStepProject): Promise<SaveProjectResult> {
  return saveProjectToDisk(project);
}



function normalizeViewState(project: SongStepProject): SongStepProject {
  return {
    ...project,
    viewState: {
      selectedTrackIndex: Number.isInteger(project.viewState?.selectedTrackIndex)
        ? project.viewState.selectedTrackIndex
        : 0,
    },
  };
}

function parseStoredProject(serializedProject: string): SongStepProject {
  let parsedProject: StoredProjectFile;

  try {
    parsedProject = JSON.parse(serializedProject) as StoredProjectFile;
  } catch {
    throw new Error("Could not read this project file. The file is not valid JSON.");
  }

  if (parsedProject.format !== PROJECT_FORMAT) {
    throw new Error("Unsupported file type. Please open a valid songStep project file.");
  }

  if (parsedProject.version !== PROJECT_VERSION) {
    throw new Error(
      `Unsupported project version (${String(parsedProject.version)}). Expected version ${PROJECT_VERSION}.`,
    );
  }

  if (!parsedProject.project?.title) {
    throw new Error("Project file is missing the project title.");
  }

  if (!parsedProject.project?.sourceFile?.fileName) {
    throw new Error("Project file is missing source file information.");
  }

  if (!parsedProject.project?.sourceFile?.contentBase64) {
    throw new Error("Project file is missing embedded GP source data.");
  }

  return normalizeViewState(parsedProject.project);
}

export async function pickAndLoadProjectFromDisk(): Promise<SongStepProject | null> {
  const selectedFile = await pickFileWithDialog(
    {
      multiple: false,
      types: buildProjectPickerTypes(),
    },
    `${PROJECT_FILE_EXTENSION},application/json`,
  );

  if (!selectedFile) {
    return null;
  }

  const serializedProject = await selectedFile.text();
  return parseStoredProject(serializedProject);
}
