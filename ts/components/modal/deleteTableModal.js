window.DeleteTableModal = (function(DeleteTableModal, $) {
    var $modal;    // $("#deleteTableModal")
    var $modalBg;  // $("#modalBackground")
    var modalHelper;
    var tableList = [];
    var sortKeyList = null;
    var reverseSort = true;
    // constant
    var unknown = "--";

    DeleteTableModal.setup = function() {
        $modal = $("#deleteTableModal");
        $modalBg = $("#modalBackground");
        reset();

        modalHelper = new ModalHelper($modal);

        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".confirm", function() {
            $(this).blur();
            if (!hasCheckedTables()) {
                return;
            }
            var msg = SideBarTStr.DelTablesMsg;
            $modal.addClass('lowZindex');
            Alert.show({
                "title": TblTStr.Del,
                "msg": msg,
                "highZindex": true,
                "onCancel": function() {
                    $modal.removeClass('lowZindex');
                    $('#modalBackground').hide();
                    // by default background won't hide because modalHelper
                    // detects more than 1 modal open
                },
                "onConfirm": function() {
                    $modal.removeClass('lowZindex');
                    $('#modalBackground').hide();
                    submitForm();
                }
            });
        });

        // click checkbox
        $modal.on("click", ".listSection .grid-unit", function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        // click checkbox on title
        $modal.on("click", ".titleSection .checkboxSection", function() {
            var $checkboxSection = $(this);
            if ($checkboxSection.find(".checkbox").hasClass("checked")) {
                // uncheck
                $checkboxSection.closest(".section")
                                .find(".checkbox").removeClass("checked");
            } else {
                $checkboxSection.closest(".section")
                                .find(".checkbox").addClass("checked");
            }
        });

        // click title to sort
        $modal.on("click", ".title .label, .title .xi-sort", function() {
            var $title = $(this).closest(".title");
            var sortKey = $title.data("sortkey");
            var $section = $title.closest(".section");
            $section.find(".title.active").removeClass("active");
            $title.addClass("active");

            var cachedTables = cacheCheckedTables();
            sortTableList(tableList, sortKey);
            restoreCheckedTables(cachedTables);
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    };

    DeleteTableModal.show = function() {
        if (DagEdit.isEditMode()) {
            return PromiseHelper.resolve();
        }
        if ($modal.is(":visible")) {
            // in case modal show is triggered when
            // it's already open
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();

        modalHelper.setup({
            "open": function() {
                // instead of show modalBg, add locked class
                // so it can overlap upon other modals
                // and close without any problem
                $modalBg.addClass("locked");

                if (gMinModeOn) {
                    $modal.show();
                } else {
                    $modal.fadeIn();
                }
            }
        });

        // if it's too slow, show timer
        $modal.addClass("load");
        $modal.find(".loadingSection .text").text(StatusMessageTStr.Loading);

        PromiseHelper.alwaysResolve(populateTableList())
        .then(function() {
            $modal.removeClass("load");
            deferred.resolve();
        });

        return deferred.promise();
    };

    function closeModal() {
        var deferred = PromiseHelper.deferred();
        modalHelper.clear({
            "close": function() {
                $modalBg.removeClass("locked");
                if (gMinModeOn) {
                    $modal.hide();
                    deferred.resolve();
                } else {
                    $modal.fadeOut(180, function() {
                        deferred.resolve();
                    });
                }
            }
        });
        reset();

        return deferred.promise();
    }

    function reset() {
        tableList = [];

        sortKeyList = null;

        reverseSort = false;

        $modal.find(".title.active").removeClass("active");
        $modal.find('.grid-unit.failed').removeClass('failed');
    }

    function submitForm() {
        var deferred = PromiseHelper.deferred();

        var deleteDef = deleteTableHelper();

        var timer = setTimeout(function() {
            // if delete takes too long, show the loading section
            $modal.addClass("load");
            $modal.find(".loadingSection .text").text(StatusMessageTStr.DeleteTable);
        }, 500);

        modalHelper.disableSubmit();

        var errors;
        PromiseHelper.when(deleteDef)
        .then(function() {
            errors = arguments;
            xcHelper.showRefreshIcon($modal);
        })
        .fail(function(error1, error2) {
            errors = arguments;
            var error = error1 || error2;
            console.error(error);
        })
        .always(function() {
            clearTimeout(timer);
            $modal.removeClass("load");
            if (reverseSort != null) {
                // because in sortTableList it will turn over
                // so should change first to keep the sort same
                reverseSort = !reverseSort;
            }
            PromiseHelper.alwaysResolve(populateTableList())
            .then(() => {
                failHandler(errors);;
                modalHelper.enableSubmit();
                // should re-dected memory usage
                MemoryAlert.Instance.check();
                deferred.resolve()
            })
        });

        return deferred.promise();
    }

    function deleteTableHelper() {
        var $container = $("#deleteTableModal-list");
        var deletedTable = false;

        var list = tableList;
        $container.find(".grid-unit").each(function(index) {
            var $grid = $(this);
            if ($grid.find(".checkbox").hasClass("checked")) {
                var tableName = list[index].name;
                DagTblManager.Instance.deleteTable(tableName, false, false);
                deletedTable = true;
            }
        });
        if (!deletedTable) {
            return PromiseHelper.resolve();
        }
        var noAlert = true;
        return DagTblManager.Instance.forceDeleteSweep();
    }

    function hasCheckedTables() {
        return $modal.find('.grid-unit .checkbox.checked').length > 0;
    }

    function populateTableList() {
        tableList = [];
        var deferred = PromiseHelper.deferred();

        XcalarGetTables("*")
        .then((result) => {
            var numNodes = result.numNodes;
            var nodeInfo = result.nodeInfo;
            for (var i = 0; i < numNodes; i++) {
                var node = nodeInfo[i];
                tableList.push({
                    "tableId": node.dagNodeId,
                    "name": node.name,
                    "size": node.size
                });
            }
            sortTableList(tableList);
            $modal.find('.modalMain').find('.checkbox').removeClass('checked');
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function sortTableList(tableList, sortKey) {
        if (sortKey == null) {
            // first time to sort, default sort by name
            sortKey = "name";
            reverseSort = false;
        } else if (sortKeyList === sortKey) {
            // when it's reverse sort
            reverseSort = !reverseSort;
        } else {
            // when change sort key, default is asc sort
            reverseSort = false;
        }

        // cache the new sortKey
        sortKeyList = sortKey;

        // sort by name first, no matter what case
        tableList.sort(function(a, b) {
            return a.name.localeCompare(b.name);
        });

        // temoprarily not support sort on size
        if (sortKey === "size") {
            tableList.sort(function(a, b) {
                var sizeA = a.size;
                var sizeB = b.size;
                if (sizeA === unknown) {
                    sizeA = null;
                }

                if (sizeB === unknown) {
                    sizeB = null;
                }

                if (sizeA == null && sizeB == null) {
                    return 0;
                } else if (sizeA == null) {
                    return -1;
                } else if (sizeB == null) {
                    return 1;
                } else if (sizeA === sizeB) {
                    return 0;
                } else if (sizeA > sizeB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        } else if (sortKey === "date") {
            tableList.sort(function(a, b) {
                var tA = DagTblManager.Instance.getTimeStamp(a.name);
                var tB = DagTblManager.Instance.getTimeStamp(b.name);
                if (tA === unknown) {
                    tA = null;
                }

                if (tB === unknown) {
                    tB = null;
                }

                if (tA == null && tB == null) {
                    return 0;
                } else if (tA == null) {
                    return -1;
                } else if (tB == null) {
                    return 1;
                } else if (tA === tB) {
                    return 0;
                } else if (tA > tB) {
                    return 1;
                } else {
                    return -1;
                }
            });
        }

        if (reverseSort) {
            tableList.reverse();
        }

        getTableList(tableList);
    }

    function cacheCheckedTables() {
        var list = tableList;
        var $container = $("#deleteTableModal-list");
        var tables = [];

        $container.find(".grid-unit").each(function(index) {
            var $grid = $(this);
            if ($grid.find(".checkbox").hasClass("checked")) {
                var tableName = list[index].name;
                tables.push(tableName);
            }
        });

        return tables;
    }

    function restoreCheckedTables(tables,) {
        var list = tableList;
        var $container = $("#deleteTableModal-list");
        var nameMap = {};

        tables.forEach(function(tableName) {
            nameMap[tableName] = true;
        });

        $container.find(".grid-unit").each(function(index) {
            var $grid = $(this);
            var tableName = list[index].name;
            if (nameMap.hasOwnProperty(tableName)) {
                $grid.find(".checkbox").addClass("checked");
            }
        });
    }

    function getTableList(tables) {
        var $container = $("#deleteTableModal-list");
        var html = getTableListHTML(tables);
        $container.find(".listSection").html(html);
    }

    function getTableListHTML(tables) {
        var html = "";

        for (var i = 0, len = tables.length; i < len; i++) {
            var table = tables[i];
            var date = DagTblManager.Instance.getTimeStamp(table.name);
            var tableName = table.name;
            var dateTip = "";
            var time;
            if (date !== unknown) {
                time = moment(date);
                dateTip = xcTimeHelper.getDateTip(time, {container:
                                                        "#deleteTableModal"});
                date = time.calendar();
            }
            var size = table.size;

            var checkbox;
            if (DagTblManager.Instance.hasLock(table.name)) {
                checkbox = '<i class="lockIcon icon xi-lockwithkeyhole" ' +
                            'data-toggle="tooltip" ' +
                            'data-container="#deleteTableModal" ' +
                            'data-placement="top" ' +
                            'data-title="' + TooltipTStr.LockedTable + '" ' +
                            '></i>';
            } else {
                checkbox = '<div class="checkboxSection">' +
                                '<div class="checkbox">' +
                                    '<i class="icon xi-ckbox-empty"></i>' +
                                    '<i class="icon xi-ckbox-selected"></i>' +
                                '</div>' +
                            '</div>';
            }

            html += '<div class="grid-unit">' +
                        checkbox +
                        '<div class="name tooltipOverflow" ' +
                        'data-toggle="tooltip" ' +
                        'data-container="#deleteTableModal" ' +
                        'data-placement="top" ' +
                        'data-title="' + tableName + '">' +
                            tableName +
                        '</div>' +
                        '<div>' + size + '</div>' +
                        '<div ' + dateTip + '>' + date + '</div>' +
                    '</div>';
        }

        return html;
    }

    function failHandler(args) {
        var $container = $("#deleteTableModal-list");
        var errorMsg = "";
        var hasSuccess = false;
        var failedTables = [];
        var failedMsg = "";
        var error;
        var failFound = false;
        var noDelete = false;
        for (var i = 0; i < args.length; i++) {
            if (args[i] && args[i].fails) {
                failFound = true;
                if (args[i].hasSuccess) {
                    hasSuccess = true;
                }
                for (var j = 0; j < args[i].fails.length; j++) {
                    var tableName = args[i].fails[j].tables;
                    failedTables.push(tableName);
                    error = args[i].fails[j].error;
                    if (!failedMsg && error !== ErrTStr.CannotDropLocked) {
                        failedMsg = error;
                    } else if (error === ErrTStr.CannotDropLocked) {
                        noDelete = true;
                    }

                    var $gridUnit = $container.find('.grid-unit')
                    .filter(function() {
                        $grid = $(this);
                        return ($grid.find('.name').text() === tableName);
                    });
                    $gridUnit.addClass('failed');
                }
            } else if (args[i] && args[i].length) {
                hasSuccess = true;
            }
        }
        if (!failFound) {
            return;
        }

        if (!failedMsg && noDelete) {
            // only show cannot dropped message if ther are no other
            // fail messages
            failedMsg = ErrTStr.CannotDropLocked;
        }

        if (hasSuccess) {
            if (failedTables.length === 1) {
                errorMsg = failedMsg + ". " +
                xcHelper.replaceMsg(ErrWRepTStr.TableNotDeleted, {
                    "name": failedTables[0]
                });
            } else {
                errorMsg = failedMsg + ". " +
                           StatusMessageTStr.PartialDeleteTableFail + ".";
            }
        } else {
            errorMsg = failedMsg + ". " + ErrTStr.NoTablesDeleted;
        }
        var $firstGrid = $container.find('.grid-unit.failed').eq(0);
        StatusBox.show(errorMsg, $firstGrid, false, {
            "side": "left",
            "highZindex": true
        });
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DeleteTableModal.__testOnly__ = {};
        DeleteTableModal.__testOnly__.submitForm = submitForm;
        DeleteTableModal.__testOnly__.closeModal = closeModal;
        DeleteTableModal.__testOnly__.getTableListHTML = getTableListHTML;
        DeleteTableModal.__testOnly__.hasCheckedTables = hasCheckedTables;
        DeleteTableModal.__testOnly__.failHandler = failHandler;
    }
    /* End Of Unit Test Only */

    return DeleteTableModal;
}({}, jQuery));
