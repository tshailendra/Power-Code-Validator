import axios from "axios";
import fs from "fs";
import * as path from 'path';
import { getRequest } from "./request";
const unzipper = require("unzipper");

export async function exportSolution(context: any, envUrl: string, accessToken: string, solutionid: string) {

    try {
        const solutionUri = `api/data/v9.1/solutions(${solutionid})?$select=uniquename,friendlyname`
        const solnResponse = await getRequest(envUrl, accessToken, solutionUri);

        if (!solnResponse || !solnResponse.data) {
            throw new Error("Failed to fetch solution details from Dataverse for given solutionid");
        }

        const solutionName = solnResponse.data.uniquename;

        const response = await axios.post(`${envUrl}/api/data/v9.2/ExportSolution`,
            { SolutionName: solutionName, Managed: false },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json"
                }
            }
        );

        const base64Data = response.data.ExportSolutionFile;
        const buffer = Buffer.from(base64Data, "base64");
        const filePath = path.join(context.globalStorageUri.fsPath, `${solutionName}.zip`);
        fs.writeFileSync(filePath, buffer);
        await extractSpecificFolder(filePath, context.globalStorageUri.fsPath);
        //TODO: CALL EXTRACT MSAPP FILE FUNCTION
        console.log(`Solution exported to ${solutionName}.zip`);
        return true;
    }
    catch (error) {
        console.error("Error exporting solution:", error);
        return false;
    }
}

async function extractSpecificFolder(zipPath: string, extractTo: string) {
    const targetFolder = "CanvasApps";
    return new Promise<void>((resolve, reject) => {
        fs.createReadStream(zipPath)
            .pipe(unzipper.Parse())
            .on("entry", (entry: any) => {
                const entryPath = entry.path.replace(/\\/g, "/"); // normalize slashes
                if (entryPath.startsWith(targetFolder)) {
                    const dest = path.join(extractTo, entryPath);
                    const ext = path.extname(entryPath).toLowerCase();
                    if (ext === ".msapp") {
                        fs.mkdirSync(path.dirname(dest), { recursive: true });
                        entry.pipe(fs.createWriteStream(dest));
                    }
                } else {
                    entry.autodrain(); // skip other entries
                }
            })
            .on("close", resolve)
            .on("error", reject);
    });
}