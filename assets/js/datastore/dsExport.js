window.DSExport = (function($, DSExport) {
    var exportTargets = [];
    var $gridView;  // $("#dsExportListSection .gridItems");
    var $form;
    var $udfModuleList;
    var $udfFuncList;
    var $targetTypeList;
    var $targetTypeInput;
    var $exportTargetCard;

    DSExport.setup = function() {
        $gridView = $("#dsExportListSection .gridItems");
        $form = $('#exportDataForm');
        $udfModuleList = $form.find('.udfModuleListWrap');
        $udfFuncList = $form.find('.udfFuncListWrap');
        $exportTargetCard = $('#exportTargetCard');

        $targetTypeList = $('#targetTypeList');
        $targetTypeInput = $targetTypeList.find('.text');

        setupDropdowns();

        $("#dsExport-refresh").click(function() {
            DSExport.refresh();
        });

        $('#createExportButton').click(function() {
            if ($exportTargetCard.hasClass('gridInfoMode')) {
                $exportTargetCard.removeClass('gridInfoMode');
                resetForm();
            } else {
                $('#targetName').focus();
            }
        });

        $gridView.on("click", ".grid-unit", function() {
            // event.stopPropagation(); // stop event bubbling
            var $grid = $(this);
            selectGrid($grid);
        });

        $form.submit(function(event) {
            event.preventDefault();
            if ($exportTargetCard.hasClass('gridInfoMode')) {
                return;
            }
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
                xcHelper.showSuccess();
                resetForm();
                KVStore.commit();
            })
            .fail(function(error) {
                // XX fail case being handled in submitForm
            })
            .always(function() {
                xcHelper.enableSubmit($submitBtn);
                $form.find('.formRow').removeClass('disabled');
            });
        });

        $('#exportFormReset').click(function(e) {
            if ($exportTargetCard.hasClass('gridInfoMode')) {
                e.preventDefault();
                return;
            }
            $form.find('.formatSpecificRow').removeClass('active');
            $form.find('.placeholderRow').removeClass('xc-hidden');
            $targetTypeInput.data('value', "");
            xcHelper.reenableTooltip($udfFuncList.parent());
            $udfFuncList.addClass("disabled");
            $exportTargetCard.removeClass('gridInfoMode');
            $gridView.find(".gridArea .active").removeClass("active");
            // var $inputs = $exportTargetCard.find('input:enabled');
            $exportTargetCard.find('.tempDisabled').removeClass('tempDisabled')
                             .prop('disabled', false);
            $('#targetName').focus();
        });

        $("#dsExportListSection").on("click", ".targetInfo", function() {
            $(this).closest(".xc-expand-list").toggleClass("active");
        });


        // xxx TEMPORARILY DISABLE THE ENTIRE FORM
        // $form.find('input, button').prop('disabled', true)
        //                            .css({'cursor': 'not-allowed'});
        // $form.find('button').css('pointer-events', 'none')
        //                     .addClass('btn-cancel');
        // $form.find('.iconWrapper').css('background', '#AEAEAE');
        // $('#targetTypeList').css('pointer-events', 'none');
    };

    DSExport.refresh = function(noWaitIcon) {
        if (!noWaitIcon) {
            xcHelper.showRefreshIcon($('#dsExportListSection'));
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
                var type = ExTargetTypeTStr[targets[i].hdr.type];
                var options = {};
                if (type === "file") {
                    type = "Local Filesystem";
                    formatArg = targets[i].specificInput.sfInput.url;
                } else if (type === "odbc") {
                    type = "ODBC";
                    formatArg = targets[i].specificInput.odbcInput
                                                        .connectionString;
                } else if (type === "udf") {
                    type = "UDF";
                    formatArg = targets[i].specificInput.udfInput.url;
                    var udfName = targets[i].specificInput.udfInput.udfName;
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
                    name     : targets[i].hdr.name,
                    formatArg: formatArg,
                    options  : options
                };
                exportTargets[typeIndex].targets.push(target);
                // Here we can make use of targets[i].specificInput.(odbcInput|
                // sfInput).(connectionString|url) to display more information
                // For eg for sfInput, we can now get back the exact location.
                // We no longer require the users to memorize where default
                // points to
            }
            restoreGrids();
        })
        .fail(function(error) {
            Alert.error(DSExportTStr.RestoreFail, error.error);
        });
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
                xcHelper.temporarilyDisableTooltip($udfFuncList.parent());
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
            "bounds"       : "#datastorePanel > .mainContent",
            "bottomPadding": 5
        }).setupListeners();

        new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                $udfFuncList.find('.udfFuncName').val(func);
                StatusBox.forceHide();
            },
            "bounds"       : "#datastorePanel > .mainContent",
            "bottomPadding": 5
        }).setupListeners();
    }

    function selectGrid($grid) {
        if ($grid.hasClass('active')) {
            return;
        }
        $exportTargetCard.addClass('gridInfoMode');
        var $activeInputs = $exportTargetCard.find('input:enabled');
        $activeInputs.addClass('tempDisabled').prop('disabled', true);


        $gridView.find(".gridArea .active").removeClass("active");
        $grid.addClass("active");
        var name = $grid.data('name');
        var type = $grid.closest('.targetSection').data('type');
        var formatArg = $grid.data('formatarg');

        $('#targetName').val(name);
        $targetTypeInput.val(type);

        $form.find('.placeholderRow').addClass('xc-hidden');
        $form.find('.formatSpecificRow').removeClass('active');
        if (type === "ODBC") {
            $('#connectionStr').closest('.formatSpecificRow')
                               .addClass('active');
            $('#connectionStr').val(formatArg);
        } else {
            $('#exportURL').closest('.formatSpecificRow')
                           .addClass('active');
            $('#exportURL').val(formatArg);
        }
        if (type === "UDF") {
            $form.find('.udfSelectorRow').addClass('active');
            $form.find('.udfModuleName').val($grid.data('module'));
            $form.find('.udfFuncName').val($grid.data('fn'));
        }
    }

    function resetForm() {
        $('#exportFormReset').click();
    }

    function submitForm(targetType, name, formatSpecificArg, options) {
        var deferred = jQuery.Deferred();
        var $targetTypeInput = $('#targetTypeList').find('.text');
        var $formatSpecificInput = $form.find('.active .formatSpecificArg');
        var isValid = xcHelper.validate([
            {
                "$selector": $('#targetName'),
                "text"     : ErrTStr.NoEmpty,
                "side"     : "top",
                "check"    : function() {
                    return (name === "");
                }
            },
            {
                "$selector": $targetTypeInput,
                "text"     : ErrTStr.NoEmptyList,
                "side"     : "top",
                "check"    : function() {
                    return (targetType === "");
                }
            },
            {
                "$selector": $formatSpecificInput,
                "text"     : ErrTStr.NoEmpty,
                "side"     : "top",
                "check"    : function() {
                    if (targetType === "ODBC") {
                        return false;
                    } else {
                        return (formatSpecificArg.trim() === "");
                    }
                }
            },
            {
                "$selector": $form.find('.udfModuleName'),
                "text"     : ErrTStr.NoEmptyList,
                "side"     : "top",
                "check"    : function() {
                    if (targetType === "UDF") {
                        return (options.module === "");
                    } else {
                        return false;
                    }
                }
            },
            {
                "$selector": $form.find('.udfFuncName'),
                "text"     : ErrTStr.NoEmptyList,
                "side"     : "top",
                "check"    : function() {
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

    function restoreGrids() {
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
        updateNumGrids();
    }

    function getGridHtml(target) {
        var name = target.name;
        var formatArg = target.formatArg;
        // var options = target.options;
        var extraDataAttr = "";
        if (target.options.module && target.options.fn) {
            extraDataAttr = 'data-module="' + target.options.module + '" ' +
                            'data-fn="' + target.options.fn + '"';
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
            name     : name,
            formatArg: formatSpecificArg,
            options  : options
        };
 
        var $grid = $(getGridHtml(target));
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
                            '<span class="text">' + name + '</span>' +
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
    }

    function updateNumGrids() {
        var numGrids = $gridView.find(".grid-unit").length;
        $(".numExportTargets").html(numGrids);
    }

    return (DSExport);

}(jQuery, {}));
