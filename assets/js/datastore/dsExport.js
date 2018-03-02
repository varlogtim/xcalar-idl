window.DSExport = (function($, DSExport) {
    var exportTargets = [];
    var $gridView;  // $("#dsExportListSection .gridItems");
    var $form;
    var $editForm;
    var $udfModuleList;
    var $targetTypeList;
    var $targetTypeInput;
    var $exportTargetCard;
    var $exportTargetEditCard;
    var $gridMenu; // $("#expTargetGridMenu");
    var defaultPath;

    DSExport.setup = function() {
        $gridView = $("#dsExportListSection .gridItems");
        $form = $("#exportDataForm");
        $editForm = $("#exportDataEditForm");
        $udfModuleList = $form.find(".udfModuleListWrap");
        $exportTargetCard = $("#exportTargetCard");
        $exportTargetEditCard = $("#exportTargetEditCard");
        $gridMenu = $("#expTargetGridMenu");

        $targetTypeList = $("#targetTypeList");
        $targetTypeInput = $targetTypeList.find(".text");

        setupDropdowns();
        setupGridMenu();
        xcMenu.add($gridMenu);

        $("#dsExport-refresh").click(function() {
            DSExport.refresh();
        });

        $("#createExportButton").click(function() {
            if (!$("#datastoreMenu").hasClass("noAdmin")) {
                showExportTargetForm();
            }
        });

        $gridView.on("click", ".grid-unit", function() {
            // event.stopPropagation(); // stop event bubbling
            var $grid = $(this);
            selectGrid($grid);
        });

        $form.submit(function(event) {
            event.preventDefault();
            $form.find("input").blur();
            var $submitBtn = $("#exportFormSubmit").blur();
            xcHelper.toggleBtnInProgress($submitBtn, true);
            xcHelper.disableSubmit($submitBtn);
            $form.find(".formRow").addClass("disabled");

            var targetType = $targetTypeInput.data("value");
            var name = $("#targetName").val().trim();
            var formatSpecificArg = $form.find(".active .formatSpecificArg")
                                         .val();
            var options = {};
            if (targetType === "UDF") {
                options.module = $form.find(".udfModuleName").val().trim();
                options.fn = "main";
            }

            submitForm(targetType, name, formatSpecificArg, options)
            .then(function() {
                xcHelper.toggleBtnInProgress($submitBtn, true);
                xcHelper.showSuccess(SuccessTStr.Target);
                resetForm();
                KVStore.commit();
            })
            .fail(function(error) {
                // fail case being handled in submitForm
                xcConsole.error(error);
                xcHelper.toggleBtnInProgress($submitBtn, false);
            })
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
                $form.find(".formRow").removeClass("disabled");
            });
        });

        $("#exportFormReset").click(function() {
            $form.find(".formatSpecificRow").removeClass("active");
            $form.find(".placeholderRow").removeClass("xc-hidden");
            $targetTypeInput.data("value", "");
            $gridView.find(".gridArea .active").removeClass("active");

            $exportTargetCard.find(".tempDisabled").removeClass("tempDisabled")
                             .prop("disabled", false);
            $("#targetName").focus();
        });

        $("#dsExportListSection").on("click", ".targetInfo", function() {
            $(this).closest(".xc-expand-list").toggleClass("active");
        });

        $("#exportTargetDelete").click(function() {
            deleteTarget();
        });
    };

    DSExport.refresh = function(noWaitIcon) {
        var deferred = jQuery.Deferred();
        if (!noWaitIcon) {
            xcHelper.showRefreshIcon($("#dsExportListSection"));
        }

        var $activeIcon = $gridView.find(".target.active");
        var activeName;
        var activeType;
        if ($activeIcon.length) {
            activeName = $activeIcon.data("name");
            activeType = $activeIcon.closest(".targetSection").data("type");
        }

        XcalarListExportTargets("*", "*")
        .then(function(targs) {
            var targets = targs.targets;
            var numTargs = targs.numTargets;
            var types = [];
            // var formartArg;
            var target;
            exportTargets = [];

            for (var i = 0; i < numTargs; i++) {
                var type = targets[i].hdr.type;
                var typeTStr = ExTargetTypeTStr[type];
                var options = {};
                if (type === ExTargetTypeT.ExTargetSFType) {
                    type = ExportTStr.LocalFS;
                    formatArg = targets[i].specificInput.sfInput.url;
                } else if (typeTStr === "odbc") {
                    type = "ODBC";
                    formatArg = targets[i].specificInput.odbcInput
                                                        .connectionString;
                } else if (type === ExTargetTypeT.ExTargetUDFType) {
                    type = UDFTStr.UDF;
                    formatArg = targets[i].specificInput.udfInput.url;
                    var udfName = targets[i].specificInput.udfInput.appName;
                    udfName = udfName.split(":");
                    if (udfName.length === 2) {
                        options.module = udfName[0];
                        options.fn = udfName[1];
                    }
                }
                var typeIndex = types.indexOf(type);
                if (typeIndex === -1) {
                    types.push(type);
                    typeIndex = types.length - 1;
                    exportTargets.push({name: type, targets: []});
                }
                target = {
                    name: targets[i].hdr.name,
                    formatArg: formatArg,
                    options: options
                };
                exportTargets[typeIndex].targets.push(target);
            }
            sortExportTargets();
            restoreGrids(activeName, activeType);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(DSExportTStr.RestoreFail, error.error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    // updates the udf list
    DSExport.refreshUDF = function(listXdfsObj) {
        var udfObj = xcHelper.getUDFList(listXdfsObj, true);
        $udfModuleList.find("ul").html(udfObj.moduleLis);
        xcTooltip.add($udfModuleList.find(".noMain"), {
            title: TooltipTStr.UDFNoMain
        });
    };

    DSExport.toggleXcUDFs = function(hide) {
        if (hide) {
            $udfModuleList.find("li").filter(function() {
                return $(this).text().indexOf("_xcalar") === 0;
            }).addClass("xcUDF");
        } else {
            $udfModuleList.find("li").removeClass("xcUDF");
        }
    };

    DSExport.getTargets = function() {
        return exportTargets;
    };

    DSExport.getDefaultPath = function() {
        if (defaultPath) { // if cached
            PromiseHelper.resolve(defaultPath);
        }
        var deferred = jQuery.Deferred();
        var path;
        if (exportTargets.length === 0) {
            DSExport.refresh()
            .then(function() {
                path = getDefaultPath();
                defaultPath = path;
                deferred.resolve(path);
            })
            .fail(function() {
                deferred.resolve("");
            });
        } else {
            path = getDefaultPath();
            defaultPath = path;
            deferred.resolve(path);
        }

        return deferred.promise();
    };

    DSExport.getTarget = function(name) {
        for (var i = 0; i < exportTargets.length; i++) {
            var targGroup = exportTargets[i];
            var type = targGroup.name;
            for (var j = 0; j < targGroup.targets.length; j++) {
                var target = targGroup.targets[j];
                if (target.name === name) {
                    if (type === ExportTStr.LocalFS) {
                        type = ExTargetTypeT.ExTargetSFType;
                    } else {
                        type = ExTargetTypeT.ExTargetUDFType;
                    }
                    return {
                        type: type,
                        info: target
                    };
                }
            }
        }
        return null;
    };

    DSExport.clickFirstGrid = function() {
        $gridView.find(".target").eq(0).click();
    };

    function getDefaultPath() {
        var group;
        var targets;
        for (var i = 0; i < exportTargets.length; i++) {
            group = exportTargets[i];
            if (group.name === ExportTStr.LocalFS) {
                targets = group.targets;
                for (var j = 0; j < targets.length; j++) {
                    if (targets[j].name === "Default") {
                        return targets[j].formatArg;
                    }
                }
                break;
            }
        }
        return "";
    }

    function setupDropdowns() {
        new MenuHelper($targetTypeList, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }
                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                $form.find(".placeholderRow").addClass("xc-hidden");
                $targetTypeInput.val($li.text()).removeClass("hint");
                var type = $li.attr("name");
                $targetTypeInput.data("value", type);
                $form.find(".formatSpecificRow").removeClass("active");
                if (type === "ODBC") {
                    $("#connectionStr").closest(".formatSpecificRow")
                                       .addClass("active");
                } else {
                    $("#exportURL").closest(".formatSpecificRow")
                                   .addClass("active");
                }
                var hasPlaceholder = false;
                if (type === "UDF") {
                    $form.find(".udfSelectorRow").addClass("active");
                    hasPlaceholder = true;
                }
                changePathInputPlaceholder(hasPlaceholder);
                StatusBox.forceHide();
            },
            "container": "#exportDataForm"
        }).setupListeners();

        new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                var module = $li.text();
                $udfModuleList.find(".udfModuleName").val(module);
                StatusBox.forceHide();
            },
            "bounds": "#datastorePanel > .mainContent",
            "bottomPadding": 5
        }).setupListeners();
    }

    function sortExportTargets() {
        var targets;
        for (var i = 0; i < exportTargets.length; i++) {
            targets = exportTargets[i].targets;
            targets.sort(sortTargets);
        }
        function sortTargets(a, b) {
            return xcHelper.sortVals(a.name, b.name);
        }
    }

    function selectGrid($grid) {
        clearSelectedGrid();
        if ($grid.hasClass("active")) {
            return;
        }

        $exportTargetCard.addClass("xc-hidden");
        $exportTargetEditCard.removeClass("xc-hidden");
        var $activeInputs = $exportTargetEditCard.find("input:enabled");
        $activeInputs.addClass("tempDisabled").prop("disabled", true);

        $gridView.find(".gridArea .active").removeClass("active");
        $grid.addClass("active");
        var name = $grid.data("name");
        var type = $grid.closest(".targetSection").data("type");
        var formatArg = $grid.data("formatarg");

        $("#targetName-edit").val(name);
        $("#targetTypeList-edit").find(".text").val(type);

        $form.find(".formatSpecificRow").removeClass("active");
        $editForm.find(".formatSpecificRow").removeClass("active");
        if (type === "ODBC") {
            $("#connectionStr-edit").closest(".formatSpecificRow")
                               .addClass("active");
            $("#connectionStr-edit").val(formatArg);
        } else {
            $("#exportURL-edit").closest(".formatSpecificRow")
                           .addClass("active");
            $("#exportURL-edit").val(FileProtocol.nfs.substring(0,
                FileProtocol.nfs.length - 1) + formatArg);
        }
        if (type === "UDF") {
            $editForm.find(".udfSelectorRow").addClass("active");
            $editForm.find(".udfModuleName").val($grid.data("module"));
            $editForm.find(".udfFuncName").val($grid.data("fnname"));
        }
        var $deleteBtn = $("#exportTargetDelete");
        if (name === "Default" || (!Admin.isAdmin())) {
            $deleteBtn.addClass("unavailable");
            xcTooltip.add($deleteBtn, {
                title: DSExportTStr.NoDelete
            });
        } else {
            $deleteBtn.removeClass("unavailable");
            xcTooltip.remove($deleteBtn);
        }
    }

    function resetForm() {
        $("#exportFormReset").click();
        // "main" should not be translated into other language
        // so don't put into jsTStr
        $form.find(".udfFuncName").val("main");
    }

    function clearSelectedGrid() {
        $gridView.find(".selected").removeClass("selected");
    }

    function docTempMouseup() {
        clearSelectedGrid();
        $(document).off("mouseup.gridSelected");
    }

    function setupGridMenu() {
        $gridView.closest(".mainSection").contextmenu(function(event) {
            var $target = $(event.target);
            var $grid = $target.closest(".grid-unit");
            var classes = "";
            clearSelectedGrid();

            if ($grid.length) {
                $grid.addClass("selected");
                $gridMenu.data("grid", $grid);
                $(document).on("mouseup.gridSelected", function(event) {
                    // do not deselect if mouseup is on the menu or menu open
                    if (!$(event.target).closest("#expTargetGridMenu").length
                        && !$("#expTargetGridMenu").is(":visible")) {
                        docTempMouseup();
                    }
                });
                classes += " targetOpts";
            } else {
                classes += " bgOpts";
            }
            var $deleteLi = $gridMenu.find('.targetOpt[data-action="delete"]');
            if ($grid.data("name") === "Default") {
                $deleteLi.addClass("unavailable");
                xcTooltip.add($deleteLi, {
                    title: DSExportTStr.NoDelete
                });
            } else {
                $deleteLi.removeClass("unavailable");
                xcTooltip.remove($deleteLi);
            }

            xcHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes,
                "floating": true
            });
            return false;
        });

        $gridMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var action = $(this).data("action");
            if (!action) {
                return;
            }
            if ($(this).hasClass("unavailable")) {
                return;
            }

            switch (action) {
                case ("view"):
                    selectGrid($gridMenu.data("grid"));
                    break;
                case ("delete"):
                    deleteTarget($gridMenu.data("grid"));
                    break;
                case ("create"):
                    showExportTargetForm();
                    break;
                case ("refresh"):
                    DSExport.refresh();
                    break;
                default:
                    console.warn("menu action not recognized:", action);
                    break;
            }
            clearSelectedGrid();
        });
    }

    function changePathInputPlaceholder(hasPlaceholder) {
        if (!hasPlaceholder) {
            $("#exportURL").attr("placeholder", "");
            return;
        }
        DSExport.getDefaultPath()
        .then(function(dPath) {
            if (dPath.length) {
                dPath = dPath.slice(1);
            } else {
                dPath = DSExportTStr.DefaultPath;
            }
            var msg = xcHelper.replaceMsg(DSExportTStr.URLPlaceholder, {
                target: dPath
            });
            $("#exportURL").attr("placeholder", msg);
        });
    }

    function showExportTargetForm() {
        if ($exportTargetCard.hasClass("xc-hidden")) {
            $exportTargetCard.removeClass("xc-hidden");
            $exportTargetEditCard.addClass("xc-hidden");
            resetForm();
        } else {
            $("#targetName").focus();
        }
    }

    function deleteTarget($grid) {
        var $activeIcon;
        if ($grid && $grid.length) {
            $activeIcon = $grid;
        } else {
            $activeIcon = $gridView.find(".target.active");
        }

        var targetName = $activeIcon.data("name");

        if (targetName === "Default") {
            return;
        }
        var targetTypeText = $activeIcon.closest(".targetSection").data("type");

        var targetType;
        if (targetTypeText === UDFTStr.UDF) {
            targetType = ExTargetTypeT.ExTargetUDFType;
        } else if (targetTypeText === ExportTStr.LocalFS) {
            targetType = ExTargetTypeT.ExTargetSFType;
        }

        Alert.show({
            "title": DSExportTStr.DeleteExportTarget,
            "msgTemplate": xcHelper.replaceMsg(DSExportTStr.DeleteConfirmMsg,
                                {"target": targetName}),
            "onConfirm": function() {
                XcalarRemoveExportTarget(targetName, targetType)
                .then(function() {
                    resolveDelete();
                })
                .fail(function(error) {
                    if (error && error.status ===
                        StatusT.StatusTargetDoesntExist) {
                        resolveDelete();
                    } else {
                        Alert.error(DSExportTStr.DeleteFail, error.error);
                    }
                });

                function resolveDelete() {
                    if ($activeIcon.hasClass("active")) {
                        showExportTargetForm();
                    }
                    XcSocket.sendMessage("refreshDSExport");
                    DSExport.refresh();
                }
            }
        });
    }

    function submitForm(targetType, name, formatSpecificArg, options) {
        var deferred = jQuery.Deferred();
        var $targetTypeInput = $("#targetTypeList").find(".text");
        var $formatSpecificInput = $form.find(".active .formatSpecificArg");
        var isValid = xcHelper.validate([
            {
                "$ele": $("#targetName"),
                "error": ErrTStr.NoEmpty,
                "side": "top",
                "check": function() {
                    return (name === "");
                }
            },
            {
                "$ele": $targetTypeInput,
                "error": ErrTStr.NoEmptyList,
                "side": "top",
                "check": function() {
                    return (targetType === "");
                }
            },
            {
                "$ele": $formatSpecificInput,
                "error": ErrTStr.NoEmpty,
                "side": "top",
                "check": function() {
                    if (targetType === "ODBC" || targetType === "UDF") {
                        return false;
                    } else {
                        return (formatSpecificArg.trim() === "");
                    }
                }
            },
            {
                "$ele": $formatSpecificInput,
                "error": DSExportTStr.InvalidExportPath,
                "side": "top",
                "check": function() {
                    if (targetType === "ODBC") {
                        return false;
                    } else {
                        return (formatSpecificArg.indexOf('"') > -1);
                    }
                }
            },
            {
                "$ele": $form.find(".udfModuleName"),
                "error": ErrTStr.NoEmptyList,
                "side": "top",
                "check": function() {
                    if (targetType === "UDF") {
                        return (options.module === "");
                    } else {
                        return false;
                    }
                }
            }
        ]);

        if (!isValid) {
            deferred.reject("Invalid Parameters");
            return deferred.promise();
        }
        formatSpecificArg = formatSpecificArg.trim();
        var promise;
        if (targetType === "LocalFilesystem") {
            promise = XcalarAddLocalFSExportTarget(name, formatSpecificArg);
        } else if (targetType === "ODBC") {
            promise = XcalarAddODBCExportTarget(name, formatSpecificArg);
        } else if (targetType === "UDF") {
            var udfName = options.module + ":" + options.fn;
            promise = addUDFExportTarget(name, formatSpecificArg,
                                                udfName);
        } else {
            var error = {error: DSExportTStr.InvalidTypeMsg};
            Alert.error(DSExportTStr.InvalidType, error.error);
            deferred.reject(error);
            return deferred.promise();
        }

        promise
        .then(function(path) {
            if (targetType === "UDF") {
                formatSpecificArg = path;
            }
            addGridIcon(targetType, name, formatSpecificArg, options);
            XcSocket.sendMessage("refreshDSExport");
            deferred.resolve();
        })
        .fail(function(err) {
            Alert.error(DSExportTStr.ExportFail, err);
            deferred.reject(err);
        });

        return deferred.promise();
    }

    function addUDFExportTarget(name, formatSpecificArg, udfName) {
        var deferred = jQuery.Deferred();
        var promise;
        var newPath;
        if (formatSpecificArg === "") {
            promise = DSExport.getDefaultPath();
        } else {
            promise = PromiseHelper.resolve(formatSpecificArg);
        }
        promise
        .then(function(path) {
            if (formatSpecificArg === "") {
                path = path.slice(1);
            }
            newPath = path;
            return XcalarAddUDFExportTarget(name, path, udfName);
        })
        .then(function() {
            deferred.resolve(newPath);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function restoreGrids(activeName, activeType) {
        var numTypes = exportTargets.length;
        var html = "";
        var name;
        var targetType;
        var targetTypeId;

        for (var i = 0; i < numTypes; i++) {
            name = exportTargets[i].name;
            targetType = name;
            targetTypeId = name.replace(/\s/g, '');
            html += '<div id="gridTarget-' + targetTypeId + '"' +
                        ' class="targetSection xc-expand-list clearfix ' +
                        'active" data-type="' + targetType + '">' +
                        '<div class="targetInfo">' +
                            '<span class="expand">' +
                                '<i class="icon xi-arrow-down fa-7"></i>' +
                            '</span>' +
                            '<span class="text">' + name + '</span>' +
                        '</div>' +
                        '<div class="gridArea">';
            var targets = exportTargets[i].targets;
            var numGrids = targets.length;
            for (var j = 0; j < numGrids; j++) {
                html += getGridHtml(targets[j]);
            }
            html += '</div>' +
                    '</div>';
        }
        $gridView.html(html);

        if (activeName && activeType) {
            var $section = $gridView.find('.targetSection[data-type="' +
                                            activeType + '"]');
            var $activeGrid = $section.find('.target[data-name="' + activeName +
                                            '"]');
            if (!$activeGrid.length) {
                showExportTargetForm();
            } else {
                $activeGrid.addClass("active");
            }

        }

        updateNumGrids();
    }

    function getGridHtml(target) {
        var name = target.name;
        var formatArg = target.formatArg;
        // var options = target.options;
        var extraDataAttr = "";
        if (target.options.module && target.options.fn) {
            extraDataAttr = 'data-module="' + target.options.module + '" ' +
                            'data-fnname="' + target.options.fn + '"';
        }

        var html = '<div class="target grid-unit" data-name="' + name + '" ' +
                    'data-formatarg="' + formatArg + '" ' + extraDataAttr +
                    '>' +
                        '<div class="gridIcon">' +
                            '<i class="icon xi-data-target"></i>' +
                        '</div>' +
                        '<div class="label" data-dsname="' + name +
                        '" data-toggle="tooltip" data-container="body"' +
                        ' data-placement="right" title="' + name + '">' +
                            name +
                        '</div>' +
                    '</div>';
        return html;
    }

    function addGridIcon(targetType, name, formatSpecificArg, options) {
        var target = {
            name: name,
            formatArg: "/" + formatSpecificArg, // backend prepends slash
            options: options
        };

        var $grid = $(getGridHtml(target));
        if (targetType === "LocalFilesystem") {
            targetType = ExportTStr.LocalFS;
        }

        var targetTypeId = targetType.replace(/\s/g, '');
        // $grid.append('<div class="waitingIcon"></div>');
        if ($('#gridTarget-' + targetTypeId).length === 0) {

            var gridSectionHtml = '<div id="gridTarget-' + targetTypeId + '"' +
                        ' class="targetSection xc-expand-list clearfix ' +
                        'active" data-type="' + targetType + '">' +
                        '<div class="targetInfo">' +
                            '<span class="expand">' +
                                '<i class="icon xi-arrow-down fa-7"></i>' +
                            '</span>' +
                            '<span class="text">' + targetType + '</span>' +
                        '</div>' +
                        '<div class="gridArea"></div>' +
                        '</div>';

            $gridView.append(gridSectionHtml);

            var targetGroup = {"name": targetType, "targets": []};
            exportTargets.push(targetGroup);
        }

        var $gridTarget = $('#gridTarget-' + targetTypeId).find('.gridArea');
        $gridTarget.append($grid);
        var groupIndex = $gridTarget.parent().index();
        exportTargets[groupIndex].targets.push(target);

        updateNumGrids();
        // selectGrid($grid); // problem with this because the mouse was on
        // the "add" button but is now hovering over the "delete" button
    }

    function updateNumGrids() {
        var numGrids = $gridView.find(".grid-unit").length;
        $(".numExportTargets").html(numGrids);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSExport.__testOnly__ = {};
        DSExport.__testOnly__.setTargets = function(targets) {
            exportTargets = targets;
        };
        DSExport.__testOnly__.submitForm = submitForm;
        DSExport.__testOnly__.resetForm = resetForm;
        DSExport.__testOnly__.showExportTargetForm = showExportTargetForm;
    }
    /* End Of Unit Test Only */

    return (DSExport);

}(jQuery, {}));
