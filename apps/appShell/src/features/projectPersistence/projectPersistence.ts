import type {
  SongStepProject,
  SourceFileData,
  StoredProjectFile,
} from "../../domain/project/projectModel";

const PROJECT_FORMAT = "songStepProject";
const PROJECT_FILE_EXTENSION = ".songstep.json";

export interface SelectedSourceFile {
  fileName: string;
  content: Uint8Array;
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

function getWindowWithPickers(): Window & {
  showOpenFilePicker?: (options: OpenFilePickerOptions) => Promise<FilePickerHandle[]>;
  showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<SaveFilePickerHandle>;
} {
  return window;
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
  };
}

function downloadProjectJson(serializedProject: string, fileName: string): void {
  const projectBlob = new Blob([serializedProject], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(projectBlob);

  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = fileName;
  downloadLink.click();

  URL.revokeObjectURL(downloadUrl);
}

export async function saveProjectToDisk(project: SongStepProject): Promise<boolean> {
  const defaultFileName = `${sanitizeFileName(project.title) || "songstep-project"}${PROJECT_FILE_EXTENSION}`;

  const storedProject: StoredProjectFile = {
    format: PROJECT_FORMAT,
    version: 1,
    project: {
      ...project,
      updatedAtIso: new Date().toISOString(),
    },
  };

  const serializedProject = JSON.stringify(storedProject, null, 2);
  const pickerWindow = getWindowWithPickers();

  if (pickerWindow.showSaveFilePicker) {
    const handle = await pickerWindow.showSaveFilePicker({
      suggestedName: defaultFileName,
      types: [
        {
          description: "songStep Project",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(serializedProject);
    await writable.close();
    return true;
  }

  downloadProjectJson(serializedProject, defaultFileName);
  return true;
}

export async function pickAndLoadProjectFromDisk(): Promise<SongStepProject | null> {
  const selectedFile = await pickFileWithDialog(
    {
      multiple: false,
      types: [
        {
          description: "songStep Project",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    },
    ".json",
  );

  if (!selectedFile) {
    return null;
  }

  const serializedProject = await selectedFile.text();

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
