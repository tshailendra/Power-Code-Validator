import * as vscode from "vscode";
import { FileEntry } from "../../interfaces/fileentry";

export class FileStore {
  private files: FileEntry[] = [];
  private _onDidChange = new vscode.EventEmitter<FileEntry[]>();
  public readonly onDidChange = this._onDidChange.event;

  setFiles(files: FileEntry[]) {
    this.files = files;
    this._onDidChange.fire(this.files); // 🔔 broadcast to subscribers
  }

  getFiles() {
    return this.files;
  }
}
