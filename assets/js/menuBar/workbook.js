window.Workbook = (function($, Workbook) {
    var $workbookPanel; // $("#workbookPanel")
    var $workbookTopbar; // $
    var $workbookSection; // $
    var $newWorkbookCard; // $
    var $newWorkbookInput; // $
    var sortkey = "modified"; // No longer user configurable

    Workbook.setup = function() {
        $workbookPanel = $("#workbookPanel");
        $workbookInput = $("#workbookPanel"); // XXX temp
        $workbookLists = $("#workbookPanel"); // XXX temp
        $newWorkbookCard = $("#workbookPanel"); // XXX temp
        $newWorkbookInput = $newWorkbookCard.find("input");

        // open workbook modal
        $("#homeBtn").click(function() {
            $(this).blur();
            if ($workbookPanel.is(":visible")) {
                closeWorkbookPanel();
                Workbook.hide();
            } else {
                Workbook.show();
                addTopBarEvents();
                addWorkbookEvents();
            }
        });    
    };

    Workbook.initialize = function() {
        try {
            getWorkbookInfo();
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    Workbook.show = function(isForceShow) {
        // $(document).on("keypress", workbookKeyPress);
        $workbookPanel.show();
        var extraOptions;
        if (isForceShow) {
            getWorkbookInfo(isForceShow);
        }

        addWorkbooks();
    };

    Workbook.hide = function() {
        $workbookPanel.hide();
    };

    Workbook.forceShow = function() {
        Workbook.show(true);
        // Create a new workbook with the name already selected - Prompting
        // the user to click Create Workbook
        var uName = Support.getUser();
        $newWorkbookInput.val("untitled-"+uName);
        var input = $newWorkbookInput.get(0);
        input.setSelectionRange(0, input.value.length);
    };

    function resetWorkbook() {
        $workbookPanel.find(".active").removeClass("active");
        $workbookInput.val("").focus();
    }

    function closeWorkbookPanel() {
        $(document).off("keypress", workbookKeyPress);
        resetWorkbook();
    }

    function addTopBarEvents() {
        // Events for the top bar, welcome message, news, etc
        // Welcome message listener
        // News-Help listener
        // Tutorial listener

    }

    function addWorkbookEvents() {
        // Events for the actual workbooks
        // Play button

        // Edit button
        // JJJ When editing, remove focus from all other inputs (other card's
        // edits + new workbook) by cancelling
        // Duplicate button
        // Delete button

    }

    function workbookKeyPress(event) {
        switch (event.which) {
            case keyCode.Enter:
                // Invariant: Due to activating one input field will cause the
                // others to close, there will be only one active input field
                // at any point in time.
                if ($newWorkbookInput.is(":focus")) {
                    // create new workbook
                } else if ($workBookSection.find(".workbookCard").is(":focus"))
                {
                    // edit name for current workbook
                } 
                // If focus on new workbook's input create new workbook
                // If focus on edit workbook's input, confirm new workbook name
                break;
            default:
                break;
        }
    }

    function getWorkbookInfo(isForceMode) {
        var $instr = $workbookPanel.find(".modalInstruction .text");
        var user = Support.getUser();
        var html;

        if (isForceMode) {
            // forceMode does not have any workbook info
            html = xcHelper.replaceMsg(WKBKTStr.NewWKBKInstr, {"user": user});
            $instr.html(html);
            return;
        }

        var workbooks = WorkbookManager.getWorkbooks();
        var activeWKBKId = WorkbookManager.getActiveWKBK();
        var workbook = workbooks[activeWKBKId];

        html = xcHelper.replaceMsg(WKBKTStr.CurWKBKInstr, {
            "user"    : user,
            "workbook": workbook.name
        });

        $instr.html(html);
    }

    function focusWorkbook(workbookName) {
        $workbookLists.find(".grid-unit").each(function() {
            var $grid = $(this);
            if ($grid.find(".name").text() === workbookName) {
                $grid.addClass("active");
                // out of the loop
                return false;
            }
        });
    }

    function addWorkbooks() {
        var html = "";
        var sorted = [];
        var workbooks = WorkbookManager.getWorkbooks();

        for (var id in workbooks) {
            sorted.push(workbooks[id]);
        }

        var activeWKBKId = WorkbookManager.getActiveWKBK();
        // sort by workbook.name
        var isNum = (sortkey === "created" || sortkey === "modified");
        sorted = sortObj(sorted, sortkey, isNum);
        sorted.forEach(function(workbook) {
            var wkbkId    = workbook.id;
            var created   = workbook.created;
            var modified  = workbook.modified;
            var gridClass = "grid-unit";
            var name = workbook.name;

            if (wkbkId === activeWKBKId) {
                gridClass += " activeWKBK";
            }

            if (workbook.noMeta) {
                gridClass += " noMeta";
                name += " (" + WKBKTStr.NoMeta + ")";
            }

            var createdTime = "";
            if (created) {
                createdTime = xcHelper.getTime(null, created) + ' ' +
                                xcHelper.getDate("-", null, created);
            }

            var modifiedTime = "";
            if (modified) {
                modifiedTime = xcHelper.getTime(null, modified) + ' ' +
                                xcHelper.getDate("-", null, modified);
            }

            html +=
                 '<div class="' + gridClass + '" data-wkbkid="' + wkbkId + '">' +
                    '<div class="name">' + name + '</div>' +
                    '<div>' + createdTime + '</div>' +
                    '<div>' + modifiedTime + '</div>' +
                    '<div>' + (workbook.srcUser || "") + '</div>' +
                    '<div>' + (workbook.curUser || "") + '</div>' +
                '</div>';
        });

        // JJJ Commented out since no longer necessary
        // if (!sorted.length) {
        //     var text = WKBKTStr.WKBKnotExists;
        //     $optionSection.find('.radioButton').not(':first-child')
        //                                     .addClass('disabled')
        //                                     .attr("data-toggle", "tooltip")
        //                                     .attr("data-original-title", text)
        //                                     .attr("data-container", "body")
        //                                     .attr("title", text);
        // } else {
        //     $optionSection.find('.radioButton').removeClass('disabled')
        //                                 .removeAttr("data-toggle")
        //                                 .removeAttr("data-placement")
        //                                 .removeAttr("data-original-title")
        //                                 .removeAttr("data-container")
        //                                 .removeAttr("title");
        // }

        // JJJ This should become something like $workbookSection.html(html);
        //$workbookLists.html(html);
    }

    function submitForm() {
        var isValid;
        var workbookName = $workbookInput.val().trim();

        // Validation check
        // continue workbook, copy workbook and rename workbook must select one wkbk
        if (activeActionNo === 1 ||
            activeActionNo === 2 ||
            activeActionNo === 3)
        {
            isValid = xcHelper.validate({
                "$selector": $workbookLists,
                "text"     : ErrTStr.NoWKBKSelect,
                "check"    : function() {
                    return ($workbookLists.find(".active").length === 0);
                }
            });

            if (!isValid) {
                return;
            }
        }

        // new workbook and copy workbook must have new workbook name
        // and should not have duplicate name
        if (activeActionNo !== 1) {
            var err1 = xcHelper.replaceMsg(WKBKTStr.Conflict, {
                "name": workbookName
            });
            isValid = xcHelper.validate([
                {
                    "$selector": $workbookInput,
                    "formMode" : true
                },
                {
                    "$selector": $workbookInput,
                    "formMode" : true,
                    "text"     : err1,
                    "check"    : function() {
                        var workbooks = WorkbookManager.getWorkbooks();
                        for (var wkbkId in workbooks) {
                            if (workbooks[wkbkId].name === workbookName) {
                                return true;
                            }
                        }
                        return false;
                    }
                }
            ]);

            if (!isValid) {
                return;
            }
        }

        $workbookInput.blur();
        modalHelper.disableSubmit();

        Support.commitCheck()
        .then(function() {
            var innerDeferred = jQuery.Deferred();
            workbookAction(activeActionNo, workbookName)
            .then(innerDeferred.resolve)
            .fail(function(error) {
                if ($workbookPanel.is(":visible")) {
                    // if error is commit key not match,
                    // then not show it
                    StatusBox.show(error.error, $workbookInput);
                }
                innerDeferred.reject(error);
            });

            return innerDeferred.promise();
        })
        .always(function() {
            modalHelper.enableSubmit();
        });
    }

    function createNewWorkbook(workbookName) {
        goWaiting();
        WorkbookManager.newWKBK(workbookName)
        .then(deferred.resolve)
        .fail(function(error) {
            cancelWaiting();
            deferred.reject(error);
        });
    }

    function activateWorkbook(workbookName) {
        var workbookId = WorkbookManager.getWorkbookIdByName;
        return WorkbookManager.switchWKBK(workbookId)
        .then(deferred.resolve)
        .fail(function(error) {
            cancelWaiting();
            deferred.reject(error);
        });
    }

    function workbookAction(actionNo, workbookName) {
        var deferred = jQuery.Deferred();
        var workbookId = $workbookLists.find(".active").data("wkbkid");

        if (actionNo === 0) {
            // create new workbook part
            goWaiting();

            WorkbookManager.newWKBK(workbookName)
            .then(function(id) {
                return WorkbookManager.switchWKBK(id);
            })
            .then(deferred.resolve)
            .fail(function(error) {
                cancelWaiting();
                deferred.reject(error);
            })
            .always(function() {
                modalHelper.enableSubmit();
            });
        } else if (actionNo === 1) {
            // continue workbook part
            goWaiting();

            WorkbookManager.switchWKBK(workbookId)
            .then(deferred.resolve)
            .fail(function(error) {
                cancelWaiting();
                deferred.reject(error);
            });
        } else if (actionNo === 2) {
            // copy workbook part
            goWaiting(true);

            WorkbookManager.copyWKBK(workbookId, workbookName)
            .then(function(id) {
                return WorkbookManager.switchWKBK(id);
            })
            .then(deferred.resolve)
            .fail(function(error) {
                cancelWaiting();
                deferred.reject(error);
            });
        } else if (actionNo === 3) {
            goWaiting();
            WorkbookManager.renameWKBK(workbookId, workbookName)
            .then(function() {
                $workbookInput.val("");
                getWorkbookInfo();
                addWorkbooks();
                focusWorkbook(workbookName);
                deferred.resolve();
            })
            .fail(function(error) {
                deferred.reject(error);
            })
            .always(cancelWaiting);
        } else {
            // code should not go here
            deferred.reject({"error": "Invalid WorkBook Option!"});
        }

        return deferred.promise();
    }

    function sortObj(objs, key, isNum) {
        if (isNum) {
            objs.sort(function(a, b) {
                return (a[key] - b[key]);
            });
        } else {
            objs.sort(function(a, b) {
                return a[key].localeCompare(b[key]);
            });
        }

        return objs;
    }

    function goWaiting(hasIcon) {
        $workbookPanel.addClass('inactive');

        if (hasIcon) {
            $('body').append('<div id="workbookPanelWaitingIcon" ' +
                            'class="waitingIcon"></div>');
            $('#workbookPanelWaitingIcon').css({
                left: '50%',
                top : '50%'
            }).fadeIn();
        }
    }

    function cancelWaiting() {
        $workbookPanel.removeClass('inactive');
        $("#workbookPanelWaitingIcon").remove();
    }

    return (Workbook);
}(jQuery, {}));
