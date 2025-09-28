import * as fsp from 'fs/promises';
import * as fs from 'fs';
import * as path from 'path';

export async function saveData(context: any, filename: string, jsondata: any): Promise<boolean> {
  // Get the global storage path (unique per extension)
  const filePath = path.join(context.globalStorageUri.fsPath, filename);
  console.log('Saving data to:', filePath);
  try {
    // Write
    fsp.mkdir(path.dirname(filePath), { recursive: true }).then(() => {
      fsp.writeFile(filePath, JSON.stringify(jsondata));
    });
  }
  catch (error) {
    console.error('Error saving data:', error);
    return false;
  }

  return true;

}

export function readData(context: any, filename: string): any {
  const filePath = path.join(context.globalStorageUri.fsPath, filename);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}