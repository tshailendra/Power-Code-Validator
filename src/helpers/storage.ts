import * as vscode from 'vscode';
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from 'path';
import { FileEntry } from "../interfaces/fileentry";
const unzipper = require("unzipper");


export async function uploadMSAppFile(context: any, sourceFilePath: string): Promise<{ files: any[]; targetFolder: string }> {
    try {
        const gblFolderPath = context.globalStorageUri.fsPath;
        const baseName = path.basename(sourceFilePath, path.extname(sourceFilePath));
        const targetFolder = path.join(gblFolderPath, baseName);
        const folders = await getFolders(targetFolder)
        //deleteFolder(targetFolder); // clean up previous folders
        for (const folder of folders) {
            const fullPath = path.join(targetFolder, folder);
            deleteFolder(fullPath);
        }
        const fileName = path.basename(sourceFilePath);
        try {
            // ensure folder exists
            await fsp.mkdir(targetFolder, { recursive: true });
            await fsp.copyFile(sourceFilePath, path.join(targetFolder, fileName));
            const targetFilePath = await extractZipFile(context, gblFolderPath, baseName, fileName);

            // Recursively get all files with their folder names
            const files = await getAllFilesWithFolders(targetFilePath);

            // Filter control files from the extracted files
            const controlFiles = files.filter(f => f.folderPath === "Controls");
            const controlsArray = await readControlCount(controlFiles);

            // Filter component files and then JSON files from components
            const componentFiles = files.filter(f => f.folderPath === "Components");
            const jsonFiles = componentFiles.filter((f: any) => f.file.toLowerCase().endsWith(".json"));
            const componentsArray = await readControlCount(jsonFiles);

            // Wrap into final structure for UI or further processing
            const dataWithCounts = [
                { file: "Controls", _children: controlsArray, status: "Success" },
                { file: "Components", _children: componentsArray, status: "Success" }
            ];

            // Return the structured data and target folder location
            return { files: dataWithCounts, targetFolder: targetFilePath };
        }
        catch (error: any) {
            return { files: [{ "fullPath": `Failed to copy file: ${error.message}`, status: "Error" }], targetFolder: "" };
        }
    }
    catch (err: any) {
        return {
            files: [{ fullPath: `Upload failed: ${err.message || err}`, status: "Error" }],
            targetFolder: ""
        };
    }

    return { files: [{ "fullPath": "Unknown error", status: "Error" }], targetFolder: "" };
}


async function extractZipFile(context: any, sourceFilePath: string, sourceBasePath: string, fileName: string): Promise<string> {

    const zipFileName = path.join(sourceFilePath, sourceBasePath, fileName);
    const baseName = path.basename(zipFileName, path.extname(zipFileName));
    try {
        // Simple datetime format: ddMMyyyyHHmmss for unique folder naming
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, "0");

        const day = pad(now.getDate());
        const month = pad(now.getMonth() + 1); // months are 0-based
        const year = now.getFullYear();
        const hours = pad(now.getHours());
        const minutes = pad(now.getMinutes());
        const seconds = pad(now.getSeconds());

        const formatted = `${day}${month}${year}${hours}${minutes}${seconds}`;
        const targetFolder = path.join(sourceFilePath, baseName, `${baseName}_${formatted}`);

        fs.mkdirSync(targetFolder, { recursive: true });

        // Extract using unzipper stream to the target folder
        await fs.createReadStream(zipFileName)
            .pipe(unzipper.Extract({ path: targetFolder }))
            .promise();

        return targetFolder;
    } catch (error: any) {
        context.log?.(`Extraction failed: ${error.message}`);
        return '';
    }
}


async function getAllFilesWithFolders(dir: string): Promise<FileEntry[]> {
    const dirents = await fsp.readdir(dir, { withFileTypes: true });
    const results: FileEntry[] = [];

    for (const dirent of dirents) {
        const res = path.resolve(dir, dirent.name);
        // Remove trailing timestamp suffix from folder name if present
        const shortPath = path.basename(dir).replace(/_\d+$/, "");
        if (dirent.isDirectory()) {
            const subFiles = await getAllFilesWithFolders(res);
            results.push(...subFiles);
        } else {
            results.push({
                fullPath: res,
                folderPath: shortPath,
                file: dirent.name,
                status: 'Pending',
            });
        }
    }

    return results;
}


async function getFolders(folderPath: string): Promise<string[]> {
    try {
        const entries = await fsp.readdir(folderPath, { withFileTypes: true });
        return entries.filter(e => e.isDirectory()).map(e => e.name);
    }
    catch (err) {
        return [];
    }
}


async function deleteFolder(folderPath: string) {
    try {
        const entries = await fsp.readdir(folderPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(folderPath, entry.name);

            if (entry.isDirectory()) {
                // recursively delete child folder
                await deleteFolder(fullPath);
            } else {
                // delete file
                await fsp.unlink(fullPath);
            }
        }

        await fsp.rmdir(folderPath);
        ///console.log(`Deleted folder: ${folderPath}`);

    } catch (err) {
        console.error(`Failed to delete folder: ${err}`);
    }
}


async function readControlCount(data: any[]) {
    for (const item of data) {
        try {
            const content = fs.readFileSync(item.fullPath, "utf-8");
            // Count occurrences of `"Type": "ControlInfo"`
            const matches = content.match(/"Type"\s*:\s*"ControlInfo"/g) || [];
            // Subtract 1 because the first match might be a header or unwanted count
            item.count = matches.length - 1;
        } catch (err) {
            console.error(`Error reading file ${item.fullPath}:`, err);
            item.count = -1; // mark error
        }
    }
    return data;
}


