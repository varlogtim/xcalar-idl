window.DFCard = (function($, DFCard) {
    var $dfView;       // $('#dataflowView');
    var $dfCard;       // $('#dfViz');
    var $dfMenu;       // $('#dfMenu').find('.dfList');
    var $listSection;   // $dfMenu.find('.listSection');
    var $header;        // $dfCard.find('.cardHeader h2');
    var canceledRuns = {};
    var xdpMode = XcalarMode.Mod;
    var retinaCheckInterval = 2000;
    var retinasInProgress = {};
    var hasChange = false;
    var $scrollBarWrap;
    var currentDataflow = null;
    var dagStateClasses = "";

    DFCard.setup = function() {
        $dfView = $('#dataflowView');
        $dfCard = $('#dfViz');
        $dfMenu = $('#dfMenu').find('.dfList');
        $listSection = $dfMenu.find('.listSection');
        $header = $dfCard.find('.cardHeader h2');
        $scrollBarWrap = $("#dataflowPanel").find(".dfScrollBar");

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
        DFParamTab.setup();
        setupScrollBar();
    };

    DFCard.addDFToList = function(dataflowName) {
        if (!DF.wasRestored()) {
            DF.setLastCreatedDF(dataflowName);
            return;
        }

        if (DFCard.getDFListItem(dataflowName).length) {
            // GUI-9672 happens when df list is refreshed during an add DF
            // operation
            return;
        }
        var html = getDFListItemHtml(dataflowName);
        var $listItems = $listSection.find(".groupName");
        var added = false;

        $listItems.each(function() {
            var $name = $(this);
            var name = $name.text();
            if (xcHelper.sortVals(name, dataflowName) > 0) {
                $name.closest(".listWrap").before(html);
                added = true;
                return false;
            }
        });

        if (!added) {
            $listSection.append(html);
        }

        var numDfs = DF.getNumDataflows();
        $dfMenu.find('.numGroups').text(numDfs);

        $listSection.find('.listBox').removeClass('selected');
        var $dataflowLi = DFCard.getDFListItem(dataflowName).find(".listBox");
        $dataflowLi.addClass('selected');
        return focusOnDF(dataflowName);
    };

    DFCard.getDFListItem = function(dataflowName) {
        var $list = $listSection.find(".listWrap").filter(function() {
            return ($(this).find(".groupName").text() === dataflowName);
        });
        return $list;
    };

    DFCard.getActiveDF = function() {
        var $activeGroup = $dfMenu.find(".listBox.selected");
        var activeGroupName = null;

        if ($activeGroup.length) {
            activeGroupName = $activeGroup.find(".groupName").text();
        }
        return activeGroupName;
    };

    DFCard.refresh = function() {
        $dfMenu.addClass("disabled");
        var $listRefreshIcon = xcHelper.showRefreshIcon($dfMenu, true);
        var $cardRefreshIcon = xcHelper.showRefreshIcon($dfCard, true);
        var $modalRefreshIcon = xcHelper.showRefreshIcon($("#dfParamModal"), true);
        var startTime = Date.now();

        DF.getEmataInfo()
        .then(function(eMeta) {
            var ephMetaInfos;
            try {
                ephMetaInfos = new EMetaConstructor(eMeta);
            } catch (error) {
                return PromiseHelper.resolve();
            }
            if (ephMetaInfos) {
                return DF.refresh(ephMetaInfos.getDFMeta());
            }
        })
        .always(function() {
            $dfMenu.removeClass("disabled");
            // XXX might be better to use a refreshIcon constructor to track
            // this
            var spinTime = Math.max(1500 - (Date.now() - startTime), 0);
            setTimeout(function() {
                $listRefreshIcon.fadeOut(100, function() {
                    $listRefreshIcon.remove();
                });
                $cardRefreshIcon.fadeOut(100, function() {
                    $cardRefreshIcon.remove();
                });
                $modalRefreshIcon.fadeOut(100, function() {
                    $modalRefreshIcon.remove();
                });
            }, spinTime);
        });
    };

    DFCard.refreshDFList = function(clear, noFocus) {
        if (clear) {
            $dfCard.find(".dagWrap").filter(function() {
                return !$(this).hasClass("inProgress");
            }).remove();
            $dfCard.find(".hint").remove();
        }
        var dataflows = DF.getAllDataflows();
        var activeGroupName = DFCard.getActiveDF();

        if ($.isEmptyObject(dataflows)) {
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
            $dfMenu.find('.numGroups').text(0);
            $listSection.html("");
            return PromiseHelper.resolve();
        }
        var html = "";
        var dataflowList = [];
        for (var dfName in dataflows) {
            dataflowList.push(dfName);
        }
        var numFlows = dataflowList.length;
        dataflowList = dataflowList.sort(xcHelper.sortVals);
        for (var i = 0; i < numFlows; i++) {
            html += getDFListItemHtml(dataflowList[i]);
        }

        $listSection.html(html);
        $dfMenu.find('.numGroups').text(numFlows);

        if (noFocus) {
            return PromiseHelper.resolve();
        }

        // must find it again because we refreshed the list
        var activeFound = false;
        if (activeGroupName) {
            var $df = $dfMenu.find('.listBox').filter(function() {
                return ($(this).find('.groupName').text() ===
                        activeGroupName);
            }).closest('.listBox');

            if ($df.length) {
                activeFound = true;
                return DFCard.focusOnDF(activeGroupName);
            }
        }
        if (!activeFound && !$("#dataflowTab").hasClass("firstTouch")) {
            return DFCard.focusFirstDF();
        } else {
            return PromiseHelper.resolve();
        }
    };

    DFCard.getCurrentDF = function() {
        return (currentDataflow);
    };

    DFCard.focusFirstDF = function() {
        if (!$dfMenu.find('.listBox').length) {
            return PromiseHelper.resolve();
        }

        var dfName = $dfMenu.find('.listBox .groupName').eq(0).text();
        return DFCard.focusOnDF(dfName);
    };

    DFCard.getProgress = function(dfName) {
        var $dagWrap = getDagWrap(dfName);
        var data = $dagWrap.data() || {};
        var retData = {
            pct: data.pct || 0,
            curOpPct: data.oppct || 0,
            opTime: data.optime || 0,
            numCompleted: data.numcompleted || 0
        };

        return retData;
    };

    DFCard.focusOnDF = function(dfName) {
        var $dfListItem = $dfMenu.find('.listBox').filter(function() {
            return ($(this).find('.groupName').text() ===
                    dfName);
        }).closest('.listBox');
        if ($dfListItem.find(".listBox.selected").length) {
            return PromiseHelper.resolve();
        }
        $listSection.find('.listBox').removeClass('selected');
        $dfListItem.addClass('selected');
        return focusOnDF(dfName);
    };

    function addListeners() {
        $dfMenu.on('click', '.refreshBtn', function() {
            DFCard.refresh();
        });

        $listSection.on('click', '.dataFlowGroup', function() {
            var $df = $(this);
            var $dataflowLi = $df.find('.listBox');
            var dataflowName = $dataflowLi.find('.groupName').text();
            DFCard.focusOnDF(dataflowName);
        });

        $listSection.on('click', '.downloadDataflow', function() {
            var dfName = $(this).siblings('.groupName').text();
            XcSupport.downloadLRQ(dfName);
            // XXX: Show something when the download has started
        });

        $listSection.on('click', '.deleteDataflow', function() {
            var dfName = $(this).siblings('.groupName').text();
            Alert.show({
                'title': DFTStr.DelDF,
                'msg': xcHelper.replaceMsg(DFTStr.DelDFMsg, {
                    "dfName": dfName
                }),
                'onConfirm': function() {
                    deleteDataflow(dfName);
                }
            });
        });

        $listSection.on("click", ".addScheduleToDataflow", function() {
            var dfName = $(this).closest(".dataFlowGroup").find(".groupName")
                                                          .text();
            Scheduler.show(dfName);
        });

        $dfCard.on('click', '.addScheduleToDataflow', function() {
            if ($dfCard.hasClass("unexpectedNode")) {
                return;
            }
            $(this).blur();
            // doesn't have schedule, show schedule
            var dfName = $listSection.find(".selected .groupName").text();
            var df = DF.getDataflow(dfName);
            var paramsInDataflow = DF.getParameters(df);
            var params = DF.getParamMap();
            var missingParams = [];
            for (var i = 0; i < paramsInDataflow.length; i++) {
                var name = paramsInDataflow[i];
                if (!(systemParams.hasOwnProperty(name) &&
                    isNaN(Number(name))) && !params[name]) {
                    missingParams.push(name);
                }
            }
            if (!missingParams.length) {
                xcTooltip.hideAll();
                Scheduler.show(dfName);
            } else {
                Alert.show({
                    "title": DFTStr.AddValues,
                    "msg": xcHelper.replaceMsg(DFTStr.ParamNoValueList, {
                        "params": missingParams.join(", ")
                    }),
                    "isAlert": true,
                    "onCancel": function() {
                        $dfCard.find('.retTabSection .tabWrap').trigger('click');
                    }
                });
            }
        });

        $('#uploadDataflowButton').click(function() {
            UploadDataflowCard.show();
        });

        $dfCard.on('click', '.latestVersion', function() {
            var $this = $(this);
            var $run = $('#dfViz').find(".runNowBtn");
            $this.addClass("xc-disabled");
            $run.addClass("xc-disabled");
            $this.blur();
            updateToLatest()
            .then(function(tableNames) {
                if (tableNames) {
                    console.log("Updated operations: " + tableNames);
                }
                xcHelper.showSuccess(SuccessTStr.ChangesSaved);
            })
            .fail(function(error) {
                Alert.error(DFTStr.UpdateParamFail, error);
            })
            .always(function() {
                $this.removeClass("xc-disabled");
                $run.removeClass("xc-disabled");
            });
        });

        $dfCard.on("click", ".runNowBtn", function() {
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }

            var $btn = $(this).blur();
            var retName = $listSection.find(".selected .groupName").text();
            var df = DF.getDataflow(retName);

            var paramsArray = getParameters(df);
            var emptyParam;
            for (var i = 0; i < paramsArray; i++) {
                if (paramsArray[i].paramValue == null) {
                    emptyParam = paramsArray[i].paramName;
                }
            }

            if (!emptyParam) {
                if ($btn.hasClass('canceling') || canceledRuns[retName]) {
                    return;
                }
                if ($btn.hasClass('running')) {
                    var txId = $btn.closest(".dagWrap").data("txid");
                    DFCard.cancelDF(retName, txId);
                } else {
                    $btn.addClass("running");
                    xcTooltip.changeText($btn, DFTStr.Cancel);
                    xcTooltip.refresh($btn);

                    runDF(retName, paramsArray)
                    .always(function() {
                        delete canceledRuns[retName];
                        $btn.removeClass("running canceling");
                        xcTooltip.changeText($btn, DFTStr.Run);
                    });
                }
            } else {
                Alert.show({
                    "title": DFTStr.AddValues,
                    "msg": "Parameter + \"" + emptyParam + "\" has no value. " +
                           DFTStr.ParamNoValue,
                    "isAlert": true,
                    "onCancel": function() {
                        $dfCard.find('.retTabSection .tabWrap').trigger('mousedown');
                    }
                });
            }
        });

        $dfCard.on("click", ".timeSection", function () {
            var $dagWrap = $(this).closest(".dagWrap");
            $dagWrap.find(".dagTable").toggleClass("hover");
        });
    }

    function deleteDataflow(dfName) {
        var deferred = PromiseHelper.deferred();
        var $card = $dfCard.find('.dagWrap[data-dataflowName="' + dfName + '"]');
        var $list = DFCard.getDFListItem(dfName);
        var html = '<div class="animatedEllipsisWrapper">' +
                        '<div class="text">' +
                            '(' + CommonTxtTstr.deleting +
                        '</div>' +
                        '<div class="animatedEllipsis">' +
                            '<div>.</div>' +
                            '<div>.</div>' +
                            '<div>.</div>' +
                        '</div>' +
                        '<div class="text">)</div>' +
                    '</div>';
        var $deleteInfo = $(html);
        $dfCard.find(".cardHeader .title").append($deleteInfo);

        Scheduler.hide();

        $card.addClass("deleting");
        $list.addClass("deleting");

        DF.removeDataflow(dfName)
        .then(function() {
            var inFocus = $list.find(".listInfo").hasClass("selected");
            $card.remove();
            $list.remove();
            if (inFocus) {
                DFCard.refreshDFList();
            }
            deferred.resolve();
        })
        .fail(function(error) {
            xcHelper.showFail(FailTStr.RmDF);
            $card.removeClass("deleting");
            $list.removeClass("deleting");
            $deleteInfo.remove();
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function drawDF(dataflowName) {
        var deferred = PromiseHelper.deferred();
        var html =
        '<div class="dagWrap clearfix" ' +
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
                '<button class="latestVersion btn btn-small iconBtn ' +
                xdpMode + '" ' +
                'data-toggle="tooltip" data-container="body" ' +
                'data-placement="top" data-original-title="' +
                DFTStr.UpdateSelect + '">' +
                    '<i class="icon xi-updatedallselected fa-18"></i>' +
                '</button>' +
                '<div class="border"></div>' +
                '<button class="addScheduleToDataflow btn btn-small iconBtn ' +
                xdpMode + '" ' +
                'data-toggle="tooltip" data-container="body" ' +
                'data-placement="top" data-original-title="' +
                DFTStr.AddSched + '">' +
                    '<i class="icon xi-menu-add-scheduler"></i>' +
                '</button>' +
                '<div class="border"></div>' +
                '<button class="runNowBtn btn btn-small iconBtn ' +
                xdpMode + '" ' +
                'data-toggle="tooltip" data-container="body" ' +
                'data-placement="top" data-original-title="' +
                DFTStr.Run + '">' +
                    '<i class="icon xi-arrow-right"></i>' +
                    '<i class="icon xi-close"></i>' +
                    '<div class="spin"></div>' +
                '</button>' +
                '<div class="timeSection" ' +
                'data-toggle="tooltip" data-container="body" ' +
                'data-placement="top" data-original-title="' +
                DFTStr.ToggleTime + '">' +
                    '<span class="label"></span>: ' +
                    '<span class="overallTime"></span>' +
                '</div>' +
            '</div>' +
        '</div>';

        $dfCard.find('.cardMain').children('.hint').remove();
        var $dagWrap = getDagWrap(dataflowName);
        $dagWrap.remove();
        $dfCard.find('.cardMain').append(html);

        var dataflow = DF.getDataflow(dataflowName);
        var nodes = dataflow.nodes;
        $dagWrap = getDagWrap(dataflowName);
        DagDraw.createDagImage(nodes, $dagWrap);
        delete dataflow.nodes; // reference to nodes only needed for creating
        // dataflow graph

        var promise = applyDeltaTagsToDag(dataflowName, $dagWrap);

        xcHelper.showRefreshIcon($dagWrap, false, promise);
        promise
        .then(deferred.resolve)
        .fail(deferred.reject);

        Dag.addEventListeners($dagWrap);
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            $dagWrap.find('.parameterizable:not(.export)')
                    .addClass('noDropdown');
        }

        return deferred.promise();
    }

    function applyDeltaTagsToDag(dataflowName, $dagWrap) {
        if ($dagWrap.hasClass("error")) {
            return PromiseHelper.reject();
        }
        var deferred = PromiseHelper.deferred();
        // This function adds the different tags between a regular dag
        // and a retina dag. For example, it colors parameterized nodes.
        // It also adds extra classes to the dag that is needed for parameteri-
        // zation later.

        var dataflow = DF.getDataflow(dataflowName);
        var allNodes = dataflow.retinaNodes;
        var parameterizedNodes = dataflow.parameterizedNodes;
        var paramStructs = {};

        for (var tableName in allNodes) {
            var node = allNodes[tableName];
            var struct = node.args;
            var type = XcalarApisT[node.operation];
            switch (type) {
                case (XcalarApisT.XcalarApiExport):
                    var fileName = struct.fileName || "";
                    paramStructs[tableName] = struct;
                        // uploaded retinas do not have params in export node
                    var $exportTable = $dagWrap.find(".operationTypeWrap[data-table='" +
                                                    tableName + "']").next();

                    $exportTable.attr("data-advancedOpts", "default");

                    var $elem = $exportTable.find(".tableTitle");
                    var expName = xcHelper.stripCSVExt(fileName);
                    $elem.text(expName);
                    xcTooltip.changeText($elem, xcHelper.convertToHtmlEntity(expName));
                    break;
                case (XcalarApisT.XcalarApiFilter):
                case (XcalarApisT.XcalarApiBulkLoad):
                case (XcalarApisT.XcalarApiSynthesize):
                    paramStructs[tableName] = struct;
                    break;
                default:
                    break;
            }
        }

        var selector = '.dagTable.rootNode, .operationTypeWrap';
        // Attach styling to all nodes that have a dropdown
        $dagWrap.find(selector).addClass("parameterizable");

        // go through modified nodes and color if parameterized
        for (var tableName in parameterizedNodes) {
            var struct = paramStructs[tableName];
            if (isParameterized(struct)) {
                var name = tableName;
                if (name.indexOf(gDSPrefix) === 0) {
                    name = name.substring(gDSPrefix.length);
                }
                var $tableNode = dataflow.colorNodes(name);
                var type = parameterizedNodes[tableName].paramType;
                if (type === XcalarApisT.XcalarApiFilter ||
                    type === XcalarApisT.XcalarApiExport) {
                    $tableNode.find(".opInfoText")
                              .text("<Parameterized>");
                }
            }
        }

        var ignoreNoExist = true;
        getAndUpdateRetinaStatuses(dataflowName, ignoreNoExist)
        .then(function(ret) {
            $dagWrap.addClass("hasRun");
            updateOverallTime(dataflowName, true);
            if (ret.queryState === QueryStateT.qrProcessing) {
                startStatusCheck(dataflowName, true);
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });

        return deferred.promise();
    }

    function enableDagTooltips() {
        var $tooltipTables = $dfCard.find('.dagTableIcon, .dataStoreIcon');
        xcTooltip.disable($tooltipTables);
        var selector;
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            selector = '.export.operationTypeWrap .operationType';
        } else {
            selector = '.dataStore .dataStoreIcon, ' +
                        '.operationTypeWrap .operationType';
        }

        var $icons = $dfCard.find(selector).filter(function() {
            return ($(this).siblings(".progressInfo").length === 0);
        });

        xcTooltip.add($icons, {
            "title": CommonTxtTstr.ClickToOpts
        });
    }

    function setupDagDropdown() {
        var $dagArea = $dfCard;
        var $currentIcon;
        var $menu = $dagArea.find('.dagDropDown');

        $dagArea[0].oncontextmenu = function(e) {
            var $target = $(e.target).closest('.operationTypeWrap');
            var prevent = false;
            if ($(e.target).closest('.dagTable.dataStore').length) {
                $target = $(e.target).closest('.dagTable.dataStore');
            }
            if ($target.length) {
                $target.trigger('click');
                if (XVM.getLicenseMode() !== XcalarMode.Mod || prevent) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            } else if ($(e.target).closest(".dagImageWrap").length) {
                showRightClickOption(e);
                e.preventDefault();
                e.stopPropagation();
            }
        };

        // Attach styling to all nodes that have a dropdown
        $dfCard.find('.dagTable.rootNode, .operationTypeWrap').addClass("parameterizable");
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            $dfCard.find('.parameterizable:not(.export)')
                    .addClass('noDropdown');
        }

        $dagArea.on('click', '.dagTable, .operationTypeWrap', function(event) {
            $('.menu').hide();
            xcMenu.removeKeyboardNavigation();
            $('.leftColMenu').removeClass('leftColMenu');
            $currentIcon = $(this);
            if ($(event.target).closest(".commentIcon").length) {
                return;
            }

            $menu.find("li").hide();
            var $queryLi = $menu.find(".createParamQuery");

            if (XVM.getLicenseMode() !== XcalarMode.Mod) {
                $queryLi.show();
            }
            if ($currentIcon.hasClass("operationTypeWrap")) {
                $menu.find(".commentOp").show();
                if ($currentIcon.hasClass("hasComment")) {
                    $menu.find(".commentOp").text(DFTStr.EditComment);
                } else {
                    $menu.find(".commentOp").text(DFTStr.NewComment);
                }
            }

            // If node is not export, hide showExportCols option
            if ($currentIcon.hasClass("export")) {
                $menu.find(".showExportCols").show();

                if (XVM.getLicenseMode() === XcalarMode.Mod) {
                    $queryLi.hide();
                } else {
                    $queryLi.show();
                    if ($currentIcon.hasClass("parameterizable")) {
                        $queryLi.removeClass("unavailable");
                        xcTooltip.remove($queryLi);
                    } else {
                        $queryLi.addClass("unavailable");
                        xcTooltip.add($queryLi, {
                            title: DFTStr.CannotParam
                        });
                    }
                }
            } else {
                $queryLi.removeClass("unavailable");
                xcTooltip.remove($queryLi);
            }
            if ($currentIcon.is(".dagTable")) {
                if (!$currentIcon.hasClass("rootNode")) {
                    $queryLi.hide();

                }

                if ($currentIcon.hasClass("hasProgress")) {
                    $menu.find(".skewInfo").show();
                } else if (!$currentIcon.hasClass("rootNode")) {
                    return; // no menu if not root node and no progressInfo
                }
            }

            positionAndInitMenu($currentIcon);
        });

        xcMenu.add($menu);

        $menu.find("li").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            if ($li.hasClass("unavailable")) {
                return;
            }
            var $dagWrap = $dfCard.find(".dagWrap:visible");
            var action = $li.data("action");

            switch (action) {
                case ("createParamQuery"):
                    DFParamModal.show($currentIcon);
                    break;
                case ("showExportCols"):
                    showExportCols($currentIcon);
                    break;
                case ("expandAll"):
                    Dag.expandAll($dagWrap);
                    break;
                case ("collapseAll"):
                    Dag.collapseAll($dagWrap);
                    break;
                case ("none"):
                    // do nothing;
                    break;
                case ("saveImage"):
                    var tableName = $dagWrap.data("dataflowname");
                    DagPanel.saveImageAction($dagWrap, tableName);
                    break;
                case ("newTabImage"):
                    DagPanel.newTabImageAction($dagWrap);
                    break;
                case ("commentOp"):
                    DFCommentModal.show($currentIcon, true);
                    break;
                case ("skewInfo"):
                    showSkewModal($currentIcon);
                    break;
                default:
                    break;
            }
        });

        function showRightClickOption(e) {
            $('.menu').hide();
            xcMenu.removeKeyboardNavigation();
            $('.leftColMenu').removeClass('leftColMenu');

            $menu.find("li").hide();
            $menu.find(".newTabImage, .saveImage").show();
            DagPanel.toggleExpCollapseAllLi($dfCard.find(".dagWrap:visible"),
                                             $menu);
            positionAndInitMenu(null, e);
        }

        function positionAndInitMenu($currentIcon, e) {
            var top, left;
            if (e) {
                top = e.pageY + 15;
                left = e.pageX;
            } else {
                top = $currentIcon[0].getBoundingClientRect().bottom;
                left = $currentIcon[0].getBoundingClientRect().left;
            }

            $menu.css({'top': top, 'left': left});
            $menu.show();

            // positioning if dropdown menu is on the right side of screen
            if ($menu[0].getBoundingClientRect().right >
                $(window).width() - 5) {
                left = $(window).width() - $menu.width() - 7;
                $menu.css('left', left).addClass('leftColMenu');
            } else if ($menu[0].getBoundingClientRect().left <
                        MainMenu.getOffset()) {
                // if on the left side of the screen
                $menu.css('left', MainMenu.getOffset() + 5);
            }

            var menuBottom = $menu[0].getBoundingClientRect().bottom;
            if (menuBottom > $(window).height()) {
                $menu.css('top', '-=' + $menu.height());
            }
            xcMenu.addKeyboardNavigation($menu);
        }
    }

    function showSkewModal($currentIcon) {
        const skewInfo = $currentIcon.find(".progressInfo").data("skewInfo");
        SkewInfoModal.show(null, {tableInfo: skewInfo});
    }

    function showExportCols($dagTable) {
        // var df = DF.getDataflow(DFCard.getCurrentDF());
        var $popup = $('#exportColPopup');
        var tableName = $dagTable.data('table');
        var nodeId = $dagTable.data("nodeid");
        var exportNode = Dag.getNodeById($dagTable.closest(".dagWrap"), nodeId);
        var cols = exportNode.value.struct.columns;
        var numCols = cols.length;

        $popup.find('.tableName').text(tableName);
        $popup.find('.numCols').attr('title', CommonTxtTstr.NumCol)
                                   .text('[' + numCols + ']');

        var html = '';

        for (var i = 0; i < numCols; i++) {
            var name = cols[i].columnName; // or we can show cols[i].headerAlias
            name = xcHelper.escapeHTMLSpecialChar(name);
            html += '<li>' +
                        '<div title="' + xcHelper.escapeDblQuoteForHTML(name) +
                        '" class="name">' +
                            name + '</div>' +
                    '</li>';
        }
        if (numCols === 0) {
            html += '<span class="noFields">No fields present</span>';
        }

        $popup.find('ul').html(html);
        $popup.show();

        var width = $popup.outerWidth();
        var top = Math.max($dagTable[0].getBoundingClientRect().bottom -
                            $popup.height(), 5);
        var left = $dagTable[0].getBoundingClientRect().left;

        $popup.css({'top': top, 'left': left});

        // positioning if menu is on the right side of screen
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

        xcTooltip.hideAll();

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

    function getDFListItemHtml(dfName) {
        var html = "";
        html += '<div class="dataFlowGroup listWrap">' +
                  '<div class="listBox listInfo">' +
                    '<div class="iconWrap">';
        if (DF.hasSchedule(dfName)) {
            html += '<i class="icon xi-menu-scheduler addScheduleToDataflow" ' +
                        'title="' + DFTStr.Scheduled + '" ' +
                        'data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                    '</i>';
        }
        html += '</div>' +
                    '<span class="groupName">' + dfName + '</span>' +
                    '<i class="icon xi-trash deleteDataflow" ' +
                        'title="' + DFTStr.DelDF2 + '" data-toggle="tooltip" ' +
                        'data-placement="top" data-container="body">' +
                    '</i>' +
                    '<i class="icon xi-download downloadDataflow" ' +
                        'title="' + DFTStr.DownloadDF + '" ' +
                        'data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                    '</i>' +
                '</div>' +
                '</div>';
        return (html);
    }

    function runDF(retName, paramsArray) {
        var deferred = PromiseHelper.deferred();
        var cancelErr = "canceled";

        var df = DF.getDataflow(retName);

        var exportNode;
        var retNodes = df.retinaNodes;
        for (var tName in retNodes) {
            if (XcalarApisT[retNodes[tName].operation] ===
                XcalarApisT.XcalarApiExport) {
                exportNode = retNodes[tName];
                break;
            }
        }

        var exportStruct = exportNode.args;
        var targetName = exportStruct.targetName;
        var targetType = exportStruct.targetType;
        var fileName = parseFileName(exportStruct, paramsArray);
        var advancedOpts = DF.getAdvancedExportOption(retName);

        if (advancedOpts == null) {
            // error case
            return PromiseHelper.reject();
        }

        var $dagWrap = getDagWrap(retName);
        var txId;

        var passedCheckBeforeRunDF = false;
        var notNeedToCheckDuplicated = advancedOpts.activeSession ||
            (exportStruct && exportStruct.createRule === "appendOnly") ||
            (exportStruct && exportStruct.createRule === "deleteAndReplace");

        checkBeforeRunDF(notNeedToCheckDuplicated)
        .then(function() {
            return checkIfHasSystemParam(retName);
        })
        .then(function(hasSysParam) {
            return alertBeforeRunDF(hasSysParam, advancedOpts.activeSession);
        })
        .then(function() {
            txId = Transaction.start({
                "operation": SQLOps.Retina,
                "sql": {"operation": SQLOps.Retina, retName: retName},
                "track": true
            });
            $dagWrap.data("txid", txId);
            passedCheckBeforeRunDF = true;
            startStatusCheck(retName);
            return XcalarExecuteRetina(retName, paramsArray, advancedOpts,
                                       txId);
        })
        .then(function() {
            endStatusCheck(retName, true, true);
            if (advancedOpts.activeSession) {
                return addTableToWS(advancedOpts.newTableName, exportStruct,
                                          txId);
            }
        })
        .then(function(finalTable) {
            var msg = DFTStr.RunDoneMsg;
            var btns = [{
                "name": AlertTStr.CLOSE,
                "className": "btn-cancel"
            }];
            if (advancedOpts.activeSession) {
                msg += "\n" + xcHelper.replaceMsg(DFTStr.FindTable, {
                    "table": finalTable
                });
                btns.push({
                    name: DFTStr.ViewTable,
                    func: function() {
                        MainMenu.openPanel("workspacePanel", "worksheetButton", {
                            hideDF: true
                        });
                        var tableId = xcHelper.getTableId(finalTable);
                        xcHelper.centerFocusedTable(tableId, true);
                    }
                });
            }

            Transaction.done(txId, {
                "noSql": true
            });

            Alert.show({
                "title": DFTStr.RunDone,
                "msg": msg,
                "isAlert": true,
                "hideButtons": ["cancel"],
                "buttons": btns
            });
            deferred.resolve();
        })
        .fail(function(error) {
            endStatusCheck(retName, passedCheckBeforeRunDF);
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
            } else if (error !== cancelErr) {
                Alert.error(DFTStr.RunFail, error);
            }
            if (passedCheckBeforeRunDF) {
                Transaction.fail(txId, {
                    "error": error,
                    "noAlert": true
                });
            }

            deferred.reject(error);
        });

        return deferred.promise();

        function checkBeforeRunDF(noExportCheck) {
            if (noExportCheck) {
                // already verified
                return PromiseHelper.resolve();
            } else {
                return checkExistingFileName(fileName, targetName, targetType);
            }
        }

        function alertBeforeRunDF(hasSysParam) {
            if (!hasSysParam) {
                return PromiseHelper.resolve();
            }

            var deferred = PromiseHelper.deferred();
            var msgArray = [];

            if (hasSysParam) {
                msgArray.push(DFTStr.WarnSysParam);
            }

            msg = "";
            if (msgArray.length === 1) {
                msg = msgArray[0];
            } else {
                msgArray.forEach(function(info, index) {
                    msg += (index + 1) + ". " + info + "\n";
                });
            }

            Alert.show({
                "instr": DFTStr.RunDFInstr,
                "msg": msg,
                "align": "left",
                "sizeToText": true,
                "onConfirm": function() { deferred.resolve(); },
                "onCancel": function() { deferred.reject(cancelErr); }
            });
            return deferred.promise();
        }


    }

    // finds all the parameters in the dataflow graph and filters
    // the global parameters map to just those parameters
    function getParameters(df) {
        var allParams = DF.getParamMap();
        var params = DF.getParameters(df);
        var paramsArray = [];
        for (var i = 0; i < params.length; i++) {
            if (allParams[params[i]]) {
                var p = new XcalarApiParameterT();
                p.paramName = params[i];
                p.paramValue = allParams[params[i]].value;
                paramsArray.push(p);
            }
        }

        return paramsArray;
    }

    function checkIfHasSystemParam(retName) {
        var deferred = PromiseHelper.deferred();
        XcalarListParametersInRetina(retName)
        .then(function(res) {
            var length = res.numParameters;
            var parameters = res.parameters;
            var hasSysParam = false;
            for (var i = 0; i < length; i++) {
                var paramName = parameters[i].paramName;
                if (systemParams.hasOwnProperty(paramName) && isNaN(Number(paramName))) {
                    hasSysParam = true;
                    break;
                }
            }
            deferred.resolve(hasSysParam);
        })
        .fail(function(error) {
            console.error("error", error);
            // still resolve the promise
            deferred.resolve(false);
        });

        return deferred.promise();
    }

    function startStatusCheck(retName, continuing) {
        retinasInProgress[retName] = true;
        var $dagWrap = getDagWrap(retName);
        $dagWrap.addClass("inProgress hasRun");

        if (continuing) {
            var $btn = $dagWrap.find(".runNowBtn");
            $btn.addClass("running");
            xcTooltip.changeText($btn, DFTStr.Cancel);
            xcTooltip.refresh($btn);
        }

        var createdState = DgDagStateTStr[DgDagStateT.DgDagStateCreated];
        $dagWrap.find(".dagTable." + DgDagStateTStr[DgDagStateT.DgDagStateDropped])
                .addClass("wasDropped");
        $dagWrap.find('.dagTable').removeClass(dagStateClasses)
                                  .addClass(createdState);
        $dagWrap.data({
            pct: 0,
            curoppct: 0,
            optime: 0,
            numcompleted: 0,
            starttime: Date.now()
        });
        statusCheckInterval(retName, true, continuing);
        $dagWrap.find(".timeSection .label").html(CommonTxtTstr.elapsedTime);
        $dagWrap.find(".overallTime").html("0s");
        overallTimeInterval(retName, continuing);
    }

    function overallTimeInterval(retName, continuing) {
        var checkTime = 1000;

        setTimeout(function() {
            if (!retinasInProgress[retName]) {
                // retina is finished, no more checking
                return;
            }
            updateOverallTime(retName, false, continuing);
            overallTimeInterval(retName, continuing);
        }, checkTime);
    }

    function statusCheckInterval(retName, firstRun, continuing) {
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
            getAndUpdateRetinaStatuses(retName, false, false, continuing)
            .always(function(ret) {
                if (continuing && ret.queryState !== QueryStateT.qrProcessing) {
                    var isComplete = false;
                    if (ret.queryState === QueryStateT.qrFinished) {
                        isComplete = true;
                    } else if (canceledRuns[retName]) {
                        Alert.show({
                            "title": DFTStr.Canceled,
                            "msg": xcHelper.replaceMsg(DFTStr.CancelAlertMsg,
                                                        {name: retName}),
                            "isAlert": true
                        });
                    }
                    endStatusCheck(retName, true, isComplete, continuing);
                }
                statusCheckInterval(retName, false, continuing);
            });

        }, checkTime);
    }

    function getAndUpdateRetinaStatuses(retName, ignoreNoExist, isComplete) {
        var deferred = PromiseHelper.deferred();
        var statusesToIgnore;
        if (ignoreNoExist) {
            statusesToIgnore = [StatusT.StatusQrQueryNotExist];
        }

        XcalarQueryState(retName, statusesToIgnore)
        .then(function(retInfo) {
            updateNodeProgressDisplay(retName, retInfo, isComplete);
            if (isComplete) {
                updateOverallTime(retName, isComplete);
            }
            deferred.resolve(retInfo);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function updateOverallTime(retName, isComplete, continuing) {
        var $dagWrap = getDagWrap(retName);
        var time;
        var timeStr;
        if (isComplete || continuing) {
            time = $dagWrap.data("optime");
            var round = false;
            if (continuing) {
                time = Math.max(Date.now() - $dagWrap.data("starttime"), time);
                round = true;
            }
            timeStr = xcHelper.getElapsedTimeStr(time, round);
            $dagWrap.find(".timeSection .label").html(CommonTxtTstr.operationTime);
        } else {
            time = Date.now() - $dagWrap.data("starttime");
            timeStr = xcHelper.getElapsedTimeStr(time, true);
        }
        $dagWrap.find(".overallTime").text(timeStr);
    }

    function updateNodeProgressDisplay(retName, retInfo, isComplete) {
        var $dagWrap = getDagWrap(retName);
        var nodes = retInfo.queryGraph.node;
        var tableName;
        var state;
        var numCompleted = 0;
        var $dagTable;
        var progressBar = '<div class="progressBarWrap" ' +
                            'data-pct="0" ' +
                            'data-starttime="' + Date.now() + '">' +
                            '<div class="progressBar"></div>' +
                         '</div>';
        var progressInfo;
        var cumulativeOpTime = 0;
        var curOpPct = 0;
        var timeStr;
        for (var i = 0; i < nodes.length; i++) {
            tableName = getTableNameFromStatus(nodes[i]);
            state = DgDagStateTStr[nodes[i].state];
            $dagTable = $dagWrap.find('.dagTable[data-tablename="' + tableName +
                                      '"]');
            $dagTable.find(".progressInfo").remove();
            $dagTable.removeClass("hasProgress");
            progressInfo = "";
            $dagTable.removeClass(dagStateClasses).addClass(state);
            var $barWrap = $dagTable.find(".progressBarWrap");
            var time = nodes[i].elapsed.milliseconds;
            cumulativeOpTime += time;
            let noProgressInfo = false;
            if (nodes[i].state === DgDagStateT.DgDagStateReady) {
                timeStr = xcHelper.getElapsedTimeStr(time);
                numCompleted++;
                progressInfo = '<div class="progressInfo dagTableTip" >' +
                                    '<div class="rows"><span class="label">' +
                                        CommonTxtTstr.rows +
                                        ':</span><span class="value">' +
                                    xcHelper.numToStr(nodes[i].numRowsTotal) +
                                        '</span></div>' +
                                    '<div class="time"><span class="label">' +
                                        CommonTxtTstr.time +
                                     ':</span><span class="value">' + timeStr +
                                     '</span></div>';

                xcTooltip.remove($dagTable.find(".dagTableIcon, .dataStoreIcon"));
                $barWrap.remove();
            } else if (nodes[i].state === DgDagStateT.DgDagStateProcessing) {
                if (!$barWrap.length) {
                    $dagTable.append(progressBar);
                    $barWrap = $dagTable.find(".progressBarWrap");
                    time = 0;
                } else {
                    time = Date.now() - $barWrap.data("starttime");
                }
                timeStr = xcHelper.getElapsedTimeStr(time, true);
                var nodePct = Math.round(100 * nodes[i].numWorkCompleted /
                                     nodes[i].numWorkTotal);
                if (isNaN(nodePct)) {
                    nodePct = 0;
                }
                curOpPct = nodePct / 100;
                var lastPct = $barWrap.data("pct");
                if (nodePct && nodePct !== lastPct) {
                    $barWrap.find(".progressBar").animate(
                                                    {"width": nodePct + "%"},
                                                    retinaCheckInterval,
                                                    "linear");
                    $barWrap.data("pct", nodePct);
                }
                progressInfo = '<div class="progressInfo dagTableTip" >' +
                                    '<div class="pct"><span class="pct">' +
                                        nodePct + '%</span></div>' +
                                    '<div class="time"><span class="label">' +
                                        CommonTxtTstr.elapsedTime +
                                        ':</span><span class="value">' +
                                        timeStr +
                                    '</span></div>';
                xcTooltip.remove($dagTable.find(".dagTableIcon, .dataStoreIcon"));
            } else {
                noProgressInfo = true;
                $barWrap.remove();
            }
            // skew info
            const skewInfo = getSkewInfo(nodes[i]);
            const skewText= skewInfo.text;
            const skewColor = skewInfo.color;
            let colorStyle = "";
            if (skewColor) {
                colorStyle = "color:" + skewColor;
            }
            progressInfo += '<div class="skew">'+
                    '<span class="label">' +
                        'skew' +
                    ':</span>' +
                    '<span class="value" style="' + colorStyle + '">' +
                        skewText +
                    '</span>' +
            '</div></div>';
            if (!noProgressInfo) {
                $dagTable.append(progressInfo);
                $dagTable.find(".progressInfo").data("skewInfo", skewInfo);
                $dagTable.addClass("hasProgress");
            }
        }
        var pct;
        if (isComplete) {
            pct = 1;
        } else {
            pct = numCompleted / nodes.length;
        }

        $dagWrap.data({
            pct: pct,
            curoppct: curOpPct,
            optime: cumulativeOpTime,
            numcompleted: numCompleted
        });
    }

    function getSkewInfo(node) {
        const rows = node.numRowsPerNode.map(numRows => numRows);
        const skew = getSkewValue(node);
        const skewText = getSkewText(skew);
        const skewColor = getSkewColor(skewText);
        return {
            name: node.name.name,
            value: skew,
            text: skewText,
            color: skewColor,
            rows: rows,
            totalRows: node.numRowsTotal,
            size: node.inputSize
        };
    }

    function getSkewText(skew) {
        return isInValidSkew(skew) ? "N/A" : String(skew);
    }

    function isInValidSkew(skew) {
        return (skew == null || isNaN(skew));
    }

    function getSkewValue(node) {
        var skewness = null;
        var rows = node.numRowsPerNode.map(numRows => numRows);
        var len = rows.length;
        var even = 1 / len;
        var total = rows.reduce(function(sum, value) {
            return sum + value;
        }, 0);
        if (total === 1) {
            // 1 row has no skewness
            skewness = 0;
        } else {
            // change to percantage
            rows = rows.map(function(row) {
                return row / total;
            });

            skewness = rows.reduce(function(sum, value) {
                return sum + Math.abs(value - even);
            }, 0);

            skewness = Math.floor(skewness * 100);
        }
        return skewness;
    }

    function getSkewColor(skew) {

        if (skew === "N/A") {
            return "";
        }
        skew = Number(skew);
        /*
            0: hsl(104, 100%, 33)
            25%: hsl(50, 100%, 33)
            >= 50%: hsl(0, 100%, 33%)
        */
        let h = 104;
        if (skew <= 25) {
            h = 104 - 54 / 25 * skew;
        } else if (skew <= 50) {
            h = 50 - 2 * (skew - 25);
        } else {
            h = 0;
        }
        return 'hsl(' + h + ', 100%, 33%)';
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

    function endStatusCheck(retName, updateStatus, isComplete, continuing) {
        if (!retinasInProgress[retName]) {
            return;
        }

        delete retinasInProgress[retName];

        var $dagWrap = getDagWrap(retName);
        $dagWrap.removeClass("inProgress");


        if (isComplete) {
            xcTooltip.remove($dagWrap.find(".dagTableIcon, .dataStoreIcon"));
        }

        if (updateStatus) {
            getAndUpdateRetinaStatuses(retName, false, isComplete);
        }

        if (continuing) {
            var $btn = $dagWrap.find(".runNowBtn");
            $btn.removeClass("running canceling");
            xcTooltip.changeText($btn, DFTStr.Run);
            delete canceledRuns[retName];
            if (isComplete) {
                showDonePopup(retName);
            }
        }
    }

    function showDonePopup(retName) {
        // var $numDatastores = $("#datastoreMenu .numDataStores:not(.tutor)");
        // var numDatastores = parseInt($numDatastores.text());
        var msg = DFTStr.RunDone + ": " + retName;

        var $tab = $('#dataflowTab');
        var left = $tab.offset().left + $tab.outerWidth() + 7;
        var top = $tab.offset().top + 2;
        var $popup =
                $('<div class="tableDonePopupWrap" ' +
                    'style="top:' + top + 'px;left:' + left + 'px;">' +
                    '<div class="tableDonePopup datastoreNotify">' +
                    msg +
                    '<div class="close">+</div></div></div>');

        $("body").append($popup);
        $popup.find(".tableDonePopup").fadeIn(300);

        $popup.click(function() {
            $popup.remove();
        });
    }

    DFCard.cancelDF = function(retName, txId) {
        var deferred = PromiseHelper.deferred();

        var $dagWrap = getDagWrap(retName);
        var $btn = $dagWrap.find(".runNowBtn");
        if ($btn.hasClass("canceling")) {
            deferred.resolve();
            return deferred.promise();
        }
        $btn.addClass('canceling');
        xcTooltip.changeText($btn, StatusMessageTStr.Canceling);
        xcTooltip.refresh($btn);
        canceledRuns[retName] = true;

        if (txId) {
            QueryManager.cancelQuery(txId);
        }

        XcalarQueryCancel(retName)
        .then(deferred.resolve)
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
    };

    function getDagWrap(dataflowName) {
        return $("#dataflowPanel").find('.dagWrap[data-dataflowName="' +
                                        dataflowName + '"]');
    }

    function parseFileName(exportStruct, paramArray) {
        var fileName = exportStruct.fileName;
        if (paramArray.length === 0 || fileName.indexOf("<") === -1) {
            return fileName;
        }

        for (var i = 0; i < paramArray.length; i++) {
            var name = xcHelper.escapeRegExp(paramArray[i].paramName);
            var re = new RegExp("<" + name + ">", "g");
            fileName = fileName.replace(re, paramArray[i].paramValue);
        }

        return fileName;
    }

    function addTableToWS(tableName, exportStruct, txId) {
        var deferred = PromiseHelper.deferred();
        var worksheet = WSManager.getActiveWS();
        var metaCols = [];
        if (exportStruct && exportStruct.columns) {
            metaCols = exportStruct.columns;
        }

        var colNames = metaCols.map(function(colInfo) {
            var colName = colInfo.headerName;
            var parsedInfo = xcHelper.parsePrefixColName(colName);
            var prefix = parsedInfo.prefix;
            if (prefix) {
                colName = xcHelper.convertPrefixName(prefix, parsedInfo.name);
            }
            colName = xcHelper.escapeColName(colName);
            return colName;
        });

        var tableCols = getProgCols(colNames);

        TblManager.refreshTable([tableName], tableCols, [], worksheet, txId)
        .then(function() {
            deferred.resolve(tableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getProgCols(colNames) {
        var progCols = colNames.map(function(colName) {
            return ColManager.newPullCol(colName);
        });

        progCols.push(ColManager.newDATACol());
        return progCols;
    }

    // returns promise with boolean True if duplicate found
    function checkExistingFileName(fileName, targetName, targetType) {
        var deferred = PromiseHelper.deferred();
        var extensionDotIndex = fileName.lastIndexOf(".");
        if (extensionDotIndex > 0) {
            fileName = fileName.slice(0, extensionDotIndex);
        } else {
            return PromiseHelper.reject(DFTStr.NoFileExt);
        }

        XcalarListExportTargets(ExTargetTypeTStr[targetType], targetName)
        .then(function(ret) {
            if (ret.numTargets === 1) {
                var url = (ret.targets[0].specificInput.sfInput && ret.targets[0].specificInput.sfInput.url) ||
                          (ret.targets[0].specificInput.udfInput && ret.targets[0].specificInput.udfInput.url);
                XcalarListFiles({
                    targetName: gDefaultSharedRoot,
                    path: url
                })
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
        .fail(deferred.resolve);

        return deferred.promise();
    }

    function showLicenseTooltip(elem) {
        xcTooltip.add($(elem), {"title": TooltipTStr.OnlyInOpMode});
        xcTooltip.refresh($(elem));
        console.log("Wrong license type");
    }

    // only called if UI does not have any cache of parameters, this happens
    // when a batch dataflow is uploaded or if it's a brand new dataflow
    function restoreParameterizedNodes(dataflowName) {
        var df = DF.getDataflow(dataflowName);
        for (var tName in df.retinaNodes) {
            var node = df.retinaNodes[tName];
            var struct = node.args;
            var type = XcalarApisT[node.operation];

            if (isParameterized(struct)) {
                var val = {
                    "paramType": type,
                    "paramValue": struct
                };
                // oldinfo is same as newinfo since we don't have hold info
                df.addParameterizedNode(tName, val, val);
            }
        }
    }

    function isParameterized(value) {
        if (!value) {
            return false;
        }
        if (typeof value !== "object") {
            if (typeof value === "string") {
                var openIndex = value.indexOf("<");
                if (openIndex > -1 && value.lastIndexOf(">") > openIndex) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            if ($.isEmptyObject(value)) {
                return false;
            }
            if (value.constructor === Array) {
                for (var i = 0; i < value.length; i++) {
                    if (isParameterized(value[i])) {
                        return true;
                    }
                }
            } else {
                for (var i in value) {
                    if (!value.hasOwnProperty(i)) {
                        continue;
                    }
                    if (isParameterized(value[i])) {
                        return true;
                    }
                }
            }
            return false;
        }
    }

    function focusOnDF(dataflowName) {
        var deferred = PromiseHelper.deferred();
        currentDataflow = dataflowName;
        $header.text(dataflowName);

        $dfView.find(".dagWrap").addClass('xc-hidden');

        var df = DF.getDataflow(dataflowName);
        var promise;
        var html;
        var $dagWrap = getDagWrap(dataflowName);

        if (!$dagWrap.length && (!df || !df.nodes || $.isEmptyObject(df.nodes)) ||
            df && $.isEmptyObject(df.retinaNodes)) {
            promise = DF.updateDF(dataflowName);
            html = '<div class="dagWrap clearfix" ' +
                       'data-dataflowName="' + dataflowName + '"></div>';
            $dfCard.find(".cardMain").append(html);
            $dagWrap = getDagWrap(dataflowName);
            xcHelper.showRefreshIcon($dagWrap, false, promise);
        } else {
            promise = PromiseHelper.resolve();
            $dagWrap = getDagWrap(dataflowName);
            if (!$dagWrap.length) {
                html = '<div class="dagWrap clearfix" ' +
                       'data-dataflowName="' + dataflowName + '"></div>';
                $dfCard.find(".cardMain").append(html);
            }
        }
        $dagWrap.removeClass("xc-hidden");

        if (DF.hasSchedule(dataflowName)) {
            Scheduler.show(dataflowName);
            $dfCard.addClass("withSchedule");
        } else {
            Scheduler.hide();
            $dfCard.removeClass("withSchedule");
        }
        DFCard.adjustScrollBarPositionAndSize();

        promise
        .then(function() {
            var $dagWrap = getDagWrap(dataflowName);
            if (!df || $.isEmptyObject(df.retinaNodes) ||
                ($.isEmptyObject(df.nodes) && !$dagWrap.length) ||
                !$dagWrap.length ||
                $dagWrap.hasClass("error")) {
                return; // may have gotten cleared
            }
            if (!$dagWrap.find(".dagImage").length) {
                var dataflow = DF.getDataflow(dataflowName);
                var nodes = dataflow.nodes;
                // first time creating image
                drawDF(dataflowName);
                $dagWrap = getDagWrap(dataflowName);
                $dagWrap.removeClass("xc-hidden");
                var width = $dagWrap.find('canvas').attr('width');
                $dagWrap.find('.dagImageWrap').scrollLeft(width);
            }

            if (dataflowName === currentDataflow) {
                $dagWrap.removeClass("xc-hidden");
                // DFParamTab.updateRetinaTab(dataflowName);
                enableDagTooltips();
            } else {
                $dagWrap.addClass("xc-hidden");
            }
        })
        .fail(function() {
            var $dagWrap = getDagWrap(dataflowName);
            if ($dagWrap.length && !$dagWrap.find(".dagImage").length) {
                $dagWrap.addClass("error invalid");
                var dagImageHtml = '<div class="errorMsg">' +
                                    DFTStr.DFDrawError + '</div>';
                $dagWrap.html(dagImageHtml);
            }
            console.error(arguments);
        })
        .always(function() {
            var $dagWrap = getDagWrap(dataflowName);
            if (df && $.isEmptyObject(df.parameterizedNodes) &&
                !$dagWrap.hasClass("error") && $dagWrap.length) {
                restoreParameterizedNodes(dataflowName);
            }
            DFCard.adjustScrollBarPositionAndSize();
            deferred.resolve();
        });
        return deferred.promise();
    }

    function setupScrollBar() {
        var winHeight;
        var isScrolling = false;
        var scrollingTimeout;

        $dfView.scroll(function() {
            if (!isScrolling) {
                isScrolling = true;
                winHeight = $(window).height();
            }
            clearInterval(scrollingTimeout);
            scrollingTimeout = setTimeout(function() {
                isScrolling = false;
            }, 300);

           adjustScrollBarPositionAndSize();
        });

        var $dagImageWrap;
        var isBarScrolling = false;
        var barScrollTimeout;
        $scrollBarWrap.scroll(function() {
            if (!isBarScrolling) {
                isBarScrolling = true;
                $dagImageWrap = $dfCard.find(".dagImageWrap:visible");
            }

            if (gMouseEvents.getLastMouseDownTarget().hasClass("dfScrollBar")) {
                var scrollLeft = $(this).scrollLeft();
                $dagImageWrap.scrollLeft(scrollLeft);
            }
            clearInterval(barScrollTimeout);
            barScrollTimeout = setTimeout(function() {
                isBarScrolling = false;
            }, 300);
        });

        var wheeling = false;
        var wheelTimeout;
        $scrollBarWrap.on('mousewheel', function() {
            if (!wheeling) {
                wheeling = true;
                gMouseEvents.setMouseDownTarget($(this));
            }
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(function() {
                wheeling = false;
            }, 100);
        });
    }

    function adjustScrollBarPositionAndSize() {
        var panelRect = $dfView[0].getBoundingClientRect();
        var cardRect = $dfCard[0].getBoundingClientRect();
        if (cardRect.top + 100 < panelRect.bottom &&
            cardRect.bottom > panelRect.bottom) {
            var $dagWrap = $dfCard.find(".dagWrap:visible");
            var $dagImageWrap = $dagWrap.find(".dagImageWrap");
            if (!$dagWrap.length || !$dagImageWrap.length) {
                $scrollBarWrap.hide();
                return;
            }

            var dagImageWidth = $dagImageWrap.outerWidth();
            var scrollWidth = $dagImageWrap[0].scrollWidth;
            if (scrollWidth > dagImageWidth) {
                var scrollLeft = $dagImageWrap.scrollLeft();
                $scrollBarWrap.show().find('.sizer').width(scrollWidth);
                $scrollBarWrap.scrollLeft(scrollLeft);
            } else {
                $scrollBarWrap.hide();
            }
        } else {
            $scrollBarWrap.hide();
        }
    }

    function updateToLatest() {
        var df = DF.getDataflow(currentDataflow);
        var deferred = PromiseHelper.deferred();

        var promises = [];

        var tableNames = [];
        var params = [];
        for (tableName in df["retinaNodes"]) {
            var node = df["retinaNodes"][tableName];
            if (node.operation == "XcalarApiSelect") {
                var args = xcHelper.deepCopy(node.args);
                if (node.args.maxBatchId != -1 || node.args.minBatchId != -1) {
                    args.maxBatchId = -1;
                    args.minBatchId = -1;

                    tableNames.push(args.dest);
                    params.push(args);
                }
            }
        }

        if (tableNames.length) {
            XcalarUpdateRetina(currentDataflow, tableNames, params)
            .then(function() {
                tableNames.forEach(function(name) {
                    var node = df["retinaNodes"][name];
                    node.args.maxBatchId = -1;
                    node.args.minBatchId = -1;
                });
                DF.commitAndBroadCast(currentDataflow);
                deferred.resolve(tableNames);
            })
            .fail(function(error) {
                deferred.reject(error);
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    DFCard.adjustScrollBarPositionAndSize = adjustScrollBarPositionAndSize;

    /* Unit Test Only */
    if (window.unitTestMode) {
        DFCard.__testOnly__ = {};
        DFCard.__testOnly__.deleteDataflow = deleteDataflow;
        DFCard.__testOnly__.runDF = runDF;
        DFCard.__testOnly__.retinasInProgress = retinasInProgress;
        DFCard.__testOnly__.startStatusCheck = startStatusCheck;
        DFCard.__testOnly__.endStatusCheck = endStatusCheck;
        DFCard.__testOnly__.showExportCols = showExportCols;
        DFCard.__testOnly__.parseFileName = parseFileName;
        DFCard.__testOnly__.applyDeltaTagsToDag = applyDeltaTagsToDag;
        DFCard.__testOnly__.restoreParameterizedNode = restoreParameterizedNodes;
        DFCard.__testOnly__.setCanceledRun = function(run) {
            canceledRuns = {};
            canceledRuns[run] = true;
        };
    }
    /* End Of Unit Test Only */

    return (DFCard);

}(jQuery, {}));
