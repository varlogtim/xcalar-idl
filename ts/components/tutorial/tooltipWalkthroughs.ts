namespace TooltipWalkthroughs {

    // XXX TODO: add something that enters a workbook if not in one.

    export function SQLModeWalkthrough(): void {
        TooltipManager.start("SQL Mode",
            [{
                highlight_div: "#menuBar",
                text: "The menu bar allows you to access various features within Xcalar Design.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                text: "This tab allows you to import data, create tables, and create data targets.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#sqlTab",
                text: "The SQL workspace is where you'll be creating and executing SQL queries.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#monitorTab",
                text: "The monitor tab provides various tools to monitor Xcalar usage, manage your files, and change settings.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dataStoresTab",
                interact_div: "#dataStoresTab .mainTab",
                text: "Let's get started with importing a table. Click this tab to open it.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#sourceTblButton",
                interact_div: "#sourceTblButton",
                text: "Clicking the Tables button lets you create a new table.",
                type: TooltipType.Click
            },
            {
                highlight_div: "#dsForm-path",
                text: "Here we can select a data target and the source path to create a table.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#dsForm-target",
                text: "The data target is the source from where we import data from.",
                type: TooltipType.Text
            },
            {
                highlight_div: "#filePath",
                interact_div: "#filePath",
                text: "The file path is where we browse and import data from, in relation to the target." +
                    "Type in /netstore/datasets/",
                type: TooltipType.Value,
                value: "/netstore/datasets/"
            },],
            true,
            0
        );
    }

}