// types.ts
export interface FileEntry {
  fullPath: string;
  folderPath?: string;
  file?: string;
  status: "Pending" | "Error" | "Failed" | "Done" | "Processing";
  screenName?: string;
}
