window.DSExport = (function($, DSExport) {
    var exportTargets = [];
    var $gridView;  // $("#dsExportListSection .gridItems");
    var $form;
    var $udfModuleList;
    var $udfFuncList;

    DSExport.setup = function() {
        $gridView = $("#dsExportListSection .gridItems");
        $form = $('#exportDataForm');
        $udfModuleList = $form.find('.udfModuleListWrap');
        $udfFuncList = $form.find('.udfFuncListWrap');

        var $targetTypeList = $('#targetTypeList');
        var $targetTypeInput = $targetTypeList.find('.text');

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
            "bounds"   : "#datastorePanel > .mainContent",
            "bottomPadding": 5
        }).setupListeners();

        new MenuHelper($udfFuncList, {
            "onSelect": function($li) {
                var func = $li.text();
                $udfFuncList.find('.udfFuncName').val(func);
                StatusBox.forceHide();
            },
            "bounds"   : "#datastorePanel > .mainContent",
            "bottomPadding": 5
        }).setupListeners();

        $("#dsExport-refresh").click(function() {
            DSExport.refresh();
        });

        $gridView.on("click", ".grid-unit", function(event) {
            event.stopPropagation(); // stop event bubbling
            var $grid = $(this);

            $gridView.find(".gridArea .active").removeClass("active");
            $grid.addClass("active");
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

        $('#exportFormReset').click(function() {
            $form.find('.formatSpecificRow').removeClass('active');
            $form.find('.placeholderRow').removeClass('xc-hidden');
            $targetTypeInput.data('value', "");
            xcHelper.reenableTooltip($udfFuncList.parent());
            $udfFuncList.addClass("disabled");
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
            exportTargets = [];
    
            for (var i = 0; i < numTargs; i++) {
                var type = ExTargetTypeTStr[targets[i].hdr.type];
               
                if (type === "file") {
                    type = "Local Filesystem";
                } else if (type === "odbc") {
                    type = "ODBC";
                } else if (type === "udf") {
                    type = "UDF";
                }
                var typeIndex = types.indexOf(type);
                if (typeIndex === -1) {
                    types.push(type);
                    typeIndex = types.length - 1;
                    exportTargets.push({name: type, targets: []});
                }
                exportTargets[typeIndex].targets.push(targets[i].hdr.name);
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
            promise = XcalarAddUDFExportTarget(name, formatSpecificArg);
        } else {
            var error = {error: DSExportTStr.InvalidTypeMsg};
            Alert.error(DSExportTStr.InvalidType, error.error);
            deferred.reject(error);
            return deferred.promise();
        }

        promise
        .then(function() {
            addGridIcon(targetType, name);
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

        for (var i = 0; i < numTypes; i++) {
            var name = exportTargets[i].name;
            var targetTypeId = name.replace(/\s/g, '');
            html += '<div id="gridTarget-' + targetTypeId + '"' +
                        ' class="targetSection xc-expand-list clearfix ' +
                        'active">' +
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

    function getGridHtml(name) {
        var html = '<div class="target grid-unit">' +
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

    function addGridIcon(targetType, name) {
        var $grid = $(getGridHtml(name));
        var targetTypeId = targetType.replace(/\s/g, '');
        // $grid.append('<div class="waitingIcon"></div>');
        if ($('#gridTarget-' + targetTypeId).length === 0) {

            var gridSectionHtml = '<div class="gridIconSection clearfix"' +
                                      'id="gridTarget-' + targetTypeId + '">';

            if ($gridView.children().length > 0) {
                gridSectionHtml += '<div class="divider clearfix"></div>';
            }

            gridSectionHtml += '<div class="title">' + targetType +
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
        exportTargets[groupIndex].targets.push(name);

        updateNumGrids();
    }

    function updateNumGrids() {
        var numGrids = $gridView.find(".grid-unit").length;
        $(".numExportTargets").html(numGrids);
    }

    return (DSExport);

}(jQuery, {}));
