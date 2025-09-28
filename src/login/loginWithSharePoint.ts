import { PublicClientApplication, DeviceCodeRequest } from "@azure/msal-node";
import open from "open";
import * as vscode from 'vscode';


export async function getSPAccessToken(siteUrl: string, tenantId: string, clientId: string): Promise<string> {
    const authority = `https://login.microsoftonline.com/${tenantId}`;
    const pca = new PublicClientApplication({
        auth: {
            clientId,
            authority,
        },
    });

    const urlObj = new URL(siteUrl);
    const baseUrl = urlObj.origin;
    const scopes = [`${baseUrl}/.default`];

    const deviceCodeRequest: DeviceCodeRequest = {
        deviceCodeCallback: (response) => {
            vscode.env.clipboard.writeText(response.userCode);
            open(response.verificationUri);
        },
        scopes,
    };

    const response = await pca.acquireTokenByDeviceCode(deviceCodeRequest) as any;
    return response.accessToken;
}
