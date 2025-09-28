import * as msal from '@azure/msal-node'; // ✅ type-only import
import axios from "axios";
const openModule = require('open');
const open = openModule.default;

const clientId = "51f81489-12ee-4a9e-aaae-a2591f45987d"; // Public client ID
const redirectUri = "http://localhost";

const msalConfig = {
  auth: {
    clientId,
    authority: "https://login.microsoftonline.com/common",
    redirectUri,
  },
};

const pca = new msal.PublicClientApplication(msalConfig);
let cachedAccount: msal.AccountInfo | null = null;

async function getAccessToken(envURL: string, resettoken: boolean): Promise<string> {
  const scopes = [`${envURL}/user_impersonation`];
  if (resettoken) {
    cachedAccount = null;
  }
  try {
    // Try silent token first
    if (cachedAccount) {
      const silentToken = await pca.acquireTokenSilent({
        account: cachedAccount,
        scopes,
      });
      return silentToken.accessToken;
    }
  } catch (silentError) {
    console.warn("Silent token failed, falling back to interactive login...");
  }

  try {

    const options: any = {
      scopes,
      openBrowser: (url: string) => open(url)
    };

    if (resettoken) {
      options.prompt = "login"; // force prompt only when needed
    }

    const authResponse = await pca.acquireTokenInteractive(options);

    if (!authResponse || !authResponse.accessToken) {
      throw new Error("No access token received");
    }

    cachedAccount = authResponse.account!;
    return authResponse.accessToken;

  } catch (error) {
    console.error("Error acquiring token:", error);
    throw new Error("Failed to acquire access token");
  }
}

export async function loginToDataverse(envURL: string, resettoken: boolean): Promise<{ token: string; siteid: string }> {
  try {
    const accessToken = await getAccessToken(envURL, resettoken);
    await axios.get(`${envURL}/api/data/v9.1/WhoAmI`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
        Accept: "application/json"
      }
    });

    return { token: accessToken, siteid: "" }

  } catch (error: any) {
    console.error("Error calling Dataverse API:", error);
    return { token: `"Error connecting to dataverse:"${error.message}`, siteid: "" }

  }
}
