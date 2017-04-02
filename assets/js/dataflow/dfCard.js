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
    var xdpMode = XcalarMode.Mod;
    var retinaCheckInterval = 2000;
    var retinasInProgress = {};

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
    var dagStateClasses = "";

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

        // used to remove all status classes from dag table icons
        for (var i in DgDagStateTStr) {
            dagStateClasses += DgDagStateTStr[i] + " ";
        }
        dagStateClasses = dagStateClasses.trim();
    };

    DFCard.initialize = function() {
        xdpMode = XVM.getLicenseMode();

        addListeners();
        setupDagDropdown();
        setupRetinaTab();
        $createScheduleView.hide();
        $scheduleDetailView.hide();
    };

    DFCard.addDFToList = function(dataflowName) {
        // var dataflows = DF.getAllDataflows();
        var html = getDFListItemHtml(dataflowName);

        $dfMenu.find('.listSection').append(html);
        var numDfs = DF.getNumDataflows()
        $dfMenu.find('.numGroups').text(numDfs);
        if (numDfs === 1) {
            DFCard.focusFirstDF();
        }
    };

    DFCard.refreshDFList = function() {
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
            html += getDFListItemHtml(dataflow);
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
            // must find it again because we refreshed the list
            var activeFound = false;
            if (activeGroupName) {
                var $df = $dfMenu.find('.listBox').filter(function() {
                    return ($(this).find('.groupName').text() ===
                            activeGroupName);
                }).closest('.listBox');

                if ($df.length) {
                    activeFound = true;
                    $df.trigger('click');
                }
            }
            if (!activeFound) {
                DFCard.focusFirstDF();
            }
        }
    };

    DFCard.deleteDF = function(dfName) {
        $dfCard.find('.dagWrap[data-dataflowName="' + dfName + '"]').remove();
        $dfMenu.find('.listWrap').filter(function() {
            return ($(this).find('.groupName').text() === dfName);
        }).remove();
        // var dataflows = DF.getAllDataflows();
        $dfMenu.find('.numGroups').text(DF.getNumDataflows());
        DFCard.refreshDFList();
        DFCard.focusFirstDF();
    };

    DFCard.getCurrentDF = function() {
        return (currentDataflow);
    };

    DFCard.clearDFImages = function() {
        $dfCard.find('.cardMain').empty();
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
            if (!systemParams.hasOwnProperty(paramName)) {
                addParamToRetina(paramName, paramMap[paramName]);
            }
        });

        $retTabSection.removeClass("hidden");
    };

    DFCard.focusFirstDF = function() {
        $dfMenu.find('.listBox').eq(0).trigger('click');
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
        $(".tabWrap").addClass(xdpMode);

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
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }
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
                    "$ele": $input,
                    "error": ErrTStr.NoSpecialCharOrSpace,
                    "check": function() {
                        return !xcHelper.checkNamePattern("param", "check",
                            paramName);
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
                    return false; // exit loop
                }
            });

            if (isNameConflict) {
                var text = xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                    "name": paramName
                });
                StatusBox.show(text, $input);
                return;
            }

            var isSystemParam = false;
            if (systemParams.hasOwnProperty(paramName)) {
                isSystemParam = true;
            }
            if (isSystemParam) {
                var text = xcHelper.replaceMsg(ErrWRepTStr.SystemParamConflict, {
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
        $dfMenu.on('click', '.refreshBtn', function() {
            var $section = $("#dfgMenu .dfgList");
            $section.addClass("disabled");
            xcHelper.showRefreshIcon($section);

            KVStore.getEmataInfo()
            .then(function(eMeta) {
                var ephMetaInfos;
                try {
                    ephMetaInfos = new EMetaConstructor(eMeta);
                } catch (error) {
                    return;
                }
                if (ephMetaInfos) {
                    DF.restore(ephMetaInfos.getDFMeta())
                    .then(function() {
                        DF.initialize();
                    });
                }
            })
            .always(function() {
                $section.removeClass("disabled");
            });
        });

        $listSection.on('click', '.dataFlowGroup', function() {
            var $dfg = $(this);
            var $dataflowLi = $dfg.find('.listBox');
            if ($dataflowLi.hasClass('selected')) {
                return;
            }

            var dataflowName = $dataflowLi.find('.groupName').text();
            currentDataflow = dataflowName;
            $header.text(dataflowName);

            $("#dataflowView .dagWrap").addClass('xc-hidden');

            var $dagWrap = getDagWrap(dataflowName);
            if (!$dagWrap.length) {
                // first time creating image
                drawDF(dataflowName);
                $dagWrap = getDagWrap(dataflowName);
                $dagWrap.removeClass("xc-hidden");
                var width = $dagWrap.find('canvas').attr('width');
                $dagWrap.find('.dagImageWrap').scrollLeft(width);
                if (XVM.getLicenseMode() === XcalarMode.Demo) {
                    var $name = $dagWrap.find(".dagTable.export .exportTableName");
                    var exportName = xcHelper.getTableName($name.text());
                    var $option = $dagWrap.find(".advancedOpts [data-option='import']");
                    $option.click();
                    $option.find("input").val(exportName);
                    $name.text(exportName);
                    xcTooltip.changeText($name, exportName);
                }
            } else {
                $dagWrap.removeClass("xc-hidden");
            }

            DFCard.updateRetinaTab(dataflowName);

            enableDagTooltips();

            $listSection.find('.listBox').removeClass('selected');
            $dataflowLi.addClass('selected');

            // If it already has a schedule, show schedule
            Scheduler.setDataFlowName(dataflowName);
            if (DF.hasSchedule(dataflowName)) {
                Scheduler.showScheduleDetailView();
            } else {
                Scheduler.hideScheduleDetailView();
            }
            $scheduleDetailView.show();
        });

        $listSection.on('click', '.downloadDataflow', function() {
            var retName = $(this).siblings('.groupName').text();
            Support.downloadLRQ(retName);
            // XXX: Show something when the download has started
        });

        $listSection.on('click', '.deleteDataflow', function() {
            var retName = $(this).siblings('.groupName').text();
            Alert.show({
                'title': DFTStr.DelDF,
                'msg': DFTStr.DelDFMsg,
                'onConfirm': function() {
                    deleteDataflow(retName);
                    Scheduler.hideScheduleDetailView();
                }
            });
        });

        $listSection.on('click', '.addScheduleToDataflow', function() {
            // doesn't have schedule, show schedule
            var groupName = $(this).siblings('.groupName').text();
            Scheduler.setDataFlowName(groupName);
            Scheduler.showScheduleDetailView();
            $scheduleDetailView.show();
        });

        $('#uploadDataflowButton').click(function() {
            UploadDataflowCard.show();
            $dfView.scrollTop(0);
        });

        $dfCard.on("click", ".runNowBtn", function() {
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }
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
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }
            $(this).closest(".advancedOpts").toggleClass("active");
        });

        $dfCard.on("keydown", ".advancedOpts input", function(event) {
            if (event.which === keyCode.Enter) {
                $(this).closest(".advancedOpts").removeClass("active");
            }
        });

        $dfCard.on("input", ".advancedOpts input", function() {
            var $name = $(this).closest(".dagWrap")
                              .find(".dagTable.export .exportTableName");
            $name.html($(this).val());
            xcTooltip.changeText($name, $(this).val());
        });

        $dfCard.on("focus", ".advancedOpts input", function() {
            $(this).closest(".advancedOpts").find('[data-option="import"]')
                   .click();
            var $name = $(this).closest(".dagWrap")
                              .find(".dagTable.export .exportTableName");
            $name.html($(this).val());
            xcTooltip.changeText($name, $(this).val());
        });
    }

    function deleteDataflow(retName) {
        var deferred = jQuery.Deferred();
        DF.removeDataflow(retName)
        .then(function() {
            xcHelper.showSuccess(SuccessTStr.RmDF);
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.showFail();
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function drawDF(dataflowName) {
        var html =
        '<div class="dagWrap clearfix" '+
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
                '<button class="runNowBtn btn btn-small iconBtn ' + xdpMode + '" ' +
                'data-toggle="tooltip" data-container="body" ' +
                'data-placement="top" data-original-title="' +
                DFTStr.Run + '">' +
                    '<i class="icon xi-arrow-right"></i>' +
                    '<i class="icon xi-close"></i>' +
                    '<div class="spin"></div>' +
                '</button>' +
                '<div class="advancedOpts ' + xdpMode + '">' +
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

        if (XVM.getLicenseMode() === XcalarMode.Demo) {
            xcHelper.disableMenuItem($dfCard
                                 .find(".advancedOpts [data-option='default']"),
                                          {"title": TooltipTStr.NotInDemoMode});
        }

        var nodes = DF.getDataflow(dataflowName).retinaNodes;
        var $dagWrap = getDagWrap(dataflowName);
        Dag.createDagImage(nodes, $dagWrap);

        applyDeltaTagsToDag(dataflowName, $dagWrap);
        Dag.addDagEventListeners($dagWrap);
        xcHelper.optionButtonEvent($dfCard.find(".advancedOpts"),
            function(selOption, $selRadioButton) {
                var $dagNode = getDagWrap(dataflowName)
                               .find(".actionType.export").next(".dagTable");
                $dagNode.attr("data-advancedopts", selOption);
                if (selOption === "import") {
                    $(".advancedOpts input").focus();
                    $dagNode.removeClass("parameterizable");
                } else {
                    $dagNode.addClass("parameterizable");
                    setTimeout(function() {
                        $selRadioButton.closest(".advancedOpts")
                                       .toggleClass("active");
                    }, 200);
                }
            }
        );
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            $dagWrap.find('.parameterizable:not(.export)')
                    .addClass('noDropdown');
        }
    }

    function applyDeltaTagsToDag(dataflowName, $wrap) {
        // This function adds the different tags between a regular dag
        // and a retina dag. For example, it colors parameterized nodes.
        // It also adds extra classes to the dag that is needed for parameteri-
        // zation later.
        var $action = $wrap.find(".actionType.export");
        var $exportTable = $action.next(".dagTable");

        var i = 0;
        var dataflow = DF.getDataflow(dataflowName);
        var retNodes = dataflow.retinaNodes;
        var paramValue = '';
        for (i = 0; i < retNodes.length; i++) {
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
                    .data("paramValue", encodeURI(paramValue))
                    .attr("data-advancedOpts", "default");

        var $elem = $exportTable.find(".tableTitle");
        $elem.text(paramValue);
        xcTooltip.changeText($elem, xcHelper.convertToHtmlEntity(paramValue));

        // Data table moved so that the hasParam class is added correctly
        $wrap.find(".actionType.export").attr("data-table", "");

        // Add data-paramValue tags to all parameterizable nodes
        var $loadNodes = $wrap.find(".dagTable.dataStore");
        $loadNodes.each(function(idx, val) {
            var $val = $(val);
            $val.data("paramValue", encodeURI($val.data("url")));
        });

        var $opNodes = $wrap.find(".actionType.dropdownBox");
        $opNodes.each(function(idx, val) {
            var $op = $(val);
            $op.data("paramValue", encodeURI($op.attr("data-info")));
        });

        var selector = '.dagTable.export, .dagTable.dataStore, ' +
                       '.actionType.filter';
        // Attach styling to all nodes that have a dropdown
        $dfCard.find(selector).addClass("parameterizable");

        // var retinaName = dataflowName;
        for (var nodeId in dataflow.parameterizedNodes) {
            var $tableNode = dataflow.colorNodes(nodeId);
            var type = dataflow.parameterizedNodes[nodeId]
                           .paramType;
            if (type === XcalarApisT.XcalarApiFilter) {
                $tableNode.find(".parentsTitle")
                          .text("<Parameterized>");
            }
        }

        var ignoreNoExist = true;

        getAndUpdateRetinaStatuses(dataflowName, ignoreNoExist)
        .then(function() {
            xcHelper.showRefreshIcon($wrap);
        });
    }

    function enableDagTooltips() {
        var $tooltipTables = $('#dfgViz').find('.dagTableIcon');
        xcTooltip.disable($tooltipTables);
        var selector;
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            selector = '.export .dagTableIcon';
        } else {
            selector = '.dataStoreIcon, ' +
                        '.export .dagTableIcon, .actionType.filter';
        }

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
            var prevent = false;
            if ($(e.target).closest('.dagTable.dataStore').length) {
                $target = $(e.target).closest('.dagTable.dataStore');
            } else if ($(e.target).closest('.dagTable.export').length) {
                $target = $(e.target).closest('.dagTable.export');
                prevent = true;
            }
            if ($target.length) {
                $target.trigger('click');
                if (XVM.getLicenseMode() !== XcalarMode.Mod || prevent) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        var selector = '.dagTable.export, .dagTable.dataStore, .actionType';

        // Attach styling to all nodes that have a dropdown
        $dfCard.find(selector).addClass("parameterizable");
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            $dfCard.find('.parameterizable:not(.export)')
                    .addClass('noDropdown');
        }

        $dagArea.on('click', selector, function() {
            $('.menu').hide();
            xcMenu.removeKeyboardNavigation();
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
            xcMenu.addKeyboardNavigation($menu);

            if (XVM.getLicenseMode() === XcalarMode.Mod) {
                $menu.find('.createParamQuery').hide();
            } else {
                $menu.find('.createParamQuery').show();
            }

            // If node is not export, hide showExportCols option
            if ($(this).hasClass("export")) {
                $menu.find(".showExportCols").show();
                if (!$(this).hasClass("parameterizable") ||
                    XVM.getLicenseMode() === XcalarMode.Mod) {
                    $menu.find(".createParamQuery").hide();
                } else {
                    $menu.find(".createParamQuery").show();
                }
            } else {
                $menu.find(".showExportCols").hide();
            }
        });

        xcMenu.add($menu);

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

    function getDFListItemHtml(dataflow) {
        var html = "";
        var icon = "";
        if (DF.hasSchedule(dataflow)) {
            icon = "xi-menu-scheduler";
        } else {
            icon = "xi-menu-add-scheduler";
        }
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
                    '<i class="icon ' + icon + ' addScheduleToDataflow" ' +
                        'title="Add Schedule to dataflow" ' +
                        'data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                    '</i>' +
                  '</div>' +
                '</div>';
        return (html);
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
        var advancedOpts = getAdvancedExportOption(retName);
        if (advancedOpts == null) {
            // error case
            return PromiseHelper.reject();
        }

        var passedCheckBeforeRunDFG = false;
        checkBeforeRunDFG(advancedOpts.activeSession)
        .then(function() {
            passedCheckBeforeRunDFG = true;
            var promise = XcalarExecuteRetina(retName, paramsArray,
                                              advancedOpts);
            startStatusCheck(retName);

            return promise;
        })
        .then(function() {
            endStatusCheck(retName, passedCheckBeforeRunDFG);
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
                "title": DFTStr.RunDone,
                "msg": msg,
                "isAlert": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            endStatusCheck(retName, passedCheckBeforeRunDFG);
            // do not show alert if op was canceled and
            // has cancel error msg
            if (typeof error === "object" &&
                error.status === StatusT.StatusCanceled &&
                canceledRuns[retName]) {
                Alert.show({
                    "title": StatusMessageTStr.CancelSuccess,
                    "msg": DFTStr.CancelSuccessMsg,
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

    function startStatusCheck(retName) {
        retinasInProgress[retName] = true;
        var $dagWrap = getDagWrap(retName);
        var createdState = DgDagStateTStr[DgDagStateTStr.DgDagStateCreated];
        $dagWrap.find('.dagTable').removeClass(dagStateClasses)
                                  .addClass(createdState);
        statusCheckInterval(retName, true);
    }

    function statusCheckInterval(retName, firstRun) {
        var checkTime;
        if (firstRun) {
            // shorter timeout on the first call
            checkTime = 1000;
        } else {
            checkTime = retinaCheckInterval;
        }

        setTimeout(function() {
            if (!retinasInProgress[retName]) {
                // retina is finished, no more checking
                return;
            }
            getAndUpdateRetinaStatuses(retName)
            .always(function() {
                statusCheckInterval(retName);
            });

        }, checkTime);
    }

    function getAndUpdateRetinaStatuses(retName, ignoreNoExist) {
        var deferred = jQuery.Deferred();
        var statusesToIgnore;
        if (ignoreNoExist) {
            statusesToIgnore = [StatusT.StatusQrQueryNotExist];
        }

        XcalarQueryState(retName, statusesToIgnore)
        .then(function(retInfo) {
            updateRetinaColors(retName, retInfo);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function updateRetinaColors(retName, retInfo) {
        var $dagWrap = getDagWrap(retName);
        var nodes = retInfo.queryGraph.node;
        var tableName;
        var state;
        for (var i = 0; i < nodes.length; i++) {
            tableName = getTableNameFromStatus(nodes[i]);
            state = DgDagStateTStr[nodes[i].state];
            $dagWrap.find('.dagTable[data-tablename="' + tableName + '"]')
                    .removeClass(dagStateClasses)
                    .addClass(state);
        }
    }

    function getTableNameFromStatus(node) {
        var name = node.name.name;
        if (node.api === XcalarApisT.XcalarApiBulkLoad) {
            // name looks something like this and we want username.91863.dsName
            // ".XcalarLRQ.72057594037959103.XcalarDS.username.91863.dsName"
            var splitName = name.split('.');
            name = splitName.splice(4, splitName.length).join(".");
        }

        return (name);
    }

    function endStatusCheck(retName, updateStatus) {
        if (!retinasInProgress[retName]) {
            return;
        }

        delete retinasInProgress[retName];

        if (updateStatus) {
            getAndUpdateRetinaStatuses(retName);
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

    function getAdvancedExportOption(dataflowName) {
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
            "newTableName": newTableName
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

        var dstTableName;

        XIApi.project(txId, colNames, tableName)
        .then(function(newTableName) {
            dstTableName = newTableName;
            var tableCols = getProgCols(colNames);
            return TblManager.refreshTable([dstTableName], tableCols,
                                           [], worksheet, txId);
        })
        .then(function() {
            return XIApi.deleteTable(txId, tableName, true);
        })
        .then(function() {
            Transaction.done(txId, {
                "noSql": true
            });
            deferred.resolve(dstTableName);
        })
        .fail(function(error) {
            Transaction.fail(txId, {
                "error": error,
                "noAlert": true
            });
            deferred.reject(error);
        });

        return deferred.promise();
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
        } else {
            return PromiseHelper.reject(DFTStr.NoFileExt);
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

    function showLicenseTooltip(elem) {
        xcTooltip.add($(elem), {"title": TooltipTStr.OnlyInOpMode});
        xcTooltip.refresh($(elem));
        console.log("Wrong license type");
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DFCard.__testOnly__ = {};
        DFCard.__testOnly__.deleteDataflow = deleteDataflow;
        DFCard.__testOnly__.runDF = runDF;
        DFCard.__testOnly__.retinasInProgress = retinasInProgress;
        DFCard.__testOnly__.startStatusCheck = startStatusCheck;
        DFCard.__testOnly__.endStatusCheck = endStatusCheck;
        DFCard.__testOnly__.addParamToRetina = addParamToRetina;
        DFCard.__testOnly__.showExportCols = showExportCols;
    }
    /* End Of Unit Test Only */

    return (DFCard);

}(jQuery, {}));
