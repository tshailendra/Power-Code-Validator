// listen for extension messages
window.addEventListener("message", (event) => {
    const { type, payload, templateNames } = event.data;

    if (type === "initFiles") {
        $("#btnSectionTwo").text(sectionTwo + " - " + payload.fileName);
        initTblAppScreens("tblAppScreens", payload.data, payload.targetFolder);
        $("#collapseThree").collapse("show");
        $('#tblAppScreens').show();
    }
    else if (type === "updateStatus") {// from fileprocess.ts
        updateScreenDetails(payload);
    }
    else if (type === "selectedFile") {
        $('#filename').text(payload);
    }
    else if (type === "controlTree") {
        buildTreeTable("#treeBody", payload, templateNames);
    }
    else if (type === "setNameStandards") {
        initTblNameStandards("tblNamingStandards", payload);
        appSettings.controlNameConventions = payload.output;
    }
    else if (type === "setAppScreens") {
        initTblAppScreens("tblAppScreens", payload);
    }
});

function updateScreenDetails(payload) {
    var table = Tabulator.findTable("#tblAppScreens")[0];
    if (table) {
        let rows = table.getRows();   // RowComponents

        for (let i = 0; i < rows.length; i++) {
            let parentRow = rows[i];
            let childRows = parentRow.getTreeChildren();
            let found = false;
            for (let j = 0; j < childRows.length; j++) {
                let childRow = childRows[j];
                let data = childRow.getData();

                if (data.file === payload.index) {   // check your condition
                    childRow.update({ file: payload.index, status: payload.status, screenName: payload.screenName }); // update field
                    found = true;
                    break; // break out of inner loop
                }
            }
            if (found) { break; }
        }
    }
}

function statusIcon(status) {
    switch (status) {
        case 'Pending':
            return status + " ⏳";
        case 'Failed':
            return status + " ❌";
        case 'Processing':
            return status + " ⚙️";
        case 'Done':
            return status + " ✅";
        case 'Error':
            return status + " ⚠️";
        default:
            return status + " 🔴";
    }
}

