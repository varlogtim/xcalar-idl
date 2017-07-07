window.DFCard = (function($, DFCard) {
    var $dfView;       // $('#dataflowView');
    var $dfCard;       // $('#dfViz');
    var $dfMenu;       // $('#dfMenu').find('.dfList');
    var $listSection;   // $dfMenu.find('.listSection');
    var $header;        // $dfCard.find('.cardHeader h2');
    var $retTabSection; // $dfCard.find('.retTabSection');
    var $retLists;      // $("#retLists");
    var canceledRuns = {};
    var xdpMode = XcalarMode.Mod;
    var retinaCheckInterval = 2000;
    var retinasInProgress = {};

    var retinaTrLen = 5;
    var retinaTr = '<div class="row unfilled">' +
                        '<div class="cell paramNameWrap textOverflowOneLine">' +
                            '<div class="paramName textOverflowOneLine"></div>' +
                        '</div>' +
                        '<div class="cell paramValWrap textOverflowOneLine">' +
                            '<input class="paramVal" spellcheck="false"/>' +
                        '</div>' +
                        '<div class="cell paramNoValueWrap">' +
                            '<div class="checkbox">' +
                                '<i class="icon xi-ckbox-empty fa-15"></i>' +
                                '<i class="icon xi-ckbox-selected fa-15"></i>' +
                            '</div>' +
                        '</div>' +
                        '<div class="cell paramActionWrap">' +
                            '<i class="paramDelete icon xi-close fa-15 xc-action">' +
                            '</i>' +
                        '</div>' +
                   '</div>';

    var currentDataflow = null;
    var dagStateClasses = "";

    DFCard.setup = function() {
        $dfView = $('#dataflowView');
        $dfCard = $('#dfViz');
        $dfMenu = $('#dfMenu').find('.dfList');
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
    };

    DFCard.addDFToList = function(dataflowName) {
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
        var $dataflowLi = DFCard.getDFList(dataflowName).find(".listBox");
        $dataflowLi.addClass('selected');
        focusOnDF(dataflowName);
    };

    DFCard.getDFList = function(dataflowName) {
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

    DFCard.refreshDFList = function(clear, noFocus) {
        if (clear) {
            $dfCard.find('.cardMain').empty();
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
            return;
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
            return;
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
                $df.trigger('click');
            }
        }
        if (!activeFound && !$("#dataflowTab").hasClass("firstTouch")) {
            DFCard.focusFirstDF();
        }
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

        var df = DF.getDataflow(retName);
        var paramMap = df.paramMap;

        df.parameters.forEach(function(paramName) {
            if (!systemParams.hasOwnProperty(paramName)) {
                addParamToRetina(paramName, paramMap[paramName]);
            }
        });

        $retTabSection.removeClass("hidden");
    };

    DFCard.focusFirstDF = function() {
        $dfMenu.find('.listBox').eq(0).trigger('click');
    };

    DFCard.getPct = function(dfName) {
        var $dagWrap = getDagWrap(dfName);
        if ($dagWrap.data("pct")) {
            return $dagWrap.data("pct");
        } else {
            return 0;
        }
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
            $row.find(".paramVal").val(val);
            if (val === "") {
                $row.find(".checkbox").addClass("checked");
            }
        }

        $row.removeClass("unfilled");
    }

    function deleteParamFromRetina($row) {
        var $paramName = $row.find(".paramName");
        var paramName = $paramName.text();
        var df = DF.getDataflow(currentDataflow);

        if (df.checkParamInUse(paramName)) {
            StatusBox.show(ErrTStr.ParamInUse, $paramName);
            return;
        }

        $row.remove();
        if ($retLists.find(".row").length < retinaTrLen) {
            $retLists.append(retinaTr);
        }

        df.removeParameter(paramName);
    }

    function setupRetinaTab() {
        $(".tabWrap").addClass(xdpMode);
        // Remove focus when click other places other than retinaArea
        // add new retina
        $retTabSection.on('click', '.retPopUp', function(event){
            event.stopPropagation();
        });

        // toggle open retina pop up
        $retTabSection.on('click', '.retTab', function() {
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }
            $('.menu').hide();
            StatusBox.forceHide();
            var $dagWrap = $dfCard.find('.cardMain').find(".dagWrap:visible");
            if (!$dagWrap.length) {
                return;
            }
            if ($dagWrap.hasClass("deleting")) {
                return;
            }
            var $tab = $(this);
            if ($tab.hasClass('active')) {
                // close it tab
                saveParam(currentDataflow);
                closeRetTab();
                $tab.removeClass('active');
            } else {
                // open tab
                DFCard.updateRetinaTab(DFCard.getCurrentDF());
                $tab.addClass('active');
                focusOnFirstInvalidValue(currentDataflow);

                $("#container").on("mousedown", function(event) {
                    var $target = $(event.target);
                    if ($target.closest('#statusBox').length
                        || $target.closest('.retPopUp').length
                        || $target.closest('.retTab').length) {
                        event.stopPropagation();
                        return;
                    } else {
                        saveParam(currentDataflow);
                        closeRetTab();
                        if ($target.closest(".advancedOpts").length === 0) {
                            $dfCard.find(".advancedOpts.active").removeClass("active");
                        }
                        $("#container").off("mousedown");
                    }
                });
            }
        });

        $retTabSection.on('click', '.checkbox', function() {
            var $checkbox = $(this);
            $checkbox.toggleClass("checked");
            saveParam(currentDataflow);
            StatusBox.forceHide();
            if ($checkbox.hasClass("checked")) {
                // remove value from input if click on "no value" box
                $checkbox.closest(".row").find(".paramVal").val("");
                $checkbox.closest(".row").find(".paramVal").blur();
            }
        });

        $retTabSection.on("input", ".paramVal", function() {
            // remove "no value" check if the input has text
            $(this).closest(".row").find(".checkbox").removeClass("checked");
        });

        $retTabSection.on("keypress", ".paramVal", function(event) {
            if (event.which === keyCode.Enter) {
                saveParam(currentDataflow);
                focusOnFirstInvalidValue(currentDataflow);
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
            var $btn = $(this).blur();
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

            var text;
            if (isNameConflict) {
                text = xcHelper.replaceMsg(ErrWRepTStr.ParamConflict, {
                    "name": paramName
                });
                StatusBox.show(text, $input);
                return;
            }
            if (systemParams.hasOwnProperty(paramName)) {
                text = xcHelper.replaceMsg(ErrWRepTStr.SystemParamConflict, {
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
            var $row = $(this).closest(".row");
            var name = $row.find(".paramName").text();
            var df = DF.getDataflow(DFCard.getCurrentDF());
            if (df.paramMapInUsed[name]) {
                StatusBox.show(ErrTStr.InUsedNoDelete,
                    $row.find(".paramActionWrap"), false, {'side': 'left'});
                return false;
            }
            deleteParamFromRetina($row);
        });
    }

    function addListeners() {
        $dfMenu.on('click', '.refreshBtn', function() {
            var $section = $("#dfMenu .dfList");
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
                    DF.refresh(ephMetaInfos.getDFMeta());
                }
            })
            .always(function() {
                $section.removeClass("disabled");
            });
        });

        $listSection.on('click', '.dataFlowGroup', function() {
            var $df = $(this);
            var $dataflowLi = $df.find('.listBox');
            if ($dataflowLi.hasClass('selected')) {
                return;
            }
            $listSection.find('.listBox').removeClass('selected');
            $dataflowLi.addClass('selected');

            var dataflowName = $dataflowLi.find('.groupName').text();
            focusOnDF(dataflowName);
        });

        $listSection.on('click', '.downloadDataflow', function() {
            var dfName = $(this).siblings('.groupName').text();
            Support.downloadLRQ(dfName);
            // XXX: Show something when the download has started
        });

        $listSection.on('click', '.deleteDataflow', function() {
            var dfName = $(this).siblings('.groupName').text();
            Alert.show({
                'title': DFTStr.DelDF,
                'msg': DFTStr.DelDFMsg,
                'onConfirm': function() {
                    deleteDataflow(dfName);
                }
            });
        });

        $dfCard.on('click', '.addScheduleToDataflow', function() {
            $(this).blur();
            // doesn't have schedule, show schedule
            var dfName = $listSection.find(".selected .groupName").text();
            var df = DF.getDataflow(dfName);
            if (df.allUsedParamsWithValues()) {
                xcTooltip.hideAll();
                Scheduler.show(dfName);
            } else {
                Alert.show({
                    "title": DFTStr.AddValues,
                    "msg": DFTStr.ParamNoValue,
                    "isAlert": true,
                    "onCancel": function() {
                        $dfCard.find('.retTabSection .retTab').trigger('mousedown');
                    }
                });
            }
        });

        $('#uploadDataflowButton').click(function() {
            UploadDataflowCard.show();
        });

        $dfCard.on("click", ".runNowBtn", function() {
            if (xdpMode === XcalarMode.Mod) {
                return showLicenseTooltip(this);
            }
            var $btn = $(this).blur();
            var retName = $listSection.find(".selected .groupName").text();
            var df = DF.getDataflow(retName);
            if (df.allUsedParamsWithValues()) {
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

                    runDF(retName)
                    .always(function() {
                        delete canceledRuns[retName];
                        $btn.removeClass("running canceling");
                        xcTooltip.changeText($btn, DFTStr.Run);
                    });
                }
            } else {
                Alert.show({
                    "title": DFTStr.AddValues,
                    "msg": DFTStr.ParamNoValue,
                    "isAlert": true,
                    "onCancel": function() {
                        $dfCard.find('.retTabSection .retTab').trigger('mousedown');
                    }
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

    function deleteDataflow(dfName) {
        var deferred = jQuery.Deferred();
        var $card = $dfCard.find('.dagWrap[data-dataflowName="' + dfName + '"]');
        var $list = DFCard.getDFList(dfName);
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
            // show success msg first and the do clean
            xcHelper.showSuccess(SuccessTStr.RmDF);
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
        var deferred = jQuery.Deferred();
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
        var $dagWrap = getDagWrap(dataflowName);
        $dagWrap.remove();
        $dfCard.find('.cardMain').append(html);

        if (XVM.getLicenseMode() === XcalarMode.Demo) {
            xcHelper.disableMenuItem($dfCard
                                 .find(".advancedOpts [data-option='default']"),
                                          {"title": TooltipTStr.NotInDemoMode});
        }

        var nodes = DF.getDataflow(dataflowName).retinaNodes;
        $dagWrap = getDagWrap(dataflowName);
        Dag.createDagImage(nodes, $dagWrap);

        var promise = applyDeltaTagsToDag(dataflowName, $dagWrap);

        xcHelper.showRefreshIcon($dagWrap, false, promise);
        promise
        .then(deferred.resolve)
        .fail(deferred.reject);

        Dag.addDagEventListeners($dagWrap);
        xcHelper.optionButtonEvent($dfCard.find(".advancedOpts"),
            function(selOption, $selRadioButton) {
                var $dagNode = getDagWrap(dataflowName)
                               .find(".dagTable.export");
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

        return deferred.promise();
    }

    function applyDeltaTagsToDag(dataflowName, $wrap) {
        var deferred = jQuery.Deferred();
        // This function adds the different tags between a regular dag
        // and a retina dag. For example, it colors parameterized nodes.
        // It also adds extra classes to the dag that is needed for parameteri-
        // zation later.
        var $exportTable = $wrap.find(".export.dagTable");
        var exportId = $exportTable.attr("data-nodeid");

        var dataflow = DF.getDataflow(dataflowName);
        var retNodes = dataflow.retinaNodes;
        var paramValue = '';
        var i = 0;
        for (i = 0; i < retNodes.length; i++) {
            if (retNodes[i].dagNodeId === exportId) {
                var meta = retNodes[i].input.exportInput.meta;
                var specInput = meta.specificInput;
                var fileName = specInput.sfInput.fileName ||
                             specInput.udfInput.fileName; // Only one of the
                             // 3 should have a non "" value
                             //xx specInput.odbcInput.tableName no longer exists
                paramValue = [fileName, meta.target.name, meta.target.type];
                // uploaded retinas do not have params in export node
            }
        }

        $exportTable.addClass("export").data("type", "export")
                    .attr("data-table", $exportTable.attr("data-tablename"))
                    .data("paramValue", paramValue)
                    .attr("data-advancedOpts", "default");

        var $elem = $exportTable.find(".tableTitle");
        var expName = xcHelper.stripCSVExt(paramValue[0]);
        $elem.text(expName);
        xcTooltip.changeText($elem, xcHelper.convertToHtmlEntity(expName));

        // Data table moved so that the hasParam class is added correctly
        $wrap.find(".actionType.export").attr("data-table", "");

        // Add data-paramValue tags to all parameterizable nodes
        var $loadNodes = $wrap.find(".dagTable.dataStore");
        $loadNodes.each(function(idx, val) {
            var $val = $(val);
            var paramValue = [decodeURI($val.data("url")),
                              decodeURI($val.data("pattern"))];
            $val.data("paramValue", paramValue);
        });

        var $opNodes = $wrap.find(".actionType.dropdownBox");
        $opNodes.each(function(idx, val) {
            var $op = $(val);
            $op.data("paramValue", [$op.attr("data-info")]);
        });

        var selector = '.dagTable.export, .dagTable.dataStore, ' +
                       '.actionType.filter';
        // Attach styling to all nodes that have a dropdown
        $dfCard.find(selector).addClass("parameterizable");

        for (var nodeId in dataflow.parameterizedNodes) {
            var $tables = $wrap.find('[data-nodeid="' + nodeId + '"]');
            if ($tables.prev().hasClass("filter")) {
                $tables = $tables.prev();
            }
            var paramVal = $tables.data("paramValue");

            if (isParameterized(paramVal)) {
                var $tableNode = dataflow.colorNodes(nodeId);
                var type = dataflow.parameterizedNodes[nodeId]
                               .paramType;
                if (type === XcalarApisT.XcalarApiFilter) {
                    $tableNode.find(".parentsTitle")
                              .text("<Parameterized>");
                }
            }
        }

        var ignoreNoExist = true;

        getAndUpdateRetinaStatuses(dataflowName, ignoreNoExist)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function enableDagTooltips() {
        var $tooltipTables = $dfCard.find('.dagTableIcon');
        xcTooltip.disable($tooltipTables);
        var selector;
        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            selector = '.export .dagTableIcon';
        } else {
            selector = '.dataStoreIcon, ' +
                        '.export .dagTableIcon, .actionType.filter';
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
            } else if ($(e.target).closest(".dagImageWrap").length) {
                showRightClickOption(e);
                e.preventDefault();
                e.stopPropagation();
            }
        };

        var selector = '.dagTable.export, .dagTable.dataStore,' +
                       ' .actionType.filter';

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

            $menu.find("li").hide();
            var $queryLi = $menu.find(".createParamQuery");

            if (XVM.getLicenseMode() !== XcalarMode.Mod) {
                $queryLi.show();
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

            var menuBottom = $menu[0].getBoundingClientRect().bottom;
            if (menuBottom > $(window).height()) {
                $menu.css('top', '-=' + $menu.height());
            }
            xcMenu.addKeyboardNavigation($menu);
        }
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

    function runDF(retName) {
        var deferred = jQuery.Deferred();
        var cancelErr = "canceled";

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
        var targetType = exportInfo.meta.target.type;
        var fileName = parseFileName(exportInfo, paramsArray);
        var advancedOpts = getAdvancedExportOption(retName);
        if (advancedOpts == null) {
            // error case
            return PromiseHelper.reject();
        }

        var txId = Transaction.start({
            "operation": SQLOps.Retina,
            "sql": SQLOps.Retina,
            "steps": -1
        });
        var $dagWrap = getDagWrap(retName);
        $dagWrap.data("txid", txId);

        var passedCheckBeforeRunDF = false;
        checkBeforeRunDF(advancedOpts.activeSession)
        .then(function() {
            return checkIfHasSystemParam(retName);
        })
        .then(function(hasSysParam) {
            return alertBeforeRunDF(hasSysParam, advancedOpts.activeSession);
        })
        .then(function() {
            passedCheckBeforeRunDF = true;
            var promise = XcalarExecuteRetina(retName, paramsArray,
                                              advancedOpts, txId);
            startStatusCheck(retName);

            return promise;
        })
        .then(function() {
            endStatusCheck(retName, passedCheckBeforeRunDF, true);
            if (advancedOpts.activeSession) {
                return projectAfterRunDF(advancedOpts.newTableName, exportInfo,
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
                        MainMenu.openPanel("workspacePanel", null, {
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

            Transaction.fail(txId, {
                "error": error,
                "noAlert": true
            });

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

        function alertBeforeRunDF(hasSysParam, isToActiveSession) {
            if (!hasSysParam && !isToActiveSession) {
                return PromiseHelper.resolve();
            }

            var deferred = jQuery.Deferred();
            var msgArray = [];

            if (hasSysParam) {
                msgArray.push(DFTStr.WarnSysParam);
            }

            if (isToActiveSession) {
                msgArray.push(DFTStr.WarnInMemTable);
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

    function checkIfHasSystemParam(retName) {
        var deferred = jQuery.Deferred();
        XcalarListParametersInRetina(retName)
        .then(function(res) {
            var length = res.numParameters;
            var parameters = res.parameters;
            var hasSysParam = false;
            for (var i = 0; i < length; i++) {
                var paramName = parameters[i].parameterName;
                if (systemParams.hasOwnProperty(paramName)) {
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

    function startStatusCheck(retName) {
        retinasInProgress[retName] = true;
        var $dagWrap = getDagWrap(retName);
        $dagWrap.addClass("inProgress");
        var createdState = DgDagStateTStr[DgDagStateT.DgDagStateCreated];
        $dagWrap.find('.dagTable').removeClass(dagStateClasses)
                                  .addClass(createdState);
        $dagWrap.data("pct", 0);
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
            getAndUpdateRetinaStatuses(retName, false)
            .always(function() {
                statusCheckInterval(retName);
            });

        }, checkTime);
    }

    function getAndUpdateRetinaStatuses(retName, ignoreNoExist, isComplete) {
        var deferred = jQuery.Deferred();
        var statusesToIgnore;
        if (ignoreNoExist) {
            statusesToIgnore = [StatusT.StatusQrQueryNotExist];
        }

        XcalarQueryState(retName, statusesToIgnore)
        .then(function(retInfo) {
            updateRetinaPctAndColors(retName, retInfo, isComplete);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function updateRetinaPctAndColors(retName, retInfo, isComplete) {
        var $dagWrap = getDagWrap(retName);
        var nodes = retInfo.queryGraph.node;
        var tableName;
        var state;
        var numCompleted = 0;
        var $dagTable;
        var progressBar = '<div class="progressBarWrap" data-pct="0">' +
                            '<div class="progressBar"></div>' +
                         '</div>';
        var progressInfo;
        for (var i = 0; i < nodes.length; i++) {
            tableName = getTableNameFromStatus(nodes[i]);
            state = DgDagStateTStr[nodes[i].state];
            $dagTable = $dagWrap.find('.dagTable[data-tablename="' + tableName +
                                      '"]');
            $dagTable.find(".progressInfo").remove();
            progressInfo = "";
            $dagTable.removeClass(dagStateClasses).addClass(state);
            var $barWrap = $dagTable.find(".progressBarWrap");
            var time = nodes[i].elapsed.milliseconds;
            time = xcHelper.getElapsedTimeStr(time);
            if (nodes[i].state === DgDagStateT.DgDagStateReady) {
                numCompleted++;
                progressInfo = '<div class="progressInfo" >' +
                                    '<div class="rows"><span class="label">' +
                                        CommonTxtTstr.rows +
                                        ':</span><span class="value">' +
                                    xcHelper.numToStr(nodes[i].numRowsTotal) +
                                        '</span></div>' +
                                    '<div class="time"><span class="label">' +
                                        CommonTxtTstr.time +
                                     ':</span><span class="value">' + time +
                                     '</span></div>' +
                                 '</div>';
                xcTooltip.remove($dagTable.find(".dagTableIcon, .dataStoreIcon"));
                $barWrap.remove();
            } else if (nodes[i].state === DgDagStateT.DgDagStateProcessing) {
                if (!$barWrap.length) {
                    $dagTable.append(progressBar);
                    $barWrap = $dagTable.find(".progressBarWrap");
                }
                var nodePct = Math.round(100 * nodes[i].numWorkCompleted /
                                     nodes[i].numWorkTotal);
                if (isNaN(nodePct)) {
                    nodePct = 0;
                }
                var lastPct = $barWrap.data("pct");
                if (nodePct && nodePct !== lastPct) {
                    $barWrap.find(".progressBar").animate(
                                                    {"width": nodePct + "%"},
                                                    retinaCheckInterval,
                                                    "linear");
                    $barWrap.data("pct", nodePct);
                }
                progressInfo = '<div class="progressInfo" >' +
                                    '<div class="pct"><span class="pct">'
                                        + nodePct + '%</span></div>' +
                                    '<div class="time"><span class="label">' +
                                        CommonTxtTstr.time +
                                        ':</span><span class="value">' + time +
                                    '</span></div>' +
                                 '</div>';
                xcTooltip.remove($dagTable.find(".dagTableIcon, .dataStoreIcon"));
            } else {
                $barWrap.remove();
            }
            $dagTable.append(progressInfo);
        }
        var pct;
        if (isComplete) {
            pct = 1;
        } else {
            var numItems = nodes.length + 1; // +1 for the export operation
            pct = numCompleted / numItems;
        }

        $dagWrap.data("pct", pct);
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

    function endStatusCheck(retName, updateStatus, isComplete) {
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
    }

    DFCard.cancelDF = function(retName, txId) {
        var deferred = jQuery.Deferred();

        var $dagWrap = getDagWrap(retName);
        var $btn = $dagWrap.find(".runNowBtn");
        $btn.addClass('canceling');
        xcTooltip.changeText($btn, StatusMessageTStr.Canceling);
        xcTooltip.refresh($btn);
        canceledRuns[retName] = true;

        QueryManager.cancelQuery(txId);

        XcalarQueryCancel(retName, null, true)
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

    function parseFileName(exportInfo, paramArray) {
        var fileName = "";
        if (exportInfo.meta.target.type === ExTargetTypeT.ExTargetSFType) {
            fileName = exportInfo.meta.specificInput.sfInput.fileName;
        } else if (exportInfo.meta.target.type ===
            ExTargetTypeT.ExTargetUDFType) {
            fileName = exportInfo.meta.specificInput.udfInput.fileName;
        }
        if (paramArray.length === 0 || fileName.indexOf("<") === -1) {
            return fileName;
        }

        for (var i = 0; i < paramArray.length; i++) {
            var name = xcHelper.escapeRegExp(paramArray[i].parameterName);
            var re = new RegExp("<" + name + ">", "g");
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

    function projectAfterRunDF(tableName, exportInfo, txId) {
        var deferred = jQuery.Deferred();
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
            colName = xcHelper.escapeColName(colName);
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
            Dag.makeInactive(tableName, true);
            deferred.resolve(dstTableName);
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

    function checkExistingTableName($input) {
        var isValid = xcHelper.tableNameInputChecker($input, {
            "onErr": function() {
                $input.closest(".advancedOpts").addClass("active");
            },
            side: "left"
        });
        return isValid;
    }

    // returns promise with boolean True if duplicate found
    function checkExistingFileName(fileName, targetName, targetType) {
        var deferred = jQuery.Deferred();
        var extensionDotIndex = fileName.lastIndexOf(".");
        if (fileName.includes("/")) {
            return PromiseHelper.reject(DFTStr.InvalidExportPath);
        } else if (extensionDotIndex > 0) {
            fileName = fileName.slice(0, extensionDotIndex);
        } else {
            return PromiseHelper.reject(DFTStr.NoFileExt);
        }

        XcalarListExportTargets(ExTargetTypeTStr[targetType], targetName)
        .then(function(ret) {
            if (ret.numTargets === 1) {
                var url = ret.targets[0].specificInput.sfInput.url ||
                          ret.targets[0].specificInput.udfInput.url;
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

    function saveParam(dataflowName) {
        var df = DF.getDataflow(dataflowName);
        var paramMapInUsed = df.paramMapInUsed;
        var paramMap = df.paramMap;
        var checkRes = paramValueCheck(dataflowName);
        var toUpdate = checkRes.toUpdate;
        var usedParamHasChange = false;
        for (var name in toUpdate) {
            if (paramMap[name] !== toUpdate[name]) {
                paramMap[name] = toUpdate[name];
                if (paramMapInUsed[name]) {
                    usedParamHasChange = true;
                }
            }
        }
        if (usedParamHasChange) {
            if (DF.hasSchedule(dataflowName) && (!checkRes.hasInvalidRow)) {
                DF.updateScheduleForDataflow(dataflowName);
            }
            DF.commitAndBroadCast(dataflowName);
        }
    }

    function focusOnFirstInvalidValue(dataflowName) {
        StatusBox.forceHide();
        var checkRes = paramValueCheck(dataflowName);
        if (checkRes.hasInvalidRow) {
            StatusBox.show(ErrTStr.NoEmptyOrCheck,
                checkRes.firstInvalidVal, false, {'side': 'left'});
            $(checkRes.firstInvalidVal).focus();
        }
    }

    function paramValueCheck(dataflowName) {
        var df = DF.getDataflow(dataflowName);
        var paramMapInUsed = df.paramMapInUsed;
        var hasInvalidRow = false;
        var firstInvalidVal = null;
        var toUpdate = {};
        var checkRes = {};
        $("#retLists").find(".row:not(.unfilled)").each(function() {
            var $row = $(this);
            var name = $row.find(".paramName").text();
            var val = $.trim($row.find(".paramVal").val());
            var check = $row.find(".checkbox").hasClass("checked");
            if (val === "" && (!check) && paramMapInUsed[name] &&
                (!hasInvalidRow)) {
                hasInvalidRow = true;
                firstInvalidVal = $row.find(".paramVal");
            }
            toUpdate[name] = (val === "") ? (check ? "" : null) : val;
        });
        checkRes.hasInvalidRow = hasInvalidRow;
        checkRes.firstInvalidVal = firstInvalidVal;
        checkRes.toUpdate = toUpdate;
        return checkRes;
    }

    function closeRetTab() {
        $retTabSection.find(".retTab").removeClass("active");
        StatusBox.forceHide();
    }

    function restoreParameterizedNode(dataflowName) {
        var df = DF.getDataflow(dataflowName);
        var $dagWrap = $(getDagWrap(dataflowName));
        for (var key in df.nodeIds) {
            var dagNodeId = df.nodeIds[key];
            var $dagNode = $dagWrap.find('[data-nodeid="' + dagNodeId + '"]');
            if ($dagNode.prev().hasClass("filter")) {
                $dagNode = $dagNode.prev();
            }
            var paramVal = $dagNode.data().paramValue;
            var type = $dagNode.data().type;
            // uploaded retinas do not have params in export node / paramVal
            if (isParameterized(paramVal)) {
                var paramType;
                if (type === "filter") {
                    paramType = XcalarApisT.XcalarApiFilter;
                } else if (type === "dataStore") {
                    paramType = XcalarApisT.XcalarApiBulkLoad;
                } else if (type === "export"){
                    paramType = XcalarApisT.XcalarApiExport;
                }

                var val = {
                    "paramType": paramType,
                    "paramValue": paramVal
                };

                var paramInfo = val;
                df.addParameterizedNode(dagNodeId, val, paramInfo);
            }
        }
    }

    function isParameterized(paramValue) {
        if (paramValue !== undefined) {
            for (var i = 0; i < paramValue.length; i++) {
                if (typeof paramValue[i] === 'string'
                    && paramValue[i].indexOf('<') !== -1) {
                    return true;
                }
            }
        }
        return false;
    }

    function focusOnDF(dataflowName) {
        currentDataflow = dataflowName;
        $header.text(dataflowName);

        $dfView.find(".dagWrap").addClass('xc-hidden');

        var df = DF.getDataflow(dataflowName);
        var promise;
        var html;
        var $dagWrap = getDagWrap(dataflowName);
        if ($.isEmptyObject(df.retinaNodes) && !$dagWrap.length) {
            promise = DF.updateDF(dataflowName);
            closeRetTab();
            html = '<div class="dagWrap clearfix" '+
                       'data-dataflowName="' + dataflowName + '"></div>';
            $dfCard.find(".cardMain").append(html);
            $dagWrap = getDagWrap(dataflowName);
            xcHelper.showRefreshIcon($dagWrap, false, promise);
        } else {
            promise = PromiseHelper.resolve();
            $dagWrap = getDagWrap(dataflowName);
            if (!$dagWrap.length) {
                html = '<div class="dagWrap clearfix" '+
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

        promise
        .then(function() {
            var $dagWrap = getDagWrap(dataflowName);
            if ($.isEmptyObject(df.retinaNodes) || !$dagWrap.length) {
                return; // may have gotten cleared
            }
            if (!$dagWrap.find(".dagImage").length) {
                // first time creating image
                drawDF(dataflowName);
                $dagWrap = getDagWrap(dataflowName);
                $dagWrap.removeClass("xc-hidden");
                var width = $dagWrap.find('canvas').attr('width');
                $dagWrap.find('.dagImageWrap').scrollLeft(width);
                if (XVM.getLicenseMode() === XcalarMode.Demo &&
                    dataflowName === currentDataflow) {
                    var $name = $dagWrap.find(".dagTable.export " +
                                             ".exportTableName");
                    var exportName = xcHelper.getTableName($name.text());
                    var $option = $dagWrap.find(".advancedOpts " +
                                                "[data-option='import']");
                    $option.click();
                    $option.find("input").val(exportName);
                    $name.text(exportName);
                    xcTooltip.changeText($name, exportName);
                }
            }

            if (dataflowName === currentDataflow) {
                $dagWrap.removeClass("xc-hidden");
                DFCard.updateRetinaTab(dataflowName);
                enableDagTooltips();
            } else {
                $dagWrap.addClass("xc-hidden");
            }
        })
        .fail(function() {
            console.error(arguments);
        })
        .always(function() {
            if ($.isEmptyObject(df.parameterizedNodes)) {
                restoreParameterizedNode(dataflowName);
            }
        });
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
