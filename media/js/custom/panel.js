$(document).ready(function () {

    $("#screendetails").hide();
    $("#btnSectionTwo").text(sectionTwo + " - No Canvas App Selected");

    $('#btnUploadMSApp').click(function () {
        clearControls();
        clearAppScreens("tblAppScreens");
        vscode.postMessage({ type: 'uploadMSAppFile' });
    });

    // expose globally
    window.showControlTree = function (screenname) {
        const $tbody = $("#treeBody");
        $tbody.empty();

        const targetFilePath = appsettings.workingFolder;
        vscode.postMessage({ type: 'getControlTree', screenName: screenname, filePath: targetFilePath });
    };

    // Save button click
    $("#btnSave").on("click", function () {
        clearControls();
        clearAppScreens("tblAppScreens");
        const tableId = "tblNamingStandards";
        const table = Tabulator.findTable("#" + tableId)[0];
        const tableData = table.getData();
        // Collect all _children arrays into one
        const allChildren = tableData.flatMap(row => row._children || []);
        const output = allChildren.map(({ index, ...rest }) => rest);
        vscode.postMessage({ type: 'saveNameStandards', data: output });
        $("#collapseTwo").collapse("show");
    });

    // Reset button click
    $("#btnReset").on("click", function () {
        clearControls();
        clearAppScreens("tblAppScreens");
        vscode.postMessage({ type: 'resetNameStandards' });
    });

    function clearControls() {
        const $fbody = $("#filesBody");
        $fbody.empty();

        const $tbody = $("#treeBody");
        $tbody.empty();

        $("#title").text("");
        $("#script").html("");
        $("#screendetails").hide();
    }

    function clearAppScreens(tableId) {
        var existing = Tabulator.findTable("#" + tableId)[0];
        if (existing) {
            existing.destroy();
            $('#tblAppScreens').hide();
        }
        $("#btnSectionTwo").text(sectionTwo + " - No Canvas App Selected");
        $("#btnSectionThree").text(sectionThree);

        $('#filename').text("No File Selected");
    }

    $("#btnDownload").on("click", function () {
        vscode.postMessage({ type: 'downloadControlNameFile' });
    });

    $("#btnUpload").on("click", function () {
        clearControls();
        clearAppScreens("tblAppScreens");
        vscode.postMessage({ type: 'uploadControlNameFile' });
    });




    // document.ready end    
});