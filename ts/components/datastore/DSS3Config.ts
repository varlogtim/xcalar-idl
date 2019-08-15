namespace DSS3Config {
    export function setup(): void {
        _addEventListeners();
    }

    /**
     * DSS3Config.show
     */
    export function show(): void {
        DataSourceManager.switchView(DataSourceManager.View.S3);
        _clear();
        _focusOnPath();
    }

    function _getCard(): JQuery {
        return $("#dsForm-s3Config");
    }

    function _getTargetSection(): JQuery {
        return _getCard().find(".target");
    }

    function _getPathInput(): JQuery {
        return _getCard().find(".path input");
    }

    function _focusOnPath(): void {
        _getPathInput().focus();
    }

    function _addEventListeners(): void {
        //set up dropdown list for target
        let $card = _getCard();
        _addDropdownListeners();

        $card.on("click", ".confirm", function() {
            _submitForm();
        });

        $card.on("click", ".cancel", function() {
            _clear();
        });

        $card.find(".cardBottom .link").click(function() {
            // back to data source panel
            _clear();
            DataSourceManager.startImport(null);
        });
    }

    function _addDropdownListeners(): void {
        let $dropDown = _getTargetSection().find(".dropDownList.bucket");
        new MenuHelper($dropDown, {
            onOpen: function() {
                _addS3BucketList($dropDown);
            },
            onSelect: function($li) {
                let $input = $dropDown.find("input");
                if ($li.hasClass("createNew")) {
                    S3ConfigModal.Instance.show((targetName) => {
                        $input.val(targetName);
                    });
                    return;
                }
                $input.val($li.text());
            },
            container: "#dsFormView",
            bounds: "#dsFormView"
        }).setupListeners();
    }

    function _addS3BucketList($dropDown: JQuery): void {
        let html: HTML = DSTargetManager.getS3Targets()
        .map((targetName) => `<li>${targetName}</li>`)
        .join("");
        html = '<li class="createNew">+ Create New Bucket</li>' +
                html;
        $dropDown.find("ul").html(html);
    }

    function _validatePreview(): {
        targetName: string,
        path: string
    } | null {
        let $path = _getPathInput();
        let $target = _getTargetSection().find("input");
        let valid: boolean = xcHelper.validate([{
            $ele: $target
        }, {
            $ele: $path
        }]);
        
        if (!valid) {
            return null;
        }

        let targetName: string = $target.val();
        return {
            targetName,
            path: _getPathInput().val().trim()
        };
    }

    function _submitForm(): void {
        let res = _validatePreview();
        if (res == null) {
            return;
        }
        let {path, targetName} = res;
        let cb = () => restoreFromPreview(targetName, path);
        _clear();
        DSPreview.show({
            targetName: targetName,
            files: [{path: path}]
        }, cb, false);
    }

    function restoreFromPreview(targetName: string, path: string): void {
        DSS3Config.show();
        _getTargetSection().find("input").val(targetName);
        _getPathInput().val(path);
    }

    function _clear(): void {
        _getPathInput().val("");
        _focusOnPath();
    }
}