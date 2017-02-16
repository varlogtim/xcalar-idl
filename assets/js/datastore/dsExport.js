window.DSExport = (function($, DSExport) {
    var exportTargets = [];
    var $gridView;  // $("#dsExportListSection .gridItems");
    var $form;
    var $editForm;
    var $udfModuleList;
    var $udfFuncList;
    var $targetTypeList;
    var $targetTypeInput;
    var $exportTargetCard;
    var $exportTargetEditCard;
    var $gridMenu; // $('#expTargetGridMenu');

    DSExport.setup = function() {
        $gridView = $("#dsExportListSection .gridItems");
        $form = $('#exportDataForm');
        $editForm = $('#exportDataEditForm');
        $udfModuleList = $form.find('.udfModuleListWrap');
        $udfFuncList = $form.find('.udfFuncListWrap');
        $exportTargetCard = $('#exportTargetCard');
        $exportTargetEditCard = $('#exportTargetEditCard');
        $gridMenu = $('#expTargetGridMenu');

        $targetTypeList = $('#targetTypeList');
        $targetTypeInput = $targetTypeList.find('.text');

        setupDropdowns();
        setupGridMenu();
        addMenuBehaviors($gridMenu);

        $("#dsExport-refresh").click(function() {
            DSExport.refresh();
        });

        $('#createExportButton').click(function() {
            showExportTargetForm();
        });

        $gridView.on("click", ".grid-unit", function() {
            // event.stopPropagation(); // stop event bubbling
            var $grid = $(this);
            selectGrid($grid);
        });

        $form.submit(function(event) {
            event.preventDefault();
            $form.find('input').blur();

            var $submitBtn = $("#exportFormSubmit").blur();
            xcHelper.disableSubmit($submitBtn);
            $form.find('.formRow').addClass('disabled');

            var targetType = $targetTypeInput.data('value');
            var name = $('#targetName').val().trim();
            var formatSpecificArg = $form.find('.active .formatSpecificArg')
                                         .val();
            var options = {};
            if (targetType === "UDF") {
                options.module = $form.find('.udfModuleName').val().trim();
                options.fn = $form.find('.udfFuncName').val().trim();
            }

            submitForm(targetType, name, formatSpecificArg, options)
            .then(function() {
                xcHelper.showSuccess(SuccessTStr.Target);
                resetForm();
                KVStore.commit();
            })
            .fail(function(error) {
                // fail case being handled in submitForm
                xcConsole.error(error);
            })
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
                $form.find('.formRow').removeClass('disabled');
            });
        });

        $('#exportFormReset').click(function() {
            $form.find('.formatSpecificRow').removeClass('active');
            $form.find('.placeholderRow').removeClass('xc-hidden');
            $targetTypeInput.data('value', "");
            xcTooltip.enable($udfFuncList.parent());
            $udfFuncList.addClass("disabled");
            $gridView.find(".gridArea .active").removeClass("active");
            // var $inputs = $exportTargetCard.find('input:enabled');
            $exportTargetCard.find('.tempDisabled').removeClass('tempDisabled')
                             .prop('disabled', false);
            $('#targetName').focus();
        });

        $("#dsExportListSection").on("click", ".targetInfo", function() {
            $(this).closest(".xc-expand-list").toggleClass("active");
        });

        $('#exportTargetDelete').click(function() {
            deleteTarget();
        });
    };

    DSExport.refresh = function(noWaitIcon) {
        var deferred = jQuery.Deferred();
        if (!noWaitIcon) {
            xcHelper.showRefreshIcon($('#dsExportListSection'));
        }

        var $activeIcon = $gridView.find('.target.active');
        var activeName;
        var activeType;
        if ($activeIcon.length) {
            activeName = $activeIcon.data('name');
            activeType = $activeIcon.closest('.targetSection').data('type');
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
            restoreGrids(activeName, activeType);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(DSExportTStr.RestoreFail, error.error);
            deferred.reject();
        });

        return deferred.promise();
    };

    // updates the udf list
    DSExport.refreshUDF = function(listXdfsObj) {
        var udfObj = xcHelper.getUDFList(listXdfsObj);
        $udfModuleList.find('ul').html(udfObj.moduleLis);
        $udfFuncList.find('ul').html(udfObj.fnLis);
    };

    DSExport.getTargets = function() {
        return exportTargets;
    };

    function setupDropdowns() {
        new MenuHelper($targetTypeList, {
            "onSelect": function($li) {
                if ($li.hasClass("hint")) {
                    return false;
                }
                if ($li.hasClass("unavailable")) {
                    return true; // return true to keep dropdown open
                }
                $form.find('.placeholderRow').addClass('xc-hidden');
                $targetTypeInput.val($li.text()).removeClass('hint');
                var type = $li.attr('name');
                $targetTypeInput.data('value', type);
                $form.find('.formatSpecificRow').removeClass('active');
                if (type === "ODBC") {
                    $('#connectionStr').closest('.formatSpecificRow')
                                       .addClass('active');
                } else {
                    $('#exportURL').closest('.formatSpecificRow')
                                   .addClass('active');
                }
                if (type === "UDF") {
                    $form.find('.udfSelectorRow').addClass('active');
                }
                StatusBox.forceHide();
            },
            "container": "#exportDataForm"
        }).setupListeners();

        new MenuHelper($udfModuleList, {
            "onSelect": function($li) {
                var module = $li.text();
                $udfModuleList.find('.udfModuleName').val(module);
                xcTooltip.disable($udfFuncList.parent());
                var $funcListLis = $udfFuncList.removeClass("disabled")
                                    .find("input").val("")
                                    .end()
                                    .find(".list li").addClass("hidden")
                                    .filter(function() {
                                        return $(this).data("module") === module;
                                    });
                $funcListLis.removeClass("hidden");

                // autofill input if there's only 1 option
                if ($funcListLis.length === 1) {
                    var func = $funcListLis.text();
                    $udfFuncList.find('.udfFuncName').val(func);
                }
                StatusBox.forceHide();
            },
            "bounds": "#datastorePanel > .mainContent",
            "bottomPadding": 5
        }).setupListeners();

        new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                $udfFuncList.find('.udfFuncName').val(func);
                StatusBox.forceHide();
            },
            "bounds": "#datastorePanel > .mainContent",
            "bottomPadding": 5
        }).setupListeners();
    }

    function selectGrid($grid) {
        clearSelectedGrid();
        if ($grid.hasClass('active')) {
            return;
        }

        $exportTargetCard.addClass('xc-hidden');
        $exportTargetEditCard.removeClass('xc-hidden');
        var $activeInputs = $exportTargetEditCard.find('input:enabled');
        $activeInputs.addClass('tempDisabled').prop('disabled', true);


        $gridView.find(".gridArea .active").removeClass("active");
        $grid.addClass("active");
        var name = $grid.data('name');
        var type = $grid.closest('.targetSection').data('type');
        var formatArg = $grid.data('formatarg');

        $('#targetName-edit').val(name);
        $('#targetTypeList-edit').find('.text').val(type);

        // $form.find('.placeholderRow').addClass('xc-hidden');
        $form.find('.formatSpecificRow').removeClass('active');
        $editForm.find('.formatSpecificRow').removeClass('active');
        if (type === "ODBC") {
            $('#connectionStr-edit').closest('.formatSpecificRow')
                               .addClass('active');
            $('#connectionStr-edit').val(formatArg);
        } else {
            $('#exportURL-edit').closest('.formatSpecificRow')
                           .addClass('active');
            $('#exportURL-edit').val(formatArg);
        }
        if (type === "UDF") {
            $editForm.find('.udfSelectorRow').addClass('active');
            $editForm.find('.udfModuleName').val($grid.data('module'));
            $editForm.find('.udfFuncName').val($grid.data('fnname'));
        }
    }

    function resetForm() {
        $('#exportFormReset').click();
    }

    function clearSelectedGrid() {
        $gridView.find(".selected").removeClass("selected");
    }

    function docTempMouseup() {
        clearSelectedGrid();
        $(document).off('mouseup', docTempMouseup);
    }

    function setupGridMenu() {
        $gridView.closest('.mainSection')[0].oncontextmenu = function(event) {
            var $target = $(event.target);
            var $grid = $target.closest(".grid-unit");
            var classes = "";
            clearSelectedGrid();

            if ($grid.length) {
                $grid.addClass("selected");
                $(document).on('mouseup', docTempMouseup);
                classes += " targetOpts";
            } else {
                classes += " bgOpts";
            }

            xcHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes,
                "floating": true
            });
            return false;
        };

        $gridMenu.on('mouseup', 'li', function(event) {
            if (event.which !== 1) {
                return;
            }
            var action = $(this).data('action');
            if (!action) {
                return;
            }
            switch (action) {
                case ('view'):
                    selectGrid($gridView.find(".selected"));
                    break;
                case ('delete'):
                    deleteTarget();
                    break;
                case ('create'):
                    showExportTargetForm();
                    break;
                case ('refresh'):
                    DSExport.refresh();
                    break;
                default:
                    console.warn('menu action not recognized: ' + action);
                    break;
            }
            clearSelectedGrid();
        });
    }

    function showExportTargetForm() {
        if ($exportTargetCard.hasClass('xc-hidden')) {
            $exportTargetCard.removeClass('xc-hidden');
            $exportTargetEditCard.addClass('xc-hidden');
            resetForm();
        } else {
            $('#targetName').focus();
        }
    }

    function deleteTarget() {
        var $activeIcon = $gridView.find('.target.selected');
        if ($activeIcon.length === 0) {
            $activeIcon = $gridView.find('.target.active');
        }

        var targetName = $activeIcon.data('name');
        var targetTypeText = $activeIcon.closest('.targetSection').data('type');

        var targetType;
        if (targetTypeText === UDFTStr.UDF) {
            targetType = ExTargetTypeT.ExTargetUDFType;
        } else if (targetTypeText === ExportTStr.LocalFS) {
            targetType = ExTargetTypeT.ExTargetSFType;
        }

        Alert.show({
            "title": DSExportTStr.DeleteExportTarget,
            "msgTemplate": xcHelper.replaceMsg(DSExportTStr.DeleteConfirmMsg,
                                {'target': targetName}),
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
                    if ($activeIcon.hasClass('active')) {
                        showExportTargetForm();
                    }
                    DSExport.refresh();
                }
            }
        });
    }

    function submitForm(targetType, name, formatSpecificArg, options) {
        var deferred = jQuery.Deferred();
        var $targetTypeInput = $('#targetTypeList').find('.text');
        var $formatSpecificInput = $form.find('.active .formatSpecificArg');
        var isValid = xcHelper.validate([
            {
                "$ele": $('#targetName'),
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
                    if (targetType === "ODBC") {
                        return false;
                    } else {
                        return (formatSpecificArg.trim() === "");
                    }
                }
            },
            {
                "$ele": $form.find('.udfModuleName'),
                "error": ErrTStr.NoEmptyList,
                "side": "top",
                "check": function() {
                    if (targetType === "UDF") {
                        return (options.module === "");
                    } else {
                        return false;
                    }
                }
            },
            {
                "$ele": $form.find('.udfFuncName'),
                "error": ErrTStr.NoEmptyList,
                "side": "top",
                "check": function() {
                    if (targetType === "UDF") {
                        return (options.fn === "");
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
            promise = XcalarAddUDFExportTarget(name, formatSpecificArg,
                                                udfName);
        } else {
            var error = {error: DSExportTStr.InvalidTypeMsg};
            Alert.error(DSExportTStr.InvalidType, error.error);
            deferred.reject(error);
            return deferred.promise();
        }

        promise
        .then(function() {
            addGridIcon(targetType, name, formatSpecificArg, options);
            deferred.resolve();
        })
        .fail(function(err) {
            Alert.error(DSExportTStr.ExportFail, err.error);
            deferred.reject(err);
        });

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
                $activeGrid.addClass('active');
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
            formatArg: formatSpecificArg,
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
        DSExport.__testOnly__.submitForm = submitForm;
        DSExport.__testOnly__.resetForm = resetForm;
        DSExport.__testOnly__.showExportTargetForm = showExportTargetForm;
    }
    /* End Of Unit Test Only */

    return (DSExport);

}(jQuery, {}));
