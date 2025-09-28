import { getRequest } from "./request";
import componentTypes from "../../../media/json/componenttypes.json";
import { Logger } from '../logger';
import { flatteners } from "./flatstructure";

export async function getComponentsFromSolutions(envURL: string, solutionid: string, accessToken: string) {
    const componentUri = `api/data/v9.1/solutioncomponents?$filter=_solutionid_value eq ${solutionid}&$expand=solutionid($select=uniquename,publisherid;$expand=publisherid($select=customizationprefix))`;
    const response = await getRequest(envURL, accessToken, componentUri);
    Logger.info(`response - ${response}`);
    if (!response || !response.data) {
        throw new Error("Failed to fetch components from Dataverse for given solutionid");
    }

    const data = await response.data as {
        value: {
            DisplayName: string;
            LogicalName: string;
            objectid: string;
            SchemaName?: string;
            PublisherPrefix: string;
            columns: string | ""
        }[];
    };
    const allRecords = data.value.map((item: any) => {
        // Find the matching component type in JSON by ID
        const compMeta = componentTypes.find((c: any) => c.ID === String(item.componenttype));

        return {
            DisplayName: compMeta ? compMeta.Value : "",
            LogicalName: "",
            objectid: item.objectid,
            ComponentType: item.componenttype,
            SchemaName: compMeta ? compMeta.ApiUrl : "",
            PublisherPrefix: item.solutionid.publisherid.customizationprefix,
            columns: compMeta && compMeta.Columns ? compMeta.Columns : null,
            expand: compMeta && compMeta.ExpandColumns ? compMeta.ExpandColumns : null,
            childcolumns: compMeta && compMeta.ChildColumns ? compMeta.ChildColumns : null
        };
    });

    const records = allRecords.filter(r => r.DisplayName?.trim() !== "");

    // Group by DisplayName
    const groupedData = Object.values(
        records.reduce((acc, item) => {
            if (!acc[item.DisplayName]) {
                acc[item.DisplayName] = {
                    DisplayName: item.DisplayName,
                    LogicalName: item.LogicalName,
                    Description: item.ComponentType,
                    SchemaName: `${item.SchemaName}`,
                    PublisherPrefix: item.PublisherPrefix,
                    ComponentType: item.ComponentType,
                    columns: item.columns,
                    expand: item.expand,
                    childcolumns: item.childcolumns,
                    _children: [],
                };
            }
            acc[item.DisplayName]._children.push({ objectid: item.objectid });
            return acc;
        }, {} as Record<string, any>)
    );

    const publisherprefix = `${records[0].PublisherPrefix}`;
    Logger.info(JSON.stringify(groupedData, null, 2));
    const finalData = await getComponentDetails(envURL, accessToken, groupedData, publisherprefix);
    return finalData;
}

async function getComponentDetails(envURL: string, accessToken: string, groupedData: any[], publisherprefix: string): Promise<any[]> {
    const updatedGroups = await Promise.all(
        groupedData.map(async (group) => {
            const updatedChildren = await Promise.all(
                group._children.map(async (child: any) => {
                    // Build URL
                    const apiUrl = (group.SchemaName ?? "").replace("{value}", child.objectid);
                    const selectQuery = (group.columns || null) ? group.columns : "";
                    const expandQuery = (group.expand || null) ? group.expand : "";
                    if (apiUrl.length > 0) {
                        try {

                            // Call API
                            const response = await getRequest(envURL, accessToken, `api/data/v9.2${apiUrl}${selectQuery}${expandQuery}`);
                            Logger.info(`Fetched details for ${group.DisplayName} from ${apiUrl}`);
                            const data = response?.data;
                            if (!data) {
                                return flattenComponent(child, group.ComponentType, publisherprefix);
                            }
                            else {
                                return flattenComponent(data, group.ComponentType, publisherprefix);
                            }
                        }
                        catch (error) {
                            Logger.info(`Error fetching details for ${group.DisplayName} with ID ${child.objectid}:`, error);
                        }
                    }

                })
            )
            // Return the group as-is, but with flattened children
            return {
                ...group,
                _children: updatedChildren,
            };
        })
    )

    return updatedGroups; // <<-- must return the updated groups
}

function flattenComponent(data: any, componentType: number, publisherprefix: string): FlattenedStructure {
    const flattener = flatteners[componentType] || flatteners.default;
    return flattener(data, publisherprefix);
}
