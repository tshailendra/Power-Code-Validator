interface FlattenedStructure {
    id: string;
    DisplayName: string;
    LogicalName: string;
    SchemaName: string;
    Description: string;
    AttributeType?: string;
    Remarks: string;
    _children?: any[];
}