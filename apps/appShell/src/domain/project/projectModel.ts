export interface SourceFileData {
  fileName: string;
  mimeType: string;
  size: number;
  contentBase64: string;
}

export interface SongStepProject {
  id: string;
  title: string;
  createdAtIso: string;
  updatedAtIso: string;
  sourceFile: SourceFileData;
}

export interface StoredProjectFile {
  format: "songStepProject";
  version: 1;
  project: SongStepProject;
}
