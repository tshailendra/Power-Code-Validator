import { Logger } from "../logger";
const { parseString } = require("xml2js");

export const flatteners: Record<number, (data: any, publisherprefix: string) => FlattenedStructure> & {
    default: (data: any, publisherprefix: string) => FlattenedStructure;
} = {
    9: (data, publisherprefix) => ({ //Globaloptionset
        id: data.MetadataId || "",
        DisplayName: data.DisplayName?.UserLocalizedLabel?.Label || "",
        LogicalName: data.Name || "",
        SchemaName: "",
        Remarks: (!data.Name.startsWith(publisherprefix) || data.Name.length === 0)
            ? `Prefix does not match publisher prefix ${publisherprefix}` : "",
        Description: data.Description?.UserLocalizedLabel?.Label || "",
        _children: data.Options?.map((opt: any) => ({
            id: String(opt.Value),
            DisplayName: opt.Label?.UserLocalizedLabel?.Label || "",
            LogicalName: String(opt.Value),
            SchemaName: "",
            Remarks: "",
            Description: opt.Description?.UserLocalizedLabel?.Label || "",
        })) || [],
    }),
    20: (data, publisherprefix) => ({ // security roles
        id: data.MetadataId || "",
        DisplayName: data.name || "",
        LogicalName: data.name || "",
        SchemaName: "",
        Description: "",
        Remarks: ""
    }),
    380: (data, publisherprefix): FlattenedStructure => { //environment variable
        const item: any = data.value[0];
        return {
            id: `${item.environmentvariablevalueid},${item.EnvironmentVariableDefinitionId.environmentvariabledefinitionid}` || "",
            DisplayName: item.EnvironmentVariableDefinitionId.displayname || "",
            LogicalName: "",
            Remarks: (!item.schemaname.startsWith(publisherprefix) || item.schemaname.length === 0)
                ? `Prefix does not match publisher prefix ${publisherprefix}` : "",
            SchemaName: item.schemaname || "",
            Description: item.EnvironmentVariableDefinitionId.description || "",
            _children: [{
                id: "",
                DisplayName: item.EnvironmentVariableDefinitionId.defaultvalue || "",
                LogicalName: item.value || "",
                SchemaName: "",
                object: "",
                Description: ""
            }]
        };
    },
    29: (data, publisherprefix): FlattenedStructure => { //workflow
        const runAsMap: Record<number, string> = {
            1: "Run by - Owner",
            2: "Run by - Calling User"
        };
        const children: FlattenedStructure[] = [];
        try {
            const wf = JSON.parse(data.clientdata ?? "{}");
            const actions = wf?.properties?.definition?.actions ?? {};

            for (const [name, value] of Object.entries(actions)) {
                children.push({
                    id: name,
                    DisplayName: name,
                    LogicalName: "",
                    Remarks: "",
                    SchemaName: (value as any)?.type ?? "",
                    Description: (value as any)?.description ?? ""
                });
            }
        } catch (e) {
            // invalid or missing clientdata -> no children
        }

        return {
            id: data.workflowid || "",
            DisplayName: data.name || "",
            LogicalName: data.name || "",
            SchemaName: runAsMap[data.runas as number] || "",
            Description: data.description || "",
            Remarks: "",
            _children: children
        };
    },
    ////
    62: (data, publisherprefix): FlattenedStructure => { //SITE MAP
        const children: FlattenedStructure[] = [];
        const sitemapxml = data.sitemapxml;
        parseString(sitemapxml, { explicitArray: false, attrkey: "attributes" }, (err: any, result: any) => {
            if (err) {
                Logger.info("Error parsing XML:", err);
                return;
            }
            Logger.info(JSON.stringify(result, null, 2));
        });

        return {
            id: data.sitemapid || "",
            DisplayName: data.sitemapname || "",
            LogicalName: data.sitemapnameunique || "",
            SchemaName: data.sitemapnameunique || "",
            Description: "",
            Remarks: (!data.sitemapnameunique.startsWith(publisherprefix) || data.sitemapnameunique.length === 0)
                ? `Prefix does not match publisher prefix ${publisherprefix}` : "",
            _children: children
        };
    },

    10129: (data, publisherprefix) => ({ // Connection Reference
        id: data.connectionreferenceid || "",
        DisplayName: data.connectionreferencedisplayname || "",
        LogicalName: data.connectionreferencelogicalname || "",
        SchemaName: "",
        Remarks: (!data.connectionreferencelogicalname.startsWith(publisherprefix) || data.connectionreferencelogicalname.length === 0)
            ? `Prefix does not match publisher prefix ${publisherprefix}` : "",
        Description: data.description || ""
    }),
    80: (data, publisherprefix) => ({ // MODEL DRIVEN APP 
        id: data.appmoduleid || "",
        DisplayName: data.name || "",
        LogicalName: data.uniquename || "",
        SchemaName: data.uniquename || "",
        Remarks: (!data.uniquename.startsWith(publisherprefix) || data.uniquename.length === 0)
            ? `Prefix does not match publisher prefix ${publisherprefix}` : "",
        Description: data.description || ""
    }),
    300: (data, publisherprefix) => ({ // CANVAS APP 
        id: data.canvasappid || "",
        DisplayName: data.displayname || "",
        LogicalName: data.name || "",
        SchemaName: data.name || "",
        Description: data.description || "",
        Remarks: (!data.name.startsWith(publisherprefix) || data.name.length === 0)
            ? `Prefix does not match publisher prefix ${publisherprefix}` : "",
    }),
    1: (data, publisherprefix): FlattenedStructure => { //ENTITY
        const children: FlattenedStructure[] = [];
        try {
            const fields = data.Attributes;
            for (const field of fields) {
                const displayName = field.DisplayName?.UserLocalizedLabel?.Label?.trim() ?? "";
                const logicalname = field.LogicalName ?? "";
                console.log(`logicalname: ${logicalname}`);
                if (displayName) {   // only add if not blank
                    children.push({
                        id: field.MetadataId,
                        DisplayName: displayName,
                        LogicalName: logicalname,
                        SchemaName: field.SchemaName ?? "",
                        AttributeType: field.AttributeType ?? "",
                        Description: field.Description?.UserLocalizedLabel?.Label ?? "",
                        Remarks: (!logicalname.startsWith(publisherprefix) || logicalname.length === 0)
                            ? `Prefix does not match publisher prefix ${publisherprefix}` : ""
                    });
                }
            }
        }
        catch (e) {
            Logger.info(`error retrieving columns: ${e}`)
        }

        return {
            id: data.MetadataId || data.id || "",
            DisplayName: data.DisplayName?.UserLocalizedLabel?.Label || "",
            LogicalName: data.LogicalName || "",
            SchemaName: data.SchemaName || "",
            Remarks: "",
            Description: data.Description?.UserLocalizedLabel?.Label || "",
            _children: children
        };
    },
    default: (data, publisherprefix) => ({ // default
        id: data.MetadataId || data.id || "",
        DisplayName: data.DisplayName?.UserLocalizedLabel?.Label || "",
        LogicalName: data.LogicalName || "",
        SchemaName: data.SchemaName || "",
        Remarks: "",
        Description: data.Description?.UserLocalizedLabel?.Label || ""
    }),
};