window.Workbook = (function($, Workbook) {
    var $workbookPanel; // $("#workbookPanel")
    var $workbookTopbar; // $workbookPanel.find(".topSection")
    var $workbookSection; // $workbookPanel.find(".bottomSection")
    var $newWorkbookCard; // $workbookPanel.find(".newWorkbookBox")
    var $newWorkbookInput; // $newWorkbookCard.find("input")
    var $welcomeCard; // $workbookTopbar.find(".welcomeBox")
    var sortkey = "modified"; // No longer user configurable

    Workbook.setup = function() {
        console.log('setting up');
        $workbookPanel = $("#workbookPanel");
        $workbookTopbar = $workbookPanel.find(".topSection");
        $workbookSection = $workbookPanel.find(".bottomSection");
        $newWorkbookCard = $workbookPanel.find(".newWorkbookBox");
        $newWorkbookInput = $newWorkbookCard.find("input");
        $welcomeCard = $workbookTopbar.find(".welcomeBox");
        addTopBarEvents();
        addWorkbookEvents();
        // open workbook modal
        $("#homeBtn").click(function() {
            $(this).blur();
            if ($workbookPanel.is(":visible")) {
                closeWorkbookPanel();
                Workbook.hide();
            } else {
                Workbook.show();
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
        setTimeout(function() {
            $workbookPanel.removeClass('hidden');
        }, 100);
        var extraOptions;
        if (isForceShow) {
            getWorkbookInfo(isForceShow);
        }

        addWorkbooks();
        $('#menuBar').addClass('workbookMode');
    };

    Workbook.hide = function() {
        $workbookPanel.addClass('hidden');
        $('#menuBar').addClass('workbookMode');
        setTimeout(function() {
            $workbookPanel.hide();
        }, 600);
    };

    Workbook.forceShow = function() {
        // When it's forceShow, no older workbooks are displayed
        Workbook.show(true);
        // Create a new workbook with the name already selected - Prompting
        // the user to click Create Workbook
        var uName = Support.getUser();
        $newWorkbookInput.val("untitled-"+uName);
        var input = $newWorkbookInput.get(0);
        input.setSelectionRange(0, input.value.length);
    };

    function resetWorkbook() {
        // $workbookPanel.find(".active").removeClass("active");
        $newWorkbookInput.val("").focus();
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
        // New Workbook card
        $newWorkbookCard.on("click", "button", function() {
            var workbookName = $newWorkbookInput.val();
            var err1 = xcHelper.replaceMsg(WKBKTStr.Conflict, {
                "name": workbookName
            });

            isValid = xcHelper.validate([
                {
                    "$selector": $newWorkbookInput,
                    "formMode" : true
                },
                {
                    "$selector": $newWorkbookInput,
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

            createNewWorkbook(workbookName)
            .then(function(id) {
                var workbook = WorkbookManager.getWorkbook(id);
                var numWorksheets = -1; // JJJ fill in later

                var html = createWorkbookCard(id, workbookName,
                                              workbook.created,
                                              workbook.modified,
                                              workbook.srcUser,
                                              numWorksheets,
                                              false, "", true);
                $newWorkbookCard.after(html);

                // need to remove "new" class from workbookcard a split second
                // after it's appended or it won't animate
                setTimeout(function() {
                    $newWorkbookCard.next().removeClass('new');
                }, 200);
                
            })
            .fail(function() {
                // JJJ handle. Just deferred reject and let the outer catch
                // and show new workbook

            });

        });

        $newWorkbookInput.on("focus", function() {
            // Close the rest of the inputs (currently only from renaming of
            // another workbook)
            console.log("focus");
        });

    
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
                    $newWorkbookCard.click();
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
        console.log($welcomeCard);
        var $welcomeMsg = $welcomeCard.find(".description");
        var $welcomeUser = $welcomeCard.find(".heading .username");
        var user = Support.getUser();
        $welcomeUser.text(user);
        var html;

        if (isForceMode) {
            // forceMode does not have any workbook info
            $welcomeMsg.text(WKBKTStr.NewWKBKInstr);
            return;
        }

        var workbooks = WorkbookManager.getWorkbooks();
        var activeWKBKId = WorkbookManager.getActiveWKBK();
        var workbook = workbooks[activeWKBKId];
        $welcomeMsg.text(WKBKTStr.CurWKBKInstr);
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

    function createWorkbookCard(workbookId, workbookName, createdTime,
                                modifiedTime, username, numWorksheets,
                                isActive, gridClass, isNew) {
        if (createdTime) {
            createdTime = xcHelper.getTime(null, createdTime) + ' ' +
                          xcHelper.getDate("-", null, createdTime);
        }

        if (modifiedTime) {
            modifiedTime = xcHelper.getTime(null, modifiedTime) + ' ' +
                           xcHelper.getDate("-", null, modifiedTime);
        }

        if (isActive) {
            isActive = "Active";
        } else {
            isActive = "Inactive";
        }

        var isNewClass;
        if (isNew) {
            isNewClass = " new";
        } else {
            isNewClass = "";
        }

        return '<div class="box box-small workbookBox ' + isNewClass + '">' +
                    '<div class="innerBox">' +
                        '<div class="content">' +
                            '<div class="innerContent">' +
                                '<div class="subHeading">' +
                                    '<input type="text" value="' + workbookName + '" />' +
                                '</div>' +
                                '<div class="infoSection topInfo">' +
                                    '<div class="row clearfix">' +
                                        '<div class="label">Created by:</div>' +
                                        '<div class="info">' + username + '</div>' +
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Created on:</div>'+
                                        '<div class="info">' + createdTime +'</div>'+
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Last Modified:</div>'+
                                        '<div class="info">' + modifiedTime + '</div>'+
                                    '</div>'+
                                '</div>'+
                                '<div class="infoSection bottomInfo">'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Worksheets:</div>'+
                                        '<div class="info">' + numWorksheets + '</div>'+
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Status:</div>'+
                                        '<div class="info">' + isActive + '</div>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                        '<div class="rightBar vertBar">'+
                            '<div class="tab btn btn-small">'+
                                '<i class="icon xi-play-circle"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small">'+
                                '<i class="icon xi-edit"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small">'+
                                '<i class="icon xi-duplicate"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small">'+
                                '<i class="icon xi-trash"></i>'+
                            '</div>'+
                        '</div>'+
                    '</div>'+
                '</div>';
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
            var isActive = false;

            if (wkbkId === activeWKBKId) {
                isActive = true;
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

            var numWorksheets = "";
            numWorksheets = 
            html += createWorkbookCard(wkbkId, name, createdTime, modifiedTime,
                                      workbook.srcUser, numWorksheets, isActive,
                                      gridClass);

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
        //$workbookSection.html(html);
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
        var deferred = jQuery.Deferred();
        goWaiting();
        WorkbookManager.newWKBK(workbookName)
        .then(function(id) {
            cancelWaiting();
            deferred.resolve(id);
        })
        .fail(function(error) {
            cancelWaiting();
            console.error(error);
            deferred.reject(error);
        });
        return deferred.promise();
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
