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
    var newBoxSlideTime = 700;

    Workbook.setup = function() {
        $workbookPanel = $("#workbookPanel");
        $workbookTopbar = $workbookPanel.find(".topSection");
        $workbookSection = $workbookPanel.find(".bottomSection");
        $newWorkbookCard = $workbookPanel.find(".newWorkbookBox");
        $newWorkbookInput = $newWorkbookCard.find("input");
        $welcomeCard = $workbookTopbar.find(".welcomeBox");

        addTopbarEvents();
        addWorkbookEvents();

        // open or close workbook view
        $("#homeBtn").click(function() {
            $(this).blur();
            if ($('#container').hasClass('workbookMode')) {
                if (!$workbookPanel.is(":visible")) {
                    // on monitor view or something else
                    $('#container').removeClass('monitorMode');
                } else if ($('#container').hasClass('noWorkbook')) {
                    // do not allow user to exit without entering a workbook
                    $workbookPanel.addClass('closeAttempt');
                    $workbookPanel.find("#dialogWrap")
                                  .removeClass("doneCloseAttempt");
                    $workbookPanel.find("#dialogWrap").addClass('closeAttempt');
                    setTimeout(function() {
                        $workbookPanel.removeClass('closeAttempt');

                    }, 200);
                    setTimeout(function() {
                        $workbookPanel.find("#dialogWrap")
                                      .removeClass('closeAttempt')
                                      .addClass('doneCloseAttempt');
                    }, 1000);
                } else { // default, exit the workbook
                    closeWorkbookPanel();
                    Workbook.hide();
                    $('#container').removeClass('monitorMode');
                }
            } else {
                Workbook.show();
            }
        });
    };

    Workbook.initialize = function() {
        try {
            getWorkbookInfo();
        } catch (error) {
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

        if (isForceShow) {
            getWorkbookInfo(isForceShow);
            $workbookPanel.removeClass('hidden'); // no animation if force show
        } else {
            setTimeout(function() {
                $workbookPanel.removeClass('hidden');
            }, 100);
        }

        addWorkbooks();
        // Keypress
        $(document).on("keypress", workbookKeyPress);
    };

    Workbook.hide = function(immediate) {
        if ($workbookPanel.hasClass('hidden')) {
            return;
        }
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
        $('.tooltip').hide();
        StatusBox.forceHide();
    };

    Workbook.forceShow = function() {
        // When it's forceShow, no older workbooks are displayed
        $('#container').addClass('noWorkbook');
        Workbook.show(true);

        // Create a new workbook with the name already selected - Prompting
        // the user to click Create Workbook
        var name = getNewWorkbookName();
        $newWorkbookInput.val(name).select();
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

    function getNewWorkbookName() {
        var defaultName = "untitled-" + Support.getUser();
        var names = {};
        $workbookPanel.find(".workbookBox .workbookName").each(function() {
            var name = $(this).val();
            names[name] = true;
        });

        var maxTry = 100;
        var tryCnt = 0;
        var resName = defaultName;

        while (tryCnt < maxTry && names.hasOwnProperty(resName)) {
            tryCnt++;
            resName = defaultName + "-" + tryCnt;
        }

        if (tryCnt >= maxTry) {
            console.warn("Too many tries");
            resName = xcHelper.randName(defaultName);
        }

        return resName;
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
        $(".workbookBox").find("input.active").each(function() {
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
        $newWorkbookInput.on("keypress", function() {
            clearActives();
            $lastFocusedInput = $(this);
        });

        // New Workbook card
        $newWorkbookCard.on("click", "button", createNewWorkbook);

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
                WorkbookManager.switchWKBK(workbookId)
                .fail(function(error) {
                    StatusBox.show(error.error, $workbookBox);
                });
            }
        });

        // Edit button
        $workbookSection.on("click", ".modify", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var $workbookName = $workbookBox.find("input");
            $workbookName.addClass("active");
            $workbookName.parent().removeAttr('data-container data-toggle');
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
            for (var i = 0; i < 10; i++) {
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

            var $dupButton = $workbookBox.find('.duplicate');
            $dupButton.addClass('inActive');

            var deferred1 = createLoadingCard($workbookBox);
            var deferred2 = WorkbookManager.copyWKBK(workbookId,
                                                    currentWorkbookName);

            PromiseHelper.when(deferred1, deferred2)
            .then(function($fauxCard, newId) {
                replaceLoadingCard($fauxCard, newId);
            })
            .fail(function(error) {
                StatusBox.show(error.error, $dupButton);
            })
            .always(function() {
                $dupButton.removeClass('inActive');
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
                }, 600);
                
            })
            .fail(function(error) {
                StatusBox.show(error.error, $workbookBox);
            });
            $(".tooltip").remove();
        });

        $workbookSection.on('mouseenter', '.tooltipOverflow', function() {
            var $input = $(this).find('input');
            if ($input.is(':focus')) {
                // no tooltip when input is in focus, gets in the way of typing
                $(this).removeAttr('data-container data-toggle');
                return;
            }

            xcTooltip.auto(this, $input[0]);
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
                        WorkbookManager.renameWKBK(workbookId,newName)
                        .then(function(newWorkbookId) {
                            $lastFocusedInput = "";
                            updateWorkbookInfo($workbookBox, newWorkbookId);
                        })
                        .fail(function(error) {
                            var errorText = error;
                            if (typeof error === "object" &&
                                error.error != null)
                            {
                                errorText = error.error;
                            } else {
                                errorText = JSON.stringify(error);
                            }

                            StatusBox.show(errorText, $workbookBox);
                            $workbookBox.find(".subHeading input")
                                        .val(oldWorkbookName);
                        })
                        .always(function() {
                            $workbookBox.removeClass("edit");
                            var name = $workbookBox.find(".subHeading input")
                                                    .val();
                            $workbookBox.find(".subHeading")
                                        .attr('data-original-title', name);
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

    function updateWorkbookInfo($workbookBox, workbookId) {
        $workbookBox.attr('data-workbook-id', workbookId);
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var modified = workbook.modified;
        if (modified) {
            modified = xcHelper.getDate("-", null, modified) + ' ' +
                        xcHelper.getTime(null, modified, true);
        } else {
            modified = "";
        }

        $workbookBox.find(".modifiedTime").text(modified);
    }

    function getWorkbookInfo(isForceMode) {
        var $welcomeMsg = $welcomeCard.find(".description");
        var $welcomeUser = $welcomeCard.find(".heading .username");
        var user = Support.getUser();
        $welcomeUser.text(user);
        // var html;

        if (isForceMode) {
            // forceMode does not have any workbook info
            $welcomeMsg.text(WKBKTStr.NewWKBKInstr);
            return;
        }

        // var workbooks = WorkbookManager.getWorkbooks();
        // var activeWKBKId = WorkbookManager.getActiveWKBK();
        // var workbook = workbooks[activeWKBKId];
        $welcomeMsg.text(WKBKTStr.CurWKBKInstr);
    }

    function createNewWorkbook() {
        var workbookName = $newWorkbookInput.val();
        var error = xcHelper.replaceMsg(WKBKTStr.Conflict, {
            "name": workbookName
        });

        var isValid = xcHelper.validate([
            {
                "$ele"    : $newWorkbookInput,
                "formMode": true
            },
            {
                "$ele"    : $newWorkbookInput,
                "formMode": true,
                "error"   : error,
                "check"   : function() {
                    var workbooks = WorkbookManager.getWorkbooks();
                    for (var wkbkId in workbooks) {
                        if (workbooks[wkbkId].getName() === workbookName) {
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

        $newWorkbookInput.blur();
        var $buttons = $newWorkbookInput.find('button').addClass('inActive');

        Support.commitCheck()
        .then(function() {
            var deferred1 = createLoadingCard($newWorkbookCard);
            var deferred2 = WorkbookManager.newWKBK(workbookName);
            return PromiseHelper.when(deferred1, deferred2);
        })
        .then(function($fauxCard, id) {
            replaceLoadingCard($fauxCard, id);

            $newWorkbookInput.val('');
            $lastFocusedInput = '';
        })
        .fail(function(error) {
            StatusBox.show(error.error, $newWorkbookInput);

            $lastFocusedInput = $newWorkbookInput;
            $newWorkbookInput.focus();
        })
        .always(function() {
            $buttons.removeClass('inActive');
        });
    }

    // function modifyWorkbookCard($card, options) {
    //     if (options.workbookId) {
    //         $card.attr("data-workbook-id", options.workbookId);
    //     }
    //     if (options.workbookName) {
    //         $card.find(".workbookName").val(workbookName);
    //     }
    //     delete options.workbookName;
    //     delete options.workbookId;

    //     for (var key in options) {
    //         $card.find("."+key).text(options.key);
    //     }
    // }

    function createLoadingCard($sibling) {
        var deferred = jQuery.Deferred();
        // placeholder
        var workbook = new WKBK({
            "id"  : "",
            "name": ""
        });
        var extraClasses = ["loading", "new", "animating"];
        var html = createWorkbookCard(workbook, extraClasses);

        var $newCard = $(html);
        $sibling.after($newCard);

        // need to remove "new" class from workbookcard a split second
        // after it's appended or it won't animate
        setTimeout(function() {
            $newCard.removeClass('new');
        }, 100);

        // this class hides the right bar tabs during the slide out
        // so they don't come out when the cursor is hovering over
        setTimeout(function() {
            $newCard.removeClass('animating');
            deferred.resolve($newCard);
        }, newBoxSlideTime);

        return deferred.promise();
    }

    function replaceLoadingCard($card, workbookId) {
        var classes = ['loading'];
        // Get activeness
        if (WorkbookManager.getActiveWKBK() === workbookId) {
            classes.push('active');
        }
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var $updateCard = $(createWorkbookCard(workbook, classes));
        $card.replaceWith($updateCard);

        var animClasses = ".label, .info, .workbookName, .rightBar";
        $updateCard.removeClass("loading")
            .find(".loadSection").remove()
            .end()
            .find(animClasses).hide().fadeIn();
    }

    function createWorkbookCard(workbook, extraClasses) {
        var workbookId = workbook.getId() || "";
        var workbookName = workbook.getName() || "";
        var createdTime = workbook.getCreateTime() || "";
        var modifiedTime = workbook.getModifyTime() || "";
        var username = workbook.getSrcUser() || "";
        var numWorksheets = workbook.getNumWorksheets() || 0;
        var noSeconds = true;

        extraClasses = extraClasses || [];

        if (workbook.isNoMeta()) {
            extraClasses.push("noMeta");
            workbookName += " (" + WKBKTStr.NoMeta + ")";
        }

        if (createdTime) {
            createdTime = xcHelper.getDate("-", null, createdTime) + ' ' +
                          xcHelper.getTime(null, createdTime, noSeconds);

        }

        if (modifiedTime) {
            modifiedTime = xcHelper.getDate("-", null, modifiedTime) + ' ' +
                           xcHelper.getTime(null, modifiedTime, noSeconds);
        }
        var activateTooltip;
        var isActive;

        if (extraClasses.includes("active")) {
            isActive = WKBKTStr.Active;
            activateTooltip = WKBKTStr.ReturnWKBK;
        } else {
            isActive = WKBKTStr.Inactive;
            activateTooltip = WKBKTStr.Activate;
        }

        var loadSection = "loadSection";
        if (isBrowserSafari) {
            loadSection += " safari";
        }

        var html =
            '<div class="box box-small workbookBox ' +
            extraClasses.join(" ") + '"' +
            ' data-workbook-id="' + workbookId +'">' +
                '<div class="innerBox">' +
                    '<div class="' + loadSection + '">' +
                        '<div class="refreshIcon">' +
                            '<img src="' + paths.waitIcon + '">' +
                        '</div>' +
                        '<div class="animatedEllipsisWrapper">' +
                            '<div class="text">' +
                                WKBKTStr.Creating +
                            '</div>' +
                            '<div class="animatedEllipsis">' +
                                '<div>.</div>' +
                                '<div>.</div>' +
                                '<div>.</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="content">' +
                        '<div class="innerContent">' +
                            '<div class="subHeading tooltipOverflow" ' +
                                ' data-toggle="tooltip" data-container="body"' +
                                ' data-original-title="' + workbookName + '"' +
                            '>' +
                                '<input type="text" class="workbookName ' +
                                 'tooltipOverflow"' +
                                ' value="' + workbookName + '"' +
                               
                                ' spellcheck="false"/>' +
                            '</div>' +
                            '<div class="infoSection topInfo">' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        WKBKTStr.Createby + ':' +
                                    '</div>' +
                                    '<div class="info username">' +
                                        username +
                                    '</div>' +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        WKBKTStr.CreateOn + ':' +
                                    '</div>' +
                                    '<div class="info createdTime">' +
                                        createdTime +
                                    '</div>' +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        WKBKTStr.Modified + ':' +
                                    '</div>' +
                                    '<div class="info modifiedTime">' +
                                        modifiedTime +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                            '<div class="infoSection bottomInfo">' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        WKBKTStr.WS + ':' +
                                    '</div>' +
                                    '<div class="info numWorksheets">' +
                                        numWorksheets +
                                    '</div>' +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        WKBKTStr.Status + ':' +
                                    '</div>' +
                                    '<div class="info isActive">' +
                                        isActive +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="rightBar vertBar">' +
                        '<div class="tab btn btn-small activate"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="auto right"' +
                        ' title="' + activateTooltip + '">' +
                            '<i class="icon xi-play-circle"></i>' +
                        '</div>' +
                        '<div class="tab btn btn-small modify"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="auto right"' +
                        ' title="' + WKBKTStr.EditName + '">' +
                            '<i class="icon xi-edit"></i>' +
                        '</div>' +
                        '<div class="tab btn btn-small duplicate"' +
                        ' data-toggle="tooltip" data-container="body" ' +
                        ' data-placement="auto right"' +
                        ' title="' + WKBKTStr.Duplicate + '">' +
                            '<i class="icon xi-duplicate"></i>' +
                        '</div>' +
                        '<div class="tab btn btn-small delete"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="auto right"' +
                        ' title="' + WKBKTStr.Delete + '">' +
                            '<i class="icon xi-trash"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        return html;
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
        var activeWorkbook;

        sorted = sortObj(sorted, sortkey, isNum);
        sorted.forEach(function(workbook) {
            if (workbook.getId() === activeWKBKId) {
                activeWorkbook = workbook;
            } else {
                html = createWorkbookCard(workbook) + html;
            }
        });
        // active workbook always comes first
        if (activeWorkbook != null) {
            html = createWorkbookCard(activeWorkbook, ["active"]) + html;
        }

        $newWorkbookCard.after(html);
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
