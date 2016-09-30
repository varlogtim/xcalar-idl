window.DFGCard = (function($, DFGCard) {
    var $dfgView;       // $('#dataflowView');
    var $dfgCard;       // $('#dfgViz');
    var $dfgMenu;          // $('#dfgMenu').find('.dfgList');
    var $listSection;   // $dfgMenu.find('.listSection');
    var $header;        // $dfgCard.find('.cardHeader h2');
    var $retTabSection; // $dfgCard.find('.retTabSection');
    var $retLists;      // $("#retLists");

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

    var currentDFG = null;

    DFGCard.setup = function() {
        $dfgView = $('#dataflowView');
        $dfgCard = $('#dfgViz');
        $dfgMenu = $('#dfgMenu').find('.dfgList');
        $listSection = $dfgMenu.find('.listSection');
        $header = $dfgCard.find('.cardHeader h2');
        $retTabSection = $dfgCard.find('.retTabSection');
        $retLists = $("#retLists");

        addListeners();
        setupDagDropdown();
        setupRetinaTab();
    };

    DFGCard.updateDFG = function(options) {
        // Only options is options.noClick
        updateList(options);
    };

    DFGCard.getCurrentDFG = function() {
        return (currentDFG);
    };

    DFGCard.updateRetinaTab = function(retName) {
        var html = "";
        for (var i = 0; i < retinaTrLen; i++) {
            html += retinaTr;
        }

        $retLists.html(html);

        var dfg = DFG.getGroup(retName);
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
        var dfg = DFG.getGroup(currentDFG);

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
        $dfgView.on("mousedown", function(event) {
            if ($(event.target).closest('#statusBox').length) {
                return;
            }
            $retTabSection.find(".retTab").removeClass("active");
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
                    "$selector": $input
                },
                {
                    "$selector": $input,
                    "text"     : ErrTStr.NoSpecialCharOrSpace,
                    "check"    : function() {
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

            DFG.getGroup(currentDFG).addParameter(paramName);

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
            var $groupLi = $dfg.find('.listBox');
            if ($groupLi.hasClass('selected')) {
                return;
            }

            var groupName = $groupLi.find('.groupName').text();
            currentDFG = groupName;
            $header.text(groupName);
            drawDags(groupName);
            DFGCard.updateRetinaTab(groupName);

            $listSection.find('.listBox').removeClass('selected');
            $groupLi.addClass('selected');

            if (gMinModeOn || options.show) {
                $listSection.find('.subList').hide();
                $dfg.find('.subList').show();
            } else {
                $listSection.find('.subList').slideUp(200);
                $dfg.find('.subList').slideDown(200);
            }
        });

        $listSection.on('click', '.downloadDataflow', function() {
            var retName = $(this).siblings('.groupName').text();
            Support.downloadLRQ(retName);
            // XXX: Show something when the download has started
        });

        $listSection.on('click', '.deleteDataflow', function() {
            var retName = $(this).siblings('.groupName').text();
            Alert.show({
                'title'    : DFGTStr.DelDFG,
                'msg'      : DFGTStr.DelDFGMsg,
                'onConfirm': function() {
                    deleteDataflow(retName);
                }
            });
        });

        function deleteDataflow(retName) {
            DFG.removeGroup(retName)
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

        $dfgCard.on("click", ".runNowBtn", function() {
            var $btn = $(this);
            var retName = $("#dfgMenu .listSection").find(".selected .groupName")
                                                    .text();
            $btn.addClass("running");

            runDFG(retName)
            .always(function() {
                $btn.removeClass("running");
            });
        });
    }

    function drawDags(groupName) {
            // This is a uploaded dataflow
            var deferred = jQuery.Deferred();
            html = '<div class="dagWrap clearfix">' +
                        '<div class="header clearfix">' +
                            '<div class="btn btn-small infoIcon">' +
                                '<i class="icon xi-info-rectangle"></i>' +
                            '</div>' +
                            '<div class="tableTitleArea">' +
                                '<span>Table: </span>' +
                                '<span class="tableName">' +
                                    groupName +
                                '</span>' +
                            '</div>' +
                            '<button class="runNowBtn btn btn-small iconBtn" ' +
                            'data-toggle="tooltip" data-container="body" ' +
                            'data-placement="top" data-original-title="' +
                            DFGTStr.Run + '">' +
                                '<i class="icon xi-arrow-right"></i>' +
                                '<div class="spin"></div>' +
                            '</button>' +
                        '</div>' +
                        '<div class="dagImageWrap">' +
                        '</div></div>';
            $dfgCard.find('.cardMain').html(html);
            XcalarGetRetina(groupName)
            .then(function(ret) {
                Dag.createDagImage(ret.retina.retinaDag.node,
                                   $("#dataflowPanel").find(".dagWrap"));
                Dag.addDagEventListeners($("#dataflowPanel").find(".dagWrap"));
                var $tooltipTables = $('#dfgViz').find('.dagTableIcon');
                xcHelper.temporarilyDisableTooltip($tooltipTables);
                xcHelper.addTooltip($('#dfgViz').find('.dataStoreIcon'), null, {
                    container: "body",
                    placement: "top",
                    title: CommonTxtTstr.ClickToOpts
                });
                deferred.resolve();
            })
            .fail(deferred.reject);
            return deferred.promise();
    }

    function getDagDropDownHTML() {
        var html =
        '<ul class="menu dagDropDown">' +
            '<li class="createParamQuery">Create Parameterized Query</li>' +
        '</ul>';
        return (html);
    }

    function getTableHtml(table, hasParam) {
        var iconClass = "dagTableIcon";

        var icon = "xi_table";
        var paramClass = "";
        if (hasParam) {
            paramClass = " hasParam";
        }
        var html =
        '<div class="dagTable ' + table.type + paramClass + '" data-index="' +
        table.index +
        '" data-children="' + table.children + '" data-type="' +
        table.type + '"';
        if (table.type === 'dataStore') {
            html += ' data-url="' + table.url + '"' +
                    ' data-table="' + table.table + '"';
            iconClass = 'dataStoreIcon';
            icon = "xi_data";
        } else if (table.type === "export") {
            html += ' data-url="' + table.url + '"' +
                    ' data-table="' + table.table + '"';
        }
        html += ' style="top: ' + table.top + 'px; left: ' + table.left +
        'px; position: absolute;">' +
            '<div class="' + iconClass + '"></div>' +
            '<i class="icon ' + icon + '"></i>' +
            '<span class="tableTitle" data-toggle="tooltip" ' +
                'data-placement="bottom" data-container="body"' +
                'title="' + table.title + '">' + table.title +
            '</span>' +
        '</div>';

        return (html);
    }

    function getOperationHtml(operation, hasParam) {
        var paramClass = "";
        if (hasParam) {
            paramClass = " hasParam";
        }
        // console.log(operation);
        var html =
        '<div class="actionType ' + operation.type + paramClass +
        '" style="top: ' + operation.top + 'px; left: ' +
        operation.left + 'px; position: absolute;" ' +
        'data-type="' + operation.type + '" data-info="' + operation.info +
        '" data-table="' + operation.table + '"' +
        '" data-column="' + operation.column +
        '" data-toggle="tooltip" ' +
        'data-placement="top" data-container="body" title="' +
        operation.tooltip + '">' +
            '<div class="actionTypeWrap">' +
                '<div class="' + operation.classes + '">' +
                    '<i class="' + operation.iconClasses + '"></i>' +
                '</div>' +
                '<span class="typeTitle">' + operation.type + '</span>' +
                '<span class="parentsTitle">' + operation.parents + '</span>' +
            '</div>' +
        '</div>';

        return (html);
    }

    function getExpandIconHtml(expandIcon) {
        var html = "";
        html += '<div class="expandWrap horz" style="left:' + expandIcon.left +
                    'px;top:' + expandIcon.top + 'px;" ' +
                    ' data-toggle="tooltip"' +
                    ' data-placement="top" data-container="body" ' +
                    'title="' + expandIcon.tooltip + '">...</div>';

        return (html);
    }

    function setupDagDropdown() {
        var dropdownHtml = getDagDropDownHTML();
        var $dagArea = $dfgCard;
        $dfgCard.append(dropdownHtml);

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
            var topMargin = 0;
            var leftMargin = 0;
            var top = el[0].getBoundingClientRect().bottom + topMargin;
            var left = el[0].getBoundingClientRect().left + leftMargin;

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
        });

        addMenuBehaviors($menu);

        $menu.find('.createParamQuery').mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            DFGParamModal.show($currentIcon);
        });
    }

    function updateList(options) {
        var noClick = false;
        if (options) {
            noClick = options.noClick;
        }
        // resetDFGView();
        var groups = DFG.getAllGroups();
        var $activeGroup = $dfgMenu.find('.listBox.selected');
        var activeGroupName;

        if ($activeGroup.length) {
            activeGroupName = $activeGroup.find('.groupName').text();
        }
        var html = "";
        var numGroups = 0;
        for (var group in groups) {
            numGroups++;
            html += '<div class="dataFlowGroup listWrap">' +
                      '<div class="listBox listInfo">' +
                        '<div class="iconWrap">' +
                          '<i class="icon xi-dataflowgroup"></i>' +
                        '</div>' +
                        '<span class="groupName">' + group + '</span>' +
                        '<i class="icon xi-trash deleteDataflow" ' +
                            'title="Delete dataflow" data-toggle="tooltip" ' +
                            'data-placement="top" data-container="body">' +
                        '</i>' +
                        '<i class="icon xi-download downloadDataflow" ' +
                            'title="Download dataflow" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body">' +
                        '</i>' +
                      '</div>' +
                    '</div>';
        }

        $dfgMenu.find('.listSection').html(html);
        $dfgMenu.find('.numGroups').text(numGroups);

        if (numGroups === 0) {
            var hint = '<div class="hint no-selection">' +
                        '<i class="icon xi-warning"></i>' +
                        '<div class="text">' +
                            DFGTStr.NoDFG1 + '.' +
                            '<br>' +
                            DFGTStr.NoDFG2 + '.' +
                        '</div>' +
                       '</div>';
            $dfgCard.find('.cardMain').html(hint);
            $dfgCard.find('.leftSection .title').text("");
        } else {
            if (noClick) {
                return;
            }
            $dfgCard.find(".cardMain").html("");
            if (activeGroupName) {
                $dfgMenu.find('.listBox').filter(function() {
                    return ($(this).find('.groupName').text() === activeGroupName);
                }).closest('.listBox').trigger('click', {show: true});
            } else {
                $dfgMenu.find('.listBox').eq(0).trigger('click', {show: true});
            }
        }
    }

    function runDFG(retName) {
        var deferred = jQuery.Deferred();

        var paramsArray = [];
        var parameters = DFG.getGroup(retName).paramMap;
        for (var param in parameters) {
            var p = new XcalarApiParameterT();
            p.parameterName = param;
            p.parameterValue = parameters[param];
            paramsArray.push(p);
        }

        XcalarExecuteRetina(retName, paramsArray)
        .then(function() {
            /// XXX TODO: add sql
            Alert.show({
                "title"  : DFGTStr.RunDone,
                "msg"    : DFGTStr.RunDoneMsg,
                "isAlert": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error(DFGTStr.RunFail, error);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    return (DFGCard);

}(jQuery, {}));
