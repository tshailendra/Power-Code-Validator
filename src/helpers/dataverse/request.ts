import axios, { AxiosResponse } from 'axios';
import { Logger } from '../logger';

export async function getRequest(
    envURL: string,
    accessToken: string,
    tableUri: string
): Promise<AxiosResponse<any>> {
    try {
        Logger.info(`Dataverse GET Request to: ${envURL}/${tableUri}`);
        const response = await axios.get(`${envURL}/${tableUri}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "OData-MaxVersion": "4.0",
                "OData-Version": "4.0",
                Accept: "application/json"
            },
        });

        return response;
    } catch (error) {
        console.error("Dataverse request failed:", error);
        throw error;
    }
}