export async function saveData(targetFolder: string, fileName: string, jsondata: any): Promise<boolean> {
    try {
        const newFolderPath = path.join(targetFolder, 'Processed');
        await fsp.mkdir(newFolderPath, { recursive: true });
        fsp.writeFile(path.join(newFolderPath, fileName), JSON.stringify(jsondata));
    }
    catch (error) {
        console.error('Error saving data:', error);
        return false;
    }

    return true;

}

export async function readData(filePath: string): Promise<any> {
    try {
        const content = await fsp.readFile(filePath, 'utf8');
        const json = JSON.parse(content);
        return json;
    } catch (err: any) {
        // File doesn't exist — return blank JSON array
        console.error(`Error reading file ${filePath}: ${err.message}`);
        return '';
    }
}

export function getNamingStandards(context: any, defaults: boolean): any {
    const gblFolderPath = context.globalStorageUri.fsPath;
    const filePath = path.join(gblFolderPath, "NamingStandards.json");
    let data = [];
    let fileLastUpdate = "Default Settings";

    if (!defaults && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);

        // Format last update date as "dd-MMM-yyyy"
        const formatted = stats.birthtime.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(/ /g, "-");

        fileLastUpdate = `Last updated date: ${formatted}`;
        const raw = fs.readFileSync(filePath, "utf8");
        data = JSON.parse(raw);
    }
    else {
        // Load default naming standards from extension media folder
        const fileControlNamePath = vscode.Uri.file(path.join(context.extensionPath, "media", "json", "controlname.json"));
        const raw = fs.readFileSync(fileControlNamePath.fsPath, "utf8");
        data = JSON.parse(raw);
    }

    // Add index to each item for display or tracking
    const idxOutput = data.map((item: any, idx: number) => ({
        index: idx + 1,
        ...item
    }));

    // Group items by their parent property
    const finalData = Object.values(
        idxOutput.reduce((acc: any, item: any) => {
            if (!acc[item.parent]) {
                acc[item.parent] = {
                    display: item.parent,   // parent becomes the group "head"
                    _children: []
                };
            }

            acc[item.parent]._children.push({
                index: item.index,
                display: item.display,
                ctrl: item.ctrl,
                prefix: item.prefix,
                parent: item.parent
            });

            return acc;
        }, {})
    );

    return { output: { data: finalData, update: fileLastUpdate } };

}

export async function resetNameStandards(context: any): Promise<boolean> {
    try {
        const gblFolderPath = context.globalStorageUri.fsPath;
        const filePath = path.join(gblFolderPath, "NamingStandards.json");

        // Load default naming standards from extension media folder
        const fileControlNamePath = vscode.Uri.file(path.join(context.extensionPath, "media", "json", "controlname.json"));
        const raw = fs.readFileSync(fileControlNamePath.fsPath, "utf8");
        const defaultData = JSON.parse(raw);

        // call saveNameStandardsData to save the default data
        const result = await saveNameStandardsData(context, defaultData);
        if (!result) {
            console.error(`Unable to save default data`);
            return false;
        }
    }
    catch (error) {
        console.error('Error resetting data:', error);
        return false;
    }

    return true;

}

export async function saveNameStandardsData(context: any, jsondata: any): Promise<boolean> {
    try {
        const gblFolderPath = context.globalStorageUri.fsPath;
        const filePath = path.join(gblFolderPath, "NamingStandards.json");
        await fsp.mkdir(gblFolderPath, { recursive: true });
        await fsp.writeFile(filePath, JSON.stringify(jsondata, null, 2), "utf8");
    }
    catch (error) {
        console.error('Error saving data:', error);
        return false;
    }

    return true;

}

export async function downloadControlNameFile(context: any) {
    const controlName = "NamingStandards";
    const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`${controlName}.json`),
        filters: {
            "JSON": ["json"]
        },
        saveLabel: "Save File"
    });

    if (uri) {
        const gblFolderPath = context.globalStorageUri.fsPath;
        const filePath = path.join(gblFolderPath, `${controlName}.json`);
        const content = fs.readFileSync(filePath, "utf8");
        fs.writeFileSync(uri.fsPath, content, "utf8");
        vscode.window.showInformationMessage(`File saved: ${uri.fsPath}`);
    }
}

export async function uploadControlNameFile(context: any, sourceFilePath: string): Promise<boolean> {
    try {
        // GET controlname.json from extension media folder
        const fileControlNamePath = vscode.Uri.file(path.join(context.extensionPath, "media", "json", "controlname.json"));
        const rawDefault = fs.readFileSync(fileControlNamePath.fsPath, "utf8");
        const defaultData = JSON.parse(rawDefault);

        // GET uploaded file data
        const rawUploaded = fs.readFileSync(sourceFilePath, "utf8");
        const uploadedData = JSON.parse(rawUploaded);

        // compare both the files for ctrl values and counts
        const defaultCtrls = defaultData.map((item: any) => item.ctrl);
        const uploadedCtrls = uploadedData.map((item: any) => item.ctrl);

        // uploadedctls should be same as defaultctrls
        const allMatch = uploadedCtrls.every((ctrl: string) => defaultCtrls.includes(ctrl))
            && (uploadedCtrls.length === defaultCtrls.length);

        if (!allMatch) {
            vscode.window.showErrorMessage(`Uploaded file is not valid. Please upload a valid Naming Standards JSON file.`);
            return false;
        }

        // call saveNameStandardsData to save the uploaded data
        const result = await saveNameStandardsData(context, uploadedData);
        if (!result) {
            vscode.window.showErrorMessage(`Unable to save uploaded data`);
            return false;
        }
    }
    catch (error) {
        console.error('Error uploading data:', error);
        return false;
    }

    return true;

}