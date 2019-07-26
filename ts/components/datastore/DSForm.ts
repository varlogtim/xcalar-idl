namespace DSForm {
    let $pathCard: JQuery; // $("#dsForm-path");
    let $filePath: JQuery;  // $("#filePath");
    let historyPathsSet = {};

    /**
     * DSForm.View
     */
    export enum View {
        "Path" = "DSForm",
        "Browser" = "FileBrowser",
        "Preview" = "DSPreview"
    };

    /**
     * DSForm.setup
     */
    export function setup(): void {
        $pathCard = $("#dsForm-path");
        $filePath = $("#filePath");

        setupPathCard();
        DSPreview.setup();
        FileBrowser.setup();

        // click to go to form section
        $("#datastoreMenu .iconSection .import").click(function() {
            let $btn = $(this);
            $btn.blur();
            let createTableMode: boolean = $btn.hasClass("createTable");
            DSForm.show(createTableMode);
            xcTooltip.transient($("#filePath"), {
                "title": TooltipTStr.Focused
            }, 800);
        });
    }

    /**
     * DSForm.initialize
     */
    export function initialize(): void {
        // reset anything browser may have autofilled
        resetForm();
        DSPreview.update();
        $("#dsForm-target input").val(gDefaultSharedRoot);
    }

    /**
     * DSForm.show
     * @param createTableMode
     */
    export function show(createTableMode?: boolean): void {
        if (createTableMode != null) {
            DSPreview.setMode(createTableMode);
        }
        DSForm.switchView(DSForm.View.Path);
        $filePath.focus();
    }

    /**
     * DSForm.switchView
     */
    export function switchView(view: DSForm.View): void {
        let $cardToSwitch: JQuery = null;
        let wasInPreview = !$("#dsForm-preview").hasClass("xc-hidden");
        switch (view) {
            case DSForm.View.Path:
                $cardToSwitch = $pathCard;
                break;
            case DSForm.View.Browser:
                $cardToSwitch = $("#fileBrowser");
                break;
            case DSForm.View.Preview:
                $cardToSwitch = $("#dsForm-preview");
                break;
            default:
                console.error("invalid view");
                return;
        }

        if (wasInPreview) {
            DSPreview.cancelLaod();
        }

        $cardToSwitch.removeClass("xc-hidden")
        .siblings().addClass("xc-hidden");

        let $dsFormView = $("#dsFormView");
        if (!$dsFormView.is(":visible")) {
            $dsFormView.removeClass("xc-hidden");
            DSTable.hide();
            TblSourcePreview.Instance.close();
        }
    }

    /**
     * DSForm.hide
     */
    export function hide(): void {
        $("#dsFormView").addClass("xc-hidden");
        DSPreview.clear();
        FileBrowser.clear();
    }

    /**
     * DSForm.addHistoryPath
     * @param targetName
     * @param path
     */
    export function addHistoryPath(targetName: string, path: string): void {
        historyPathsSet[targetName] = historyPathsSet[targetName] || [];
        let historyPaths = historyPathsSet[targetName];
        for (let i = 0, len = historyPaths.length; i < len; i++) {
            if (historyPaths[i] === path) {
                historyPaths.splice(i, 1);
                break;
            }
        }

        historyPaths.unshift(path);
        if (historyPaths.length > 5) {
            // remove the oldest path
            historyPaths.pop();
        }
        if (getDataTarget() === targetName) {
            $filePath.val(path);
        }
    }

    function isValidPathToBrowse(): boolean {
        let isValid = xcHelper.validate([{
            $ele: $("#dsForm-target").find(".text")
        }]);
        if (!isValid) {
            return false;
        }

        let targetName = getDataTarget();
        let path: string = $filePath.val().trim();
        if (DSTargetManager.isGeneratedTarget(targetName)) {
            isValid = xcHelper.validate([{
                $ele: $filePath,
                error: DSFormTStr.GeneratedTargetHint,
                check: function() {
                    return !Number.isInteger(Number(path));
                }
            }]);
        }

        return isValid;
    }

    function isValidToPreview(): boolean {
        return xcHelper.validate([{
            $ele: $filePath
        }]);
    }

    function getDataTarget(): string {
        return $("#dsForm-target input").val();
    }

    export function setDataTarget(targetName: string): void {
        $("#dsForm-target input").val(targetName);
        if (DSTargetManager.isGeneratedTarget(targetName)) {
            $pathCard.addClass("target-generated");
            $filePath.attr("placeholder", DSFormTStr.GeneratedTargetHint);
        } else {
            $pathCard.removeClass("target-generated");
            $filePath.removeAttr("placeholder");
        }

        if (DSTargetManager.isDatabaseTarget(targetName)) {
            $pathCard.addClass("target-database");
            $filePath.attr('disabled', 'true');
            DSForm.addHistoryPath(targetName, `/${targetName}`);
        } else {
            $pathCard.removeClass("target-database");
            $filePath.removeAttr("disabled");
        }

        let historyPaths = historyPathsSet[targetName];
        let oldPath = "";
        if (historyPaths != null) {
            oldPath = historyPaths[0] || "";
        }
        $filePath.val(oldPath).focus();
    }

    function setPathMenu(): void {
        let $list = $filePath.closest(".dropDownList").find(".list");
        let $ul = $list.find("ul");
        let target = getDataTarget();
        let historyPaths = historyPathsSet[target];
        if (historyPaths == null || historyPaths.length === 0) {
            $ul.empty();
            $list.addClass("empty");
        } else {
            let list = historyPaths.map(function(path) {
                return "<li>" + path + "</li>";
            }).join("");
            $ul.html(list);
            $list.removeClass("empty");
        }
    }

    function getFilePath(targetName: string): string {
        let path: string = $filePath.val().trim();

        if (!DSTargetManager.isGeneratedTarget(targetName)) {
            if (!path.startsWith("/")) {
                path = "/" + path;
            }

            let parts:string[] = path.split("/");
            if (parts[parts.length-1].indexOf(".") == -1 &&
                !path.endsWith("/")) {
                path = path + "/";
            }
        }
        if (DSTargetManager.isDatabaseTarget(targetName)) {
            path = `/${targetName}`;
        }
        return path;
    }

    function setupPathCard(): void {
        //set up dropdown list for data target
        new MenuHelper($("#dsForm-target"), {
            onSelect: function($li) {
                if ($li.hasClass("createNew")) {
                    MainMenu.openPanel("datastorePanel", "targetButton");
                    DSTargetManager.showTargetCreateView();
                    return;
                }
                setDataTarget($li.text());
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
        }).setupListeners();

        let $filePathDropDown = $filePath.closest(".dropDownList");
        new MenuHelper($filePathDropDown, {
            onOpen: setPathMenu,
            onSelect: function($li) {
                $filePathDropDown.find("input").val($li.text());
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
        }).setupListeners();

        // open file browser
        $pathCard.on("click", ".browse", function() {
            $(this).blur();
            goToBrowse();
        });

        $pathCard.on("click", ".confirm", function() {
            goToPreview();
        });

        $pathCard.on("click", ".cancel", resetForm);

        $filePath.on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                $pathCard.find(".browse").click();
            }
        });
    }

    function resetForm(): void {
        let targetName: string = getDataTarget() || "";
        setDataTarget(targetName);
        $filePath.val("").focus();
    }

    function goToBrowse(): void {
        if (!isValidPathToBrowse()) {
            return;
        }
        let targetName = getDataTarget();
        let path = getFilePath(null);
        FileBrowser.show(targetName, path, false);
    }

    function goToPreview(): void {
        if (!isValidPathToBrowse() || !isValidToPreview()) {
            return;
        }
        let targetName = getDataTarget();
        let path = getFilePath(targetName);
        if (path !== "/") {
            DSForm.addHistoryPath(targetName, path);
        }

        DSPreview.show({
            targetName: targetName,
            files: [{path: path}]
        }, null, false);
    }

    /* Unit Test Only */
    export let __testOnly__: any = {};
    if (typeof window !== 'undefined' && window['unitTestMode']) {
        __testOnly__ = {};
        __testOnly__.resetForm = resetForm;
        __testOnly__.getFilePath = getFilePath;
        __testOnly__.setDataTarget = setDataTarget;
        __testOnly__.getDataTarget = getDataTarget;
        __testOnly__.isValidPathToBrowse = isValidPathToBrowse;
        __testOnly__.isValidToPreview = isValidToPreview;
    }
    /* End Of Unit Test Only */
}
