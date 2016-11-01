window.DFCard = (function($, DFCard) {
    var $dfView;       // $('#dataflowView');
    var $createScheduleView; // $('#newScheduleForm');
    var $scheduleDetailView; // $('#scheduleDetail');
    var $dfCard;       // $('#dfgViz');
    var $dfMenu;       // $('#dfgMenu').find('.dfgList');
    var $listSection;   // $dfMenu.find('.listSection');
    var $header;        // $dfCard.find('.cardHeader h2');
    var $retTabSection; // $dfCard.find('.retTabSection');
    var $retLists;      // $("#retLists");
    var canceledRuns = {};

    var retinaTrLen = 7;
    var retinaTr = '<div class="row unfilled">' +
                        '<div class="cell paramNameWrap">' +
                            '<div class="paramName textOverflowOneLine"></div>' +
                        '</div>' +
                        '<div class="cell paramValWrap">' +
                            '<div class="paramVal textOverflowOneLine"></div>' +
                        '</div>' +
                        '<div class="cell paramActionWrap">' +
                            '<i class="paramDelete icon xi-close fa-10 xc-action">' +
                            '</i>' +
                        '</div>' +
                   '</div>';

    var currentDataflow = null;

    DFCard.setup = function() {
        $dfView = $('#dataflowView');
        $createScheduleView = $('#newScheduleForm');
        $scheduleDetailView = $('#scheduleDetail');
        $dfCard = $('#dfgViz');
        $dfMenu = $('#dfgMenu').find('.dfgList');
        $listSection = $dfMenu.find('.listSection');
        $header = $dfCard.find('.cardHeader h2');
        $retTabSection = $dfCard.find('.retTabSection');
        $retLists = $("#retLists");

        addListeners();
        setupDagDropdown();
        setupRetinaTab();
        $createScheduleView.hide();
        $scheduleDetailView.hide();
    };

    DFCard.updateDF = function() {
        updateList();
    };

    DFCard.deleteDF = function(dfName) {
        $dfCard.find('.dagWrap[data-dataflowName="' + dfName + '"]').remove();
        updateList();
    };

    DFCard.drawDags = function() {
        drawAllDags();
        updateList();
    };

    DFCard.drawOneDag = function(dataflowName) {
        drawDags(dataflowName);
    };

    DFCard.getCurrentDF = function() {
        return (currentDataflow);
    };

    DFCard.updateRetinaTab = function(retName) {
        var html = "";
        for (var i = 0; i < retinaTrLen; i++) {
            html += retinaTr;
        }

        $retLists.html(html);

        var dfg = DF.getDataflow(retName);
        var paramMap = dfg.paramMap;

        dfg.parameters.forEach(function(paramName) {
            addParamToRetina(paramName, paramMap[paramName]);
        });

        $retTabSection.removeClass("hidden");
    };

    function addParamToRetina(name, val) {
        var $row = $retLists.find(".unfilled:first");

        if ($row.length === 0) {
            $row = $(retinaTr);
            $retLists.append($row);
            xcHelper.scrollToBottom($retLists.closest(".tableContainer"));
        }

        $row.find(".paramName").text(name);
        if (val != null) {
            $row.find(".paramVal").text(val);
        }

        $row.removeClass("unfilled");
    }

    function deleteParamFromRetina($row) {
        var $paramName = $row.find(".paramName");
        var paramName = $paramName.text();
        var dfg = DF.getDataflow(currentDataflow);

        if (dfg.checkParamInUse(paramName)) {
            StatusBox.show(ErrTStr.ParamInUse, $paramName);
            return;
        }

        $row.remove();
        if ($retLists.find(".row").length < retinaTrLen) {
            $retLists.append(retinaTr);
        }

        dfg.removeParameter(paramName);
    }

    function setupRetinaTab() {
        $dfView.on("mousedown", function(event) {
            var $target = $(event.target);
            if ($target.closest('#statusBox').length) {
                return;
            }
            $retTabSection.find(".retTab").removeClass("active");
            if ($target.closest(".advancedOpts").length === 0) {
                $dfCard.find(".advancedOpts.active").removeClass("active");
            }
        });
        // Remove focus when click other places other than retinaArea
        // add new retina
        $retTabSection.on('mousedown', '.retPopUp', function(event){
            event.stopPropagation();
        });

        // toggle open retina pop up
        $retTabSection.on('mousedown', '.retTab', function(event) {
            event.stopPropagation();
            var $tab = $(this);
            if ($tab.hasClass('active')) {
                // close it tab
                $tab.removeClass('active');
            } else {
                // open tab
                $tab.addClass('active');
            }
        });

        $retTabSection[0].oncontextmenu = function(e) {
            e.preventDefault();
        };

        $retTabSection.on('keyup', '.newParam', function(event){
            event.preventDefault();
            if (event.which !== keyCode.Enter) {
                return;
            }
            var $btn = $(this).siblings('.addParam');
            $btn.click();
        });

        // create new parameters to retina
        $retTabSection.on('click', '.addParam', function(event) {
            event.stopPropagation();
            var $btn = $(this);
            var $input = $btn.prev('.newParam');
            var paramName = $input.val().trim();

            var isValid = xcHelper.validate([
                {
                    "$ele": $input
                },
                {
                    "$ele" : $input,
                    "error": ErrTStr.NoSpecialCharOrSpace,
                    "check": function() {
                        return xcHelper.hasSpecialChar(paramName);
                    }
                }
            ]);

            if (!isValid) {
                return;
            }

            // Check name conflict
            var isNameConflict = false;
            $retLists.find(".row:not(.unfilled)").each(function(index, row) {
                var name = $(row).find(".paramName").html();
                if (paramName === name) {
                    isNameConflict = true;
                    return false; // exist loop
                }
            });

            if (isNameConflict) {
                var text = xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                    "name": paramName
                });
                StatusBox.show(text, $input);
                return;
            }

            DF.getDataflow(currentDataflow).addParameter(paramName);

            addParamToRetina(paramName);
            $input.val("");
        });

        // delete retina para
        $retTabSection.on("click", ".paramDelete", function(event) {
            event.stopPropagation();
            deleteParamFromRetina($(this).closest(".row"));
        });
    }

    function addListeners() {
        $listSection.on('click', '.dataFlowGroup', function(event, options) {
            options = options || {};
            var $dfg = $(this);
            var $dataflowLi = $dfg.find('.listBox');
            if ($dataflowLi.hasClass('selected')) {
                return;
            }

            var dataflowName = $dataflowLi.find('.groupName').text();
            currentDataflow = dataflowName;
            $header.text(dataflowName);
            $("#dataflowView .dagWrap").filter(function() {
                if ($(this).attr("data-dataflowName") === dataflowName) {
                    $(this).removeClass("xc-hidden");
                    // to scroll to the right side of graph
                    if ($(this).hasClass('untouched')) {
                        $(this).removeClass('untouched');
                        // can't use .width() if element is not visible
                        var width = $(this).find('canvas').attr('width');
                        $(this).find('.dagImageWrap').scrollLeft(width);
                    }
                    DFCard.updateRetinaTab(dataflowName);
                } else {
                    $(this).addClass("xc-hidden");
                }
            });
            enableDagTooltips();

            $listSection.find('.listBox').removeClass('selected');
            $dataflowLi.addClass('selected');

            if (gMinModeOn || options.show) {
                $listSection.find('.subList').hide();
                $dfg.find('.subList').show();
            } else {
                $listSection.find('.subList').slideUp(200);
                $dfg.find('.subList').slideDown(200);
            }

            Scheduler.hideNewScheduleFormView();
            Scheduler.hideScheduleDetailView();
        });

        $listSection.on('click', '.downloadDataflow', function() {
            var retName = $(this).siblings('.groupName').text();
            Support.downloadLRQ(retName);
            // XXX: Show something when the download has started
        });

        $listSection.on('click', '.deleteDataflow', function() {
            var retName = $(this).siblings('.groupName').text();
            Alert.show({
                'title'    : DFTStr.DelDF,
                'msg'      : DFTStr.DelDFMsg,
                'onConfirm': function() {
                    deleteDataflow(retName);
                }
            });
        });

        $listSection.on('click', '.addScheduleToDataflow', function() {
            var groupName = $(this).siblings('.groupName').text();
            Scheduler.setDataFlowName(groupName);
            if (DF.hasSchedule(groupName)) {
                Scheduler.showScheduleDetailView();
                Scheduler.hideNewScheduleFormView();
            } else {
                Scheduler.hideScheduleDetailView();
                Scheduler.showNewScheduleFormView();
            }
            $createScheduleView.show();
            $scheduleDetailView.show();
        });

        function deleteDataflow(retName) {
            DF.removeDataflow(retName)
            .then(function() {
                // Click on top most retina
                if ($(".listBox").eq(0)) {
                    $(".listBox").eq(0).click();
                } else {

                }
                xcHelper.showSuccess();
            })
            .fail(function() {
                xcHelper.showFail();
            });
        }

        $('#uploadDataflowButton').click(function() {
            UploadDataflowCard.show();
        });

        $dfCard.on("click", ".runNowBtn", function() {
            var $btn = $(this);
            var retName = $("#dfgMenu .listSection")
                                .find(".selected .groupName").text();
            if ($btn.hasClass('canceling') || canceledRuns[retName]) {
                return;
            }
            if ($btn.hasClass('running')) {
                cancelDF(retName, $btn);
            } else {
                $btn.addClass("running");
                xcTooltip.changeText($btn, DFTStr.Cancel);
                xcTooltip.refresh($btn);

                runDF(retName)
                .always(function() {
                    delete canceledRuns[retName];
                    $btn.removeClass("running canceling");
                    xcTooltip.changeText($btn, DFTStr.Run);
                });
            }
        });

        var optsSelector = ".advancedOpts > .text, .advancedOpts > .icon";
        $dfCard.on("click", optsSelector, function() {
            $(this).closest(".advancedOpts").toggleClass("active");
        });
    }

    function drawAllDags() {
        $dfCard.find(".cardMain").html("");
        var allDataflows = DF.getAllDataflows();

        for (var df in allDataflows) {
            try {
                drawDags(df);
            } catch (error) {
                // This is in case it's an illegal retina and backend returns us
                // garbage. Skip that retina and go print the next one.
                // TODO: Can print some error message here actually.
                console.error(error);
            }
        }
    }

    function drawDags(dataflowName) {
        var html =
        '<div class="dagWrap xc-hidden clearfix untouched" '+
            'data-dataflowName="' + dataflowName + '">' +
            '<div class="header clearfix">' +
                '<div class="btn btn-small infoIcon">' +
                    '<i class="icon xi-info-rectangle"></i>' +
                '</div>' +
                '<div class="tableTitleArea">' +
                    '<span>Dataflow: </span>' +
                    '<span class="tableName">' +
                        dataflowName +
                    '</span>' +
                '</div>' +
                '<button class="runNowBtn btn btn-small iconBtn" ' +
                'data-toggle="tooltip" data-container="body" ' +
                'data-placement="top" data-original-title="' +
                DFTStr.Run + '">' +
                    '<i class="icon xi-arrow-right"></i>' +
                    '<i class="icon xi-close"></i>' +
                    '<div class="spin"></div>' +
                '</button>' +
                '<div class="advancedOpts">' +
                    '<span class="text">' + DFTStr.AdvancedOpts + '</span>' +
                    '<i class="icon fa-10 xi-arrow-down xc-action"></i>' +
                    '<div class="optionBox radioButtonGroup">' +
                        '<div class="radioButton active"' +
                        ' data-option="default">' +
                            '<div class="radio">' +
                                '<i class="icon xi-radio-selected"></i>' +
                                '<i class="icon xi-radio-empty"></i>' +
                            '</div>' +
                            '<div class="label">' +
                                DFTStr.Default +
                            '</div>' +
                        '</div>' +
                        '<div class="radioButton" data-option="import">' +
                            '<div class="radio">' +
                                '<i class="icon xi-radio-selected"></i>' +
                                '<i class="icon xi-radio-empty"></i>' +
                            '</div>' +
                            '<div class="label">' +
                                DFTStr.Import +
                            '</div>' +
                            '<input type="text" spellcheck="false"' +
                            ' placeholder="' + DSTStr.TableName + '">' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        $dfCard.find('.cardMain').children('.hint').remove();
        $dfCard.find('.cardMain').append(html);

        var nodes = DF.getDataflow(dataflowName).retinaNodes;
        var $dagWrap = getDagWrap(dataflowName);
        Dag.createDagImage(nodes, $dagWrap);

        applyDeltaTagsToDag(dataflowName, $dagWrap);
        Dag.addDagEventListeners($dagWrap);
        xcHelper.optionButtonEvent($dfCard.find(".advancedOpts"));
    }

    function applyDeltaTagsToDag(dataflowName, $wrap) {
        // This function adds the different tags between a regular dag
        // and a retina dag. For example, it colors parameterized nodes.
        // It also adds extra classes to the dag that is needed for parameteri-
        // zation later.
        var $action = $wrap.find(".actionType.export");
        var $exportTable = $action.next(".dagTable");

        var i = 0;
        var retNodes = DF.getDataflow(dataflowName).retinaNodes;
        var paramValue = '';
        for (i = 0; i<retNodes.length; i++) {
            if (retNodes[i].dagNodeId === $action.attr("data-id")) {
                var specInput = retNodes[i].input.exportInput.meta
                                                             .specificInput;
                paramValue = specInput.sfInput.fileName ||
                             specInput.udfInput.fileName; // Only one of the
                             // 3 should have a non "" value
                             //xx specInput.odbcInput.tableName no longer exists
            }
        }
        $exportTable.addClass("export").data("type", "export")
                    .attr("data-table", $exportTable.attr("data-tablename"))
                    .data("paramValue", encodeURI(paramValue));

        $exportTable.find(".tableTitle").text(paramValue)
                    .attr("title", encodeURI(paramValue))
                    .attr("data-original-title", encodeURI(paramValue));

        // Data table moved so that the hasParam class is added correctly
        $wrap.find(".actionType.export").attr("data-table", "");

        // Add data-paramValue tags to all parameterizable nodes
        var $loadNodes = $wrap.find(".dagTable.dataStore");
        $loadNodes.each(function(idx, val) {
            var $val = $(val);
            $val.data("paramValue", $val.data("url"));
        });

        var $opNodes = $wrap.find(".actionType.dropdownBox");
        $opNodes.each(function(idx, val) {
            var $op = $(val);
            $op.data("paramValue", $op.attr("data-info"));
        });

        var selector = '.dagTable.export, .dagTable.dataStore, ' +
                       '.actionType.filter';
        // Attach styling to all nodes that have a dropdown
        $dfCard.find(selector).addClass("parameterizable");
    }

    function enableDagTooltips() {
        var $tooltipTables = $('#dfgViz').find('.dagTableIcon');
        xcTooltip.disable($tooltipTables);
        var selector = '.dataStoreIcon, ' +
                        '.export .dagTableIcon, .actionType.filter';
        xcTooltip.add($('#dfgViz').find(selector), {
            "title": CommonTxtTstr.ClickToOpts
        });
    }

    function setupDagDropdown() {
        var $dagArea = $dfCard;
        var $currentIcon;
        var $menu = $dagArea.find('.dagDropDown');

        $dagArea[0].oncontextmenu = function(e) {
            var $target = $(e.target).closest('.actionType');
            if ($(e.target).closest('.dagTable.dataStore').length) {
                $target = $(e.target).closest('.dagTable.dataStore');
            } else if ($(e.target).closest('.dagTable.export').length) {
                $target = $(e.target).closest('.dagTable.export');
            }
            if ($target.length) {
                $target.trigger('click');
                e.preventDefault();
                e.stopPropagation();
            }
        };

        var selector = '.dagTable.export, .dagTable.dataStore, .actionType';

        // Attach styling to all nodes that have a dropdown
        $(selector).addClass("parameterizable");

        $dagArea.on('click', selector, function() {
            $('.menu').hide();
            removeMenuKeyboardNavigation();
            $('.leftColMenu').removeClass('leftColMenu');
            $currentIcon = $(this);

            if ($currentIcon.hasClass('actionType')) {
                if (!$currentIcon.find('.dagIcon').hasClass('filter')) {
                    return;
                }
            }

            var el = $(this);
            //position colMenu
            var top = el[0].getBoundingClientRect().bottom;
            var left = el[0].getBoundingClientRect().left;

            $menu.css({'top': top, 'left': left});
            $menu.show();

            //positioning if dropdown menu is on the right side of screen
            if ($menu[0].getBoundingClientRect().right >
                $(window).width() - 5) {
                left = $(window).width() - $menu.width() - 7;
                $menu.css('left', left).addClass('leftColMenu');
            } else if ($menu[0].getBoundingClientRect().left <
                        MainMenu.getOffset()) {
                // if on the left side of the screen
                $menu.css('left', MainMenu.getOffset() + 5);
            }
            addMenuKeyboardNavigation($menu);

            // If node is not export, hide showExportCols option
            if (!$(this).hasClass("export")) {
                $menu.find(".showExportCols").hide();
            } else {
                $menu.find(".showExportCols").show();
            }
        });

        addMenuBehaviors($menu);

        $menu.find('.createParamQuery').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DFParamModal.show($currentIcon);
        });

        $menu.find('.showExportCols').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            showExportCols($currentIcon);
        });
    }

    function showExportCols($dagTable) {
        var df = DF.getDataflow(DFCard.getCurrentDF());
        var $popup = $('#exportColPopup');
        var tableName = $dagTable.data('table') || $dagTable.data('tablename');
        var cols = df.columns;
        var numCols = cols.length;

        $popup.find('.tableName').text(tableName);
        $popup.find('.numCols').attr('title', CommonTxtTstr.NumCol)
                                   .text('[' + numCols + ']');

        var html = '';

        for (var i = 0; i < numCols; i++) {
            var name = cols[i].backCol;
            html += '<li>' +
                        '<div title="' + name + '" class="name">' +
                            name + '</div>' +
                    '</li>';
        }
        if (numCols === 0) {
            html += '<span class="noFields">No fields present</span>';
        }

        $popup.find('ul').html(html);
        $popup.show();

        var width = $popup.outerWidth();
        // var height = $popup.outerHeight();
        // var dagPanelLeft = $('#dagPanelContainer').offset().left;

        var top = $dagTable[0].getBoundingClientRect().bottom - 100;
        var left = $dagTable[0].getBoundingClientRect().left - width - 20;

        $popup.css({'top': top, 'left': left});

        //positioning if menu is on the right side of screen
        if ($popup[0].getBoundingClientRect().right >
            $(window).width() - 5) {
            left = $(window).width() - $popup.width() - 7;
            $popup.css('left', left);
        } else if ($popup[0].getBoundingClientRect().left <
                    MainMenu.getOffset()) {
            // if on the left side of the screen
            $popup.css('left', MainMenu.getOffset() + 5);
        }

        var menuBottom = $popup[0].getBoundingClientRect().bottom;
        if (menuBottom > $(window).height()) {
            $popup.css('top', '-=' + ((menuBottom - $(window).height()) + 5));
        }

        $('.tooltip').hide();

        $(document).on('mousedown.hideExportColPopup', function(event) {
            if ($(event.target).closest('#exportColPopup').length === 0) {
                hideExportColPopup();
            }
        });
    }

    function hideExportColPopup() {
        $('#exportColPopup').hide();
        $(document).off('.hideExportColPopup');
    }

    function updateList() {
        // XXX Do we really need to redo this everything or can we just
        // apply the delta?

        var dataflows = DF.getAllDataflows();
        var $activeGroup = $dfMenu.find('.listBox.selected');
        var activeGroupName;

        if ($activeGroup.length) {
            activeGroupName = $activeGroup.find('.groupName').text();
        }
        var html = "";
        var numGroups = 0;
        for (var dataflow in dataflows) {
            numGroups++;
            html += '<div class="dataFlowGroup listWrap">' +
                      '<div class="listBox listInfo">' +
                        '<div class="iconWrap">' +
                          '<i class="icon xi-dataflowgroup"></i>' +
                        '</div>' +
                        '<span class="groupName">' + dataflow + '</span>' +
                        '<i class="icon xi-trash deleteDataflow" ' +
                            'title="Delete dataflow" data-toggle="tooltip" ' +
                            'data-placement="top" data-container="body">' +
                        '</i>' +
                        '<i class="icon xi-download downloadDataflow" ' +
                            'title="Download dataflow" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body">' +
                        '</i>' +
                        '<i class="icon xi-menu-scheduler addScheduleToDataflow" ' +
                            'title="Add Schedule to dataflow" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body">' +
                        '</i>' +
                      '</div>' +
                    '</div>';
        }

        $dfMenu.find('.listSection').html(html);
        $dfMenu.find('.numGroups').text(numGroups);

        if (numGroups === 0) {
            var hint = '<div class="hint no-selection">' +
                        '<i class="icon xi-warning"></i>' +
                        '<div class="text">' +
                            DFTStr.NoDF1 + '.' +
                            '<br>' +
                            DFTStr.NoDF2 + '.' +
                        '</div>' +
                       '</div>';
            $dfCard.find('.cardMain').html(hint);
            $dfCard.find('.leftSection .title').text("");
        } else {
            if (activeGroupName) {
                $dfMenu.find('.listBox').filter(function() {
                    return ($(this).find('.groupName').text() === activeGroupName);
                }).closest('.listBox').trigger('click', {show: true});
            } else {
                $dfMenu.find('.listBox').eq(0).trigger('click', {show: true});
            }
        }
    }

    function runDF(retName) {
        var deferred = jQuery.Deferred();

        var paramsArray = [];
        var dfObj = DF.getDataflow(retName);
        var parameters = dfObj.paramMap;
        for (var param in parameters) {
            var p = new XcalarApiParameterT();
            p.parameterName = param;
            p.parameterValue = parameters[param];
            paramsArray.push(p);
        }

        var dagNode = dfObj.retinaNodes[0];
        var exportInfo = dagNode.input.exportInput;
        var targetName = exportInfo.meta.target.name;
        var fileName = parseFileName(exportInfo, paramsArray);
        var advancedOpts = getAdvancetExportOption(retName);
        if (advancedOpts == null) {
            // error case
            return PromiseHelper.reject();
        }

        checkBeforeRunDFG(advancedOpts.activeSession)
        .then(function() {
            return XcalarExecuteRetina(retName, paramsArray, advancedOpts);
        })
        .then(function() {
            if (advancedOpts.activeSession) {
                return projectAfterRunDFG(advancedOpts.newTableName, exportInfo);
            }
        })
        .then(function(finalTable) {
            var msg = DFTStr.RunDoneMsg;
            if (advancedOpts.activeSession) {
                msg += "\n" + xcHelper.replaceMsg(DFTStr.FindTable, {
                    "table": finalTable
                });
            }

            /// XXX TODO: add sql
            Alert.show({
                "title"  : DFTStr.RunDone,
                "msg"    : msg,
                "isAlert": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            // do not show alert if op was canceled and
            // has cancel error msg
            if (typeof error === "object" &&
                error.status === StatusT.StatusCanceled &&
                canceledRuns[retName]) {
                Alert.show({
                    "title"  : StatusMessageTStr.CancelSuccess,
                    "msg"    : DFTStr.CancelSuccessMsg,
                    "isAlert": true
                });
            } else {
                Alert.error(DFTStr.RunFail, error);
            }

            deferred.reject(error);
        });

        return deferred.promise();

        function checkBeforeRunDFG(noExportCheck) {
            if (noExportCheck) {
                // already verified
                return PromiseHelper.resolve();
            } else {
                return checkExistingFileName(fileName, targetName);
            }
        }
    }

    function cancelDF(retName, $btn) {
        var deferred = jQuery.Deferred();

        $btn.addClass('canceling');
        xcTooltip.changeText($btn, StatusMessageTStr.Canceling);
        xcTooltip.refresh($btn);
        canceledRuns[retName] = true;

        XcalarQueryCancel(retName)
        .then(function() {
            deferred.resolve(arguments);
        })
        .fail(function(error) {
            delete canceledRuns[retName];
            if ($btn.hasClass('running')) {
                xcTooltip.changeText($btn, DFTStr.Cancel);
            }
            $btn.removeClass('canceling');
            Alert.error(StatusMessageTStr.CancelFail, error);
            deferred.reject(arguments);
        });

        return deferred.promise();
    }

    function getDagWrap(dataflowName) {
        return $("#dataflowPanel").find(".dagWrap[data-dataflowName=" +
                                        dataflowName + "]");
    }

    function parseFileName(exportInfo, paramArray) {
        var fileName = exportInfo.meta.specificInput.sfInput.fileName;
        if (paramArray.length === 0 || fileName.indexOf("<") === -1) {
            return fileName;
        }

        for (var i = 0; i < paramArray.length; i++) {
            var re = new RegExp( "<" + paramArray[i].parameterName + ">", "g");
            fileName = fileName.replace(re, paramArray[i].parameterValue);
        }

        return fileName;
    }

    function getAdvancetExportOption(dataflowName) {
        var activeSession = false;
        var newTableName = "";

        var $dagWrap = getDagWrap(dataflowName);
        var $advancedOpts = $dagWrap.find(".advancedOpts");
        var $radioButton = $advancedOpts.find(".radioButton.active");

        if ($radioButton.data("option") === "import") {
            var $input = $radioButton.find("input");
            activeSession = true;
            newTableName = $input.val().trim();

            var isValid = checkExistingTableName($input);
            if (!isValid) {
                return null;
            }
        }

        if (newTableName) {
            newTableName += Authentication.getHashId();
        }

        return {
            "activeSession": activeSession,
            "newTableName" : newTableName
        };
    }

    function projectAfterRunDFG(tableName, exportInfo) {
        var deferred = jQuery.Deferred();
        var txId = Transaction.start({
            "operation": "Run DF",
        });
        var worksheet = WSManager.getActiveWS();
        var metaCols = [];
        if (exportInfo.meta && exportInfo.meta.columns) {
            metaCols = exportInfo.meta.columns;
        }
        var colNames = metaCols.map(function(colInfo) {
            var colName = colInfo.name;
            var parsedInfo = xcHelper.parsePrefixColName(colName);
            var prefix = parsedInfo.prefix;
            if (prefix) {
                colName = prefix + "--" + parsedInfo.name;
            }
            return colName;
        });

        var dstTableName = xcHelper.getTableName(tableName) +
                        Authentication.getHashId();

        XcalarProject(colNames, tableName, dstTableName, txId)
        .then(function() {
            var tableCols = getProgCols(colNames);
            return TblManager.refreshTable([dstTableName], tableCols,
                                           [], worksheet, txId);
        })
        .then(function() {
            return deleteHelper();
        })
        .then(function() {
            Transaction.done(txId, {
                "noSql": true
            });
            deferred.resolve(dstTableName);
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "error"  : error,
                "noAlert": true
            });
            deferred.reject(error);
        });

        return deferred.promise();

        function deleteHelper() {
            var innerDeferred = jQuery.Deferred();
            XcalarDeleteTable(tableName, txId)
            .always(function() {
                innerDeferred.resolve();
            });
            return innerDeferred.promise();
        }
    }

    function getProgCols(colNames) {
        var progCols = colNames.map(function(colName) {
            return ColManager.newPullCol(colName);
        });

        progCols.push(ColManager.newDATACol());
        return progCols;
    }

    function checkExistingTableName($input) {
        var isValid = xcHelper.tableNameInputChecker($input, {
            "onErr": function() {
                $input.closest(".advancedOpts").addClass("active");
            }
        });
        return isValid;
    }

    // returns promise with boolean True if duplicate found
    function checkExistingFileName(fileName, targetName) {
        var deferred = jQuery.Deferred();
        var extensionDotIndex = fileName.lastIndexOf(".");
        if (extensionDotIndex > 0) {
            fileName = fileName.slice(0, extensionDotIndex);
        }

        XcalarListExportTargets(ExTargetTypeTStr[1], targetName)
        .then(function(ret) {
            if (ret.numTargets === 1) {
                var url = ret.targets[0].specificInput.sfInput.url;
                XcalarListFiles(FileProtocol.nfs + url, false)
                .then(function(result) {
                    for (var i = 0; i < result.numFiles; i++) {
                        if (result.files[i].name === fileName) {
                            deferred.reject(DFTStr.ExportFileExists);
                            return;
                        }
                    }
                    deferred.resolve();
                })
                .fail(function() {
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    return (DFCard);

}(jQuery, {}));
