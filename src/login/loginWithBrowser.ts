import { loginToDataverse } from './loginWithDataverse';
import { getSPAccessToken } from './loginWithSharePoint';

export async function login(envURL: string, clientId: string, tenantID: string, resettoken: boolean): Promise<{ token: string; siteid: string }> {

    if (envURL.toLowerCase().includes("sharepoint")) {
        let token = "";
        try {
            token = await getSPAccessToken(envURL, tenantID, clientId);
        } catch (err) {
            console.error('Error:', err);
        }
        return ({ token: token, siteid: "" });
    } else {
        return loginToDataverse(envURL, resettoken);
    }
}