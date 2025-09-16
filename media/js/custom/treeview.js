function initTblNameStandards(tableId, payload) {

    $('#lastupdate').text(payload.output.update);
    var existing = Tabulator.findTable("#" + tableId)[0];
    if (existing) {
        existing.destroy();
    }
    // Initialize only if no Tabulator is bound yet
    var table = new Tabulator("#" + tableId, {
        layout: "fitColumns",
        height: "500px",
        headerSort: false,
        selectable: true,  // allow row selection
        dataTree: true,
        dataTreeStartExpanded: true,
        placeholder: "No Data Available",
        columnDefaults: {
            resizable: false
        },
        data: payload.output.data,
        columns: [
            { title: "Index", field: "index", width: 80, hozAlign: "center", headerSort: false },
            { title: "Display Name", field: "display", headerSort: false },
            { title: "Control", field: "ctrl", headerSort: false },
            {
                title: "Prefix", field: "prefix", editor: "input", headerSort: false, tooltip: "Click to edit prefix value", editable: (cell) => {
                    const rowData = cell.getRow().getData();
                    return !!rowData.index; // only editable if index exists
                }
            },
            { title: "Parent", field: "parent", visible: false, headerSort: false }
        ]
    });

    table.on("rowClick", function (e, row) {
        table.getSelectedRows().forEach(r => r.deselect());
        row.select(true);
    });
}

function initTblAppScreens(tableId, payload, targetFolder) {
    appsettings.workingFolder = targetFolder;
    var existing = Tabulator.findTable("#" + tableId)[0];
    if (existing) {
        existing.destroy();
    }
    // Initialize only if no Tabulator is bound yet
    var table = new Tabulator("#" + tableId, {
        layout: "fitColumns",
        height: "500px",
        index: "file",
        headerSort: false,
        selectable: true,  // allow row selection
        dataTree: true,
        dataTreeStartExpanded: true,
        columnDefaults: {
            resizable: false        // disable manual resize by dragging
        },
        placeholder: "No Data Available",
        data: payload || [],
        columns: [
            { title: "File Name", field: "file", width: 150, headerSort: false },
            { title: "Screen", field: "screenName", headerSort: false },
            { title: "Folder", field: "folderPath", headerSort: false },
            { title: "Count", field: "count", headerSort: false },
            { title: "Status", field: "status", width: 100, hozAlign: "center", headerSort: false },
        ]
    });

    // safer event binding
    table.on("rowClick", function (e, row) {
        $("#screendetails").show();
        table.getSelectedRows().forEach(r => r.deselect());
        row.select(true);
        const rowData = row.getData();
        if (rowData.screenName) {
            $("#btnSectionThree").text(sectionThree + " - " + rowData.screenName);
            vscode.postMessage({ type: 'getControlTree', screenName: rowData.screenName, filePath: appsettings.workingFolder });
            $("#collapseFour").collapse("show");
        }
    });
}

let tableControlTree = null;
function buildTreeTable(container, rootNode, templateNames) {

    const $select = $("#ddcontrolType");

    // Clear existing options
    $select.empty();

    // Add default option
    $select.append($('<option>', {
        value: "",
        text: "--Filter--",
        selected: true,
        disabled: true
    }));


    $.each(templateNames, function (index, type) {
        $("#ddcontrolType").append(
            $("<option>", { value: type, text: type })
        );
    });

    const $tbody = $(container);
    $tbody.empty();

    var tableDataNested = [rootNode];
    tableControlTree = new Tabulator(container, {
        height: "400px",
        data: tableDataNested,
        layout: "fitColumns",
        selectable: true,  // allow row selection
        columnDefaults: {
            resizable: false        // disable manual resize by dragging
        },
        headerSort: false,
        dataTree: true,
        dataTreeStartExpanded: true,
        columns: [
            { title: "Name", field: "name", widthGrow: 2, headerSort: false }, //never hide this column
            { title: "Control", field: "templateName", widthGrow: 1, headerSort: false },
            { title: "Type", field: "type", widthGrow: 1, headerSort: false },
            { title: "Script", field: "script", widthGrow: 2, headerSort: false },
            { title: "Remarks", field: "remarks", widthGrow: 3, headerSort: false },
            {
                title: "Status", field: "status", widthGrow: 1, headerSort: false, hozAlign: "center",
                headerFilter: "select", // dropdown filter
                headerFilterParams: { "true": "True", "false": "False" },
                formatter: (cell) => {
                    const value = cell.getValue();
                    if (value === true || value === "true") {
                        return `<span style="color:green;font-weight:bold;">true</span>`;
                    } else if (value === false || value === "false") {
                        return `<span style="color:red;font-weight:bold;">false</span>`;
                    } else {
                        return `<span style="color:gray;font-style:italic;"></span>`;
                    }
                }
            },
        ],
    });

    tableControlTree.on("rowClick", function (e, row) {
        tableControlTree.getSelectedRows().forEach(r => r.deselect());
        row.select(true);
        const rowData = row.getData();
        const title = row.getTreeParent().getData().name + ' ' + rowData.name + ' (' + rowData.type + ')';

        $("#title").text("");
        $("#script").html("");

        let remarks = "";
        if (rowData.script) {
            remarks = `${(rowData.script || "")}<br>${(rowData.remarks || "")}`;
        }
        else {
            remarks = `${rowData.templateName} - ${rowData.name}<br>${(rowData.remarks || "")}`;
        }

        $("#title").text(title);
        $("#script").html(remarks);
    });
}


let filterActive = false;
$("#btnCtrlFilter").on("click", function () {
    if (!filterActive) {
        // Apply filter
        if (tableControlTree) {
            tableControlTree.setFilter(function (data) {
                return hasChildWithStatusFalse(data);
            });
        }
        // Update button to indicate filter is ON
        $(this)
            .removeClass("btn-danger")
            .addClass("btn-success")
            .text("Clear Status = false");

        filterActive = true;
    } else {
        // Clear filter
        if (tableControlTree) {
            tableControlTree.clearFilter();
        }

        // Reset button appearance
        $(this)
            .removeClass("btn-success")
            .addClass("btn-danger")
            .text("Show Status = false");

        filterActive = false;
    }
});

$("#ddcontrolType").on("change", function () {
    const selectedValue = $(this).val();
    if (tableControlTree) {
        tableControlTree.setFilter(function (data) {
            return hasChildWithControl(data, selectedValue);
        });
    }
    // filterControlsByType(selectedValue);
});

function hasChildWithStatusFalse(node) {
    // If this node itself has status and it's false
    if (node.status === false || node.status === "false") {
        return true;
    }

    // If it has children, check each one recursively
    if (Array.isArray(node._children)) {
        return node._children.some(child => hasChildWithStatusFalse(child));
    }

    return false;
}

function hasChildWithControl(node, templateName) {
    // If filter is cleared (== "" or "--Filter--"), always return true
    if (!templateName || templateName === "--Filter--") {
        return true;
    }
    // If this node itself has the control and it matches
    if (node.templateName === templateName) {
        return true;
    }

    // If it has children, check each one recursively
    if (Array.isArray(node._children)) {
        return node._children.some(child => hasChildWithControl(child, templateName));
    }

    return false;
}