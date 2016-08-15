window.Workbook = (function($, Workbook) {
    var $workbookPanel; // $("#workbookPanel")
    var $workbookTopbar; // $workbookPanel.find(".topSection")
    var $workbookSection; // $workbookPanel.find(".bottomSection")
    var $newWorkbookCard; // $workbookPanel.find(".newWorkbookBox")
    var $newWorkbookInput; // $newWorkbookCard.find("input")
    var $welcomeCard; // $workbookTopbar.find(".welcomeBox")
    var sortkey = "modified"; // No longer user configurable
    var $lastFocusedInput; // Should always get reset to empty

    Workbook.setup = function() {
        $workbookPanel = $("#workbookPanel");
        $workbookTopbar = $workbookPanel.find(".topSection");
        $workbookSection = $workbookPanel.find(".bottomSection");
        $newWorkbookCard = $workbookPanel.find(".newWorkbookBox");
        $newWorkbookInput = $newWorkbookCard.find("input");
        $welcomeCard = $workbookTopbar.find(".welcomeBox");
        addTopbarEvents();
        addWorkbookEvents();
        // open workbook modal
        $("#homeBtn").click(function() {
            $(this).blur();
            // if ($workbookPanel.is(":visible")) {
            //     closeWorkbookPanel();
            //     Workbook.hide();
            // } else {
            //     Workbook.show();
            // }
            if (!$workbookPanel.is(":visible")) {
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
        $(document).on("keypress", workbookKeyPress);
        $workbookPanel.show();
        MainMenu.close(true, true);
        MonitorPanel.inActive();

        setTimeout(function() {
            $workbookPanel.removeClass('hidden');
        }, 100);
        var extraOptions;
        if (isForceShow) {
            getWorkbookInfo(isForceShow);
        }

        addWorkbooks();
        // JJJ Temp $('#menuBar').addClass('workbookMode');
    };

    Workbook.hide = function(immediate) {
        $workbookPanel.addClass('hidden');
        $workbookSection.find('.workbookBox').remove();
        // JJJ $('#menuBar').addClass('workbookMode');
        if (immediate) {
            $workbookPanel.hide();
        } else {
            setTimeout(function() {
                $workbookPanel.hide();
            }, 600);
        }
    };

    Workbook.forceShow = function() {
        // When it's forceShow, no older workbooks are displayed
        Workbook.show(true);
        $('#container').addClass('noWorkbook');
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
        $lastFocusedInput = "";
        // JJJ also remove all the actives from all theworkbookBoxes
    }

    function closeWorkbookPanel() {
        $(document).off("keypress", workbookKeyPress);
        resetWorkbook();
    }

    function addTopbarEvents() {
        // Events for the top bar, welcome message, news, etc
        // Welcome message listener
        // News-Help listener
        // Tutorial listener

    }

    function addWorkbookEvents() {
        // New Workbook card
        $newWorkbookCard.on("click", "button", createNewWorkbookListener);

        $newWorkbookInput.on("focus", function() {
            // Close the rest of the inputs (currently only from renaming of
            // another workbook)
            $lastFocusedInput = $(this);
        });

        $workbookSection.on("focus", ".workbookBox input", function() {
            $lastFocusedInput = $(this);
        });
    
        // Events for the actual workbooks
        // Play button
        $workbookSection.on("click", ".activate", function() {
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.data("workbook-id");
            if (WorkbookManager.getActiveWKBK() === workbookId) {
                Workbook.hide();
            } else {
                WorkbookManager.switchWKBK(workbookId);
            }
        });

        // Edit button
        // JJJ When editing, remove focus from all other inputs (other card's
        // edits + new workbook) by cancelling
        $workbookSection.on("click", ".modify", function() {
            var $workbookBox = $(this).closest(".workbookBox");
            var $workbookName = $workbookBox.find("input");
            $workbookName.addClass("active");
            $lastFocusedInput = $workbookName;
        });

        // Duplicate button
        $workbookSection.on("click", ".duplicate", function() {
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.data("workbook-id");
            console.log("XXX TODO!");
        });

        // Delete button
        $workbookSection.on("click", ".delete", function() {
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.data("workbook-id");
            WorkbookManager.deleteWKBK(workbookId)
            .then(function() {
                $workbookBox.remove();
            })
            .fail(function(error) {
                StatusBox.show(error.error, $workbookBox);
            });
        });
    }

    function workbookKeyPress(event) {
        switch (event.which) {
            case keyCode.Enter:
                // Invariant: Due to activating one input field will cause the
                // others to close, there will be only one active input field
                // at any point in time.
                if ($lastFocusedInput) {
                    if ($lastFocusedInput.closest(".newWorkbookBox").length > 0)
                    {
                        // New workbook
                        $newWorkbookCard.find("button").click();
                        
                    } else if ($lastFocusedInput.closest(".duplicate")
                                                .length > 0) {
                        // Creating a duplicate
                        // JJJ todo
                    } else {
                        // Must be editting a current name
                        var $workbookBox = $lastFocusedInput.
                                                        closest(".workbookBox");
                        var workbookId = $workbookBox.data('workbook-id'); 
                        var oldWorkbookName = WorkbookManager
                                                       .getWorkbook(workbookId)
                                                       .name;
                        WorkbookManager.renameWKBK(workbookId,
                                                   $lastFocusedInput.val())
                        .then(function(newWorkbookId) {
                            $workbookBox.attr('data-workbook-id',
                                               newWorkbookId);
                        })
                        .fail(function(error) {
                            StatusBox.show(error.error, $workbookBox);
                            $workbookBox.find(".subHeading input")
                                        .val(oldWorkbookName);
                        });
                        $workbookBox.find(".subHeading input")
                                    .removeClass("active");
                    }
                    $lastFocusedInput = "";
                }
                break;
            default:
                break;
        }
    }

    function getWorkbookInfo(isForceMode) {
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

    function createNewWorkbookListener() {
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

        // JJJ Need to commit check first
        // Support.commitCheck()
        // .then(function() {
        //     var innerDeferred = jQuery.Deferred();
        //     workbookAction(activeActionNo, workbookName)
        //     .then(innerDeferred.resolve)
        //     .fail(function(error) {
        //         if ($workbookPanel.is(":visible")) {
        //             // if error is commit key not match,
        //             // then not show it
        //             StatusBox.show(error.error, $workbookInput);
        //         }
        //         innerDeferred.reject(error);
        //     });

        createNewWorkbook(workbookName)
        .then(function(id) {
            var workbook = WorkbookManager.getWorkbook(id);
            var numWorksheets = -1; // JJJ fill in later

            var html = createWorkbookCard(id, workbookName,
                                          workbook.created,
                                          workbook.modified,
                                          workbook.srcUser,
                                          numWorksheets,
                                          ["new"]);
            $newWorkbookCard.after(html);

            // need to remove "new" class from workbookcard a split second
            // after it's appended or it won't animate
            setTimeout(function() {
                $newWorkbookCard.next().removeClass('new');
                $newWorkbookInput.val("");
                $lastFocusedInput = "";
            }, 200);         
        })
        .fail(function(error) {
            StatusBox.show(error, $newWorkbookInput);
        });
    }

    function createWorkbookCard(workbookId, workbookName, createdTime,
                                modifiedTime, username, numWorksheets,
                                extraClasses) {
        if (createdTime) {
            createdTime = xcHelper.getDate("-", null, createdTime) + ' ' +
                          xcHelper.getTime(null, createdTime);
        }

        if (modifiedTime) {
            modifiedTime = xcHelper.getDate("-", null, modifiedTime) + ' ' +
                           xcHelper.getTime(null, modifiedTime);
        }

        if (extraClasses.indexOf("active") > -1) {
            isActive = "Active";
        } else {
            isActive = "Inactive";
        }


        return '<div class="box box-small workbookBox ' +
                    extraClasses.join(" ") + '" data-workbook-id="' +
                    workbookId +'">' +
                    '<div class="innerBox">' +
                        '<div class="content">' +
                            '<div class="innerContent">' +
                                '<div class="subHeading">' +
                                    '<input type="text" value="' +
                                    workbookName + '" />' +
                                '</div>' +
                                '<div class="infoSection topInfo">' +
                                    '<div class="row clearfix">' +
                                        '<div class="label">Created by:</div>' +
                                        '<div class="info">' + username +
                                        '</div>' +
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Created on:</div>'+
                                        '<div class="info">' + createdTime +
                                        '</div>'+
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Last Modified:' +
                                        '</div>'+
                                        '<div class="info">' + modifiedTime +
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                                '<div class="infoSection bottomInfo">'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Worksheets:</div>' +
                                        '<div class="info">' + numWorksheets +
                                        '</div>'+
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Status:</div>'+
                                        '<div class="info">' + isActive +
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                        '<div class="rightBar vertBar">'+
                            '<div class="tab btn btn-small activate">'+
                                '<i class="icon xi-play-circle"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small modify">'+
                                '<i class="icon xi-edit"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small duplicate">'+
                                '<i class="icon xi-duplicate"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small delete">'+
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
            var extraClasses = [];
            var name = workbook.name;
            var isActive = false;

            if (wkbkId === activeWKBKId) {
                isActive = true;
                extraClasses.push("active");
            }

            if (workbook.noMeta) {
                extraClasses.push("noMeta");
                name += " (" + WKBKTStr.NoMeta + ")";
            }

            var createdTime = "";
            if (created) {
                createdTime = xcHelper.getDate("-", null, created) + ' ' +
                              xcHelper.getTime(null, created);
            }

            var modifiedTime = "";
            if (modified) {
                modifiedTime = xcHelper.getDate("-", null, modified) + ' ' +
                               xcHelper.getTime(null, modified);
                                
            }

            // JJJ Handle this later
            var numWorksheets = "";
            numWorksheets = -1;

            html = createWorkbookCard(wkbkId, name, createdTime, modifiedTime,
                                       workbook.srcUser, numWorksheets,
                                       extraClasses) + html;

        });

        // JJJ Handle it later
        // if (!sorted.length) {
        //  Basically no workbooks nothing. New user? No kv?
        // }

        $newWorkbookCard.after(html);
    }

    function createNewWorkbook(workbookName) {
        var deferred = jQuery.Deferred();
        // goWaiting();
        WorkbookManager.newWKBK(workbookName)
        .then(function(id) {
            // cancelWaiting();
            deferred.resolve(id);
        })
        .fail(function(error) {
            // cancelWaiting();
            console.error(error);
            deferred.reject(error);
        });
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


    return (Workbook);
}(jQuery, {}));
