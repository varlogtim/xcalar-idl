window.Workbook = (function($, Workbook) {
    var $workbookPanel; // $("#workbookPanel")
    var $workbookTopbar; // $workbookPanel.find(".topSection")
    var $workbookSection; // $workbookPanel.find(".bottomSection")
    var $newWorkbookCard; // $workbookPanel.find(".newWorkbookBox")
    var $newWorkbookInput; // $newWorkbookCard.find("input")
    var $welcomeCard; // $workbookTopbar.find(".welcomeBox")
    var sortkey = "modified"; // No longer user configurable
    var $lastFocusedInput; // Should always get reset to empty
    var wasMonitorActive = false; // Track previous monitor panel state for when 
                                  // workbook closes

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
            if ($('#container').hasClass('workbookMode')) {
                var hideImmediate = false;
                if (!$workbookPanel.is(":visible")) {
                   hideImmediate = true;
                   // on monitor view or something else
                }
                closeWorkbookPanel();
                Workbook.hide(hideImmediate);
                $('#container').removeClass('monitorMode');
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
        
        $workbookPanel.show();
        $('#container').addClass('workbookMode');

        if (!MonitorPanel.isGraphActive()) {
            wasMonitorActive = false;
            MonitorPanel.active();
        } else {
            wasMonitorActive = true;
        }

        setTimeout(function() {
            $workbookPanel.removeClass('hidden');
        }, 100);
        var extraOptions;
        if (isForceShow) {
            getWorkbookInfo(isForceShow);
        }

        addWorkbooks();
    };

    Workbook.hide = function(immediate) {
        $workbookPanel.addClass('hidden');
        $workbookSection.find('.workbookBox').remove();
        
        if (immediate) {
            $workbookPanel.hide();
            $('#container').removeClass('workbookMode');
        } else {
            setTimeout(function() {
                $workbookPanel.hide();
                $('#container').removeClass('workbookMode');
            }, 400);
        }
        if (!wasMonitorActive) {
            MonitorPanel.inActive();
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
        clearActives();
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

        // go to monitor panel
        $workbookTopbar.find('.monitorBtn, .monitorLink').click(function(e) {
            e.preventDefault(); // prevent monitor link from actually navigating
            $('#container').addClass('monitorMode');
            $('#mainMenu').addClass('noAnim');
            $('#container').addClass('noMenuAnim');
            setTimeout(function() {
                $('#mainMenu').removeClass('noAnim');
                $('#container').removeClass('noMenuAnim');
            }, 200);
        });

        // from monitor to workbook panel
        $('#monitorPanel').find('.backToWB').click(function() {
            $('#container').removeClass('monitorMode'); 
        });
    }

    function clearActives(doNotRevert) {
        $lastFocusedInput = "";
        $(".workbookBox").find("input.active").each(function(input) {
            $(this).removeClass("active");
            if (doNotRevert) {
                return;
            }
            var workbookId = $(this).closest(".workbookBox")
                                    .attr("data-workbook-id");
            var workbookName = WorkbookManager.getWorkbook(workbookId).name;
            $(this).val(workbookName);
        });
    }

    function addWorkbookEvents() {
        // Keypress
        $(document).on("keypress", workbookKeyPress);
        $newWorkbookInput.on("keypress", function() {
            clearActives();
            $lastFocusedInput = $(this);
        });

        // New Workbook card
        $newWorkbookCard.on("click", "button", createNewWorkbookListener);

        $newWorkbookInput.on("focus", function() {
            clearActives();
            $lastFocusedInput = $(this);

        });

        $workbookSection.on("focus", ".workbookBox input", function() {
            $lastFocusedInput = $(this);
        });

        $workbookSection.on("blur", ".workbookBox input", function() {
            if ($(this).closest(".workbookBox.edit").length > 0) {
                clearActives(true);
            } else {
                clearActives();
            }
        });
    
        // Events for the actual workbooks
        // Play button
        $workbookSection.on("click", ".activate", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.attr("data-workbook-id");
            if (WorkbookManager.getActiveWKBK() === workbookId) {
                $(".tooltip").remove();
                Workbook.hide();
            } else {
                WorkbookManager.switchWKBK(workbookId);
            }
        });

        // Edit button
        $workbookSection.on("click", ".modify", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var $workbookName = $workbookBox.find("input");
            $workbookName.addClass("active");
            // sets focus and puts cursor at end of input
            $workbookName.focus().val($workbookName.val());
            $(".tooltip").remove();
        });

        // Duplicate button
        $workbookSection.on("click", ".duplicate", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.attr("data-workbook-id");
            // Create workbook names in a loop until we find a workbook name
            // that we can use
            var currentWorkbookName = $workbookBox.find("input").val();
            var currentWorkbooks = WorkbookManager.getWorkbooks();
            var found = false;
            for (var i = 0; i<10; i++) {
                currentWorkbookName = 
                              xcHelper.createNextName(currentWorkbookName, "-");
                found = true;
                for (var workbook in currentWorkbooks) {
                    if (currentWorkbooks[workbook].name ===
                        currentWorkbookName) {
                        found = false;
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }

            if (!found) {
                // Add some random 5 digit number and call it a dya
                currentWorkbookName += "-" + Math.floor(Math.random()*100000);
            }

            WorkbookManager.copyWKBK(workbookId, currentWorkbookName)
            .then(function(newId) {
                var newWorkbook = WorkbookManager.getWorkbook(newId);
                var dup = createWorkbookCard(newId, currentWorkbookName,
                                             newWorkbook.created,
                                             newWorkbook.modified,
                                             newWorkbook.srcUser,
                                             newWorkbook.numWorksheets,
                                             ["new"]);
                $workbookBox.after(dup);
                setTimeout(function() {
                    var $newCard = $workbookBox.next();
                    $newCard.removeClass('new');
                }, 200);
            });
            $(".tooltip").remove();
        });

        // Delete button
        $workbookSection.on("click", ".delete", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.attr("data-workbook-id");
            WorkbookManager.deleteWKBK(workbookId)
            .then(function() {
                $workbookBox.addClass('removing');
                setTimeout(function() {
                    $workbookBox.remove();
                }, 700);
                
            })
            .fail(function(error) {
                StatusBox.show(error.error, $workbookBox);
            });
            $(".tooltip").remove();
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
                        
                    } else {
                        // Must be editting a current name
                        var $workbookBox = $lastFocusedInput.
                                                        closest(".workbookBox");
                        $workbookBox.addClass("edit");
                        var newName = $lastFocusedInput.val();
                        $lastFocusedInput.blur();
                        var workbookId = $workbookBox.attr('data-workbook-id'); 
                        var oldWorkbookName = WorkbookManager
                                                       .getWorkbook(workbookId)
                                                       .name;
                        WorkbookManager.renameWKBK(workbookId,
                                                   newName)
                        .then(function(newWorkbookId) {
                            $workbookBox.attr('data-workbook-id',
                                               newWorkbookId);
                            $lastFocusedInput = "";
                        })
                        .fail(function(error) {
                            StatusBox.show(error, $workbookBox);
                            $workbookBox.find(".subHeading input")
                                        .val(oldWorkbookName);
                        })
                        .always(function() {
                            $workbookBox.removeClass("edit");
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

        Support.commitCheck()
        .then(function() {
            return createNewWorkbook(workbookName);
        })
        .then(function(id) {
            var workbook = WorkbookManager.getWorkbook(id);

            var html = createWorkbookCard(id, workbookName,
                                          workbook.created,
                                          workbook.modified,
                                          workbook.srcUser,
                                          workbook.numWorksheets,
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
            StatusBox.show(error.error, $newWorkbookInput);
        });
    }

    function modifyWorkbookCard($card, options) {
        if (options.workbookId) {
            $card.attr("data-workbook-id", options.workbookId);
        }
        if (options.workbookName) {
            $card.find(".workbookName").val(workbookName);
        }
        delete options.workbookName;
        delete options.workbookId;

        for (var key in options) {
            $card.find("."+key).text(options.key);
        }
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
                                    '<input type="text" class="workbookName" ' +
                                    'value="' + workbookName +
                                    '" spellcheck="false"/>' +
                                '</div>' +
                                '<div class="infoSection topInfo">' +
                                    '<div class="row clearfix">' +
                                        '<div class="label">Created by:</div>' +
                                        '<div class="info username">' +
                                        username +
                                        '</div>' +
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Created on:</div>'+
                                        '<div class="info createdTime">' +
                                        createdTime +
                                        '</div>'+
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Last Modified:' +
                                        '</div>'+
                                        '<div class="info modifiedTime">' +
                                        modifiedTime +
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                                '<div class="infoSection bottomInfo">'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Worksheets:</div>' +
                                        '<div class="info numWorksheets">' +
                                        numWorksheets +
                                        '</div>'+
                                    '</div>'+
                                    '<div class="row clearfix">'+
                                        '<div class="label">Status:</div>'+
                                        '<div class="info isActive">' +
                                        isActive +
                                        '</div>'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</div>'+
                        '<div class="rightBar vertBar">'+
                            '<div class="tab btn btn-small activate" ' +
                            'data-toggle="tooltip" data-container="body" ' +
                            'data-placement="right"' +
                            'title="Activate Workbook">'+
                                '<i class="icon xi-play-circle"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small modify" '+
                            'data-toggle="tooltip" data-container="body" ' +
                            'data-placement="right"' +
                            'title="Edit Workbook Name">'+
                                '<i class="icon xi-edit"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small duplicate" '+
                            'data-toggle="tooltip" data-container="body" ' +
                            'data-placement="right"' +
                            'title="Duplicate Workbook">'+
                                '<i class="icon xi-duplicate"></i>'+
                            '</div>'+
                            '<div class="tab btn btn-small delete" '+
                            'data-toggle="tooltip" data-container="body" ' +
                            'data-placement="right"' +
                            'title="Delete Workbook">'+
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
            var wkbkId        = workbook.id;
            var created       = workbook.created;
            var modified      = workbook.modified;
            var numWorksheets = workbook.numWorksheets;
            var extraClasses  = [];
            var name          = workbook.name;
            var isActive      = false;

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

            html = createWorkbookCard(wkbkId, name, createdTime, modifiedTime,
                                       workbook.srcUser, numWorksheets,
                                       extraClasses) + html;

        });

        $newWorkbookCard.after(html);
    }

    function createNewWorkbook(workbookName) {
        var deferred = jQuery.Deferred();
        WorkbookManager.newWKBK(workbookName)
        .then(function(id) {
            deferred.resolve(id);
            $newWorkbookInput.blur();
        })
        .fail(function(error) {
            console.error(error);
            deferred.reject(error);
            $lastFocusedInput = $newWorkbookInput;
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
