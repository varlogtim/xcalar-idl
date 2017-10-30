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
        WorkbookPreview.setup();

        var closeTimer = null;
        var doneTimer = null;
        // open or close workbook view
        $("#homeBtn").click(function() {
            $(this).blur();
            var $container = $("#container");
            var $dialogWrap = $("#dialogWrap");

            if (Workbook.isWBMode()) {
                WorkbookPreview.close();
                if (!$workbookPanel.is(":visible")) {
                    // on monitor view or something else
                    $container.removeClass("monitorMode setupMode");
                    if (!wasMonitorActive) {
                        MonitorPanel.inActive();
                    }
                } else if ($container.hasClass("noWorkbook") ||
                           $container.hasClass("switchingWkbk")) {
                    var msg = "";
                    if ($container.hasClass("switchingWkbk")) {
                        msg = WKBKTStr.WaitActivateFinish;
                    } else {
                        msg = WKBKTStr.NoActive;
                    }
                    $dialogWrap.find("span").text(msg);
                    // do not allow user to exit without entering a workbook
                    $workbookPanel.addClass("closeAttempt");
                    $dialogWrap.removeClass("doneCloseAttempt");
                    $dialogWrap.addClass("closeAttempt");
                    clearTimeout(closeTimer);
                    clearTimeout(doneTimer);
                    closeTimer = setTimeout(function() {
                        $workbookPanel.removeClass("closeAttempt");
                    }, 200);
                    doneTimer = setTimeout(function() {
                        $dialogWrap.removeClass("closeAttempt")
                                    .addClass("doneCloseAttempt");
                    }, 2000);
                } else {
                    // default, exit the workbook
                    closeWorkbookPanel();
                    Workbook.hide();
                    $container.removeClass("monitorMode setupMode");
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
        $("#container").addClass("workbookMode");

        if (isForceShow) {
            getWorkbookInfo(isForceShow);
            $workbookPanel.removeClass("hidden"); // no animation if force show
            $("#container").addClass("wkbkViewOpen noMenuBar");
        } else {
            setTimeout(function() {
                $workbookPanel.removeClass("hidden");
                $("#container").addClass("wkbkViewOpen");
            }, 100);
        }

        addWorkbooks();
        // Keypress
        $(document).on("keypress", workbookKeyPress);
    };

    Workbook.hide = function(immediate) {
        if ($workbookPanel.hasClass("hidden")) {
            return;
        }
        $workbookPanel.addClass("hidden");
        $workbookSection.find(".workbookBox").remove();
        $("#container").removeClass("wkbkViewOpen");

        if (immediate) {
            $workbookPanel.hide();
            $("#container").removeClass("workbookMode noMenuBar");
        } else {
            setTimeout(function() {
                $workbookPanel.hide();
                $("#container").removeClass("workbookMode noMenuBar");
            }, 400);
        }

        xcTooltip.hideAll();
        StatusBox.forceHide();
    };

    Workbook.forceShow = function() {
        // When it's forceShow, no older workbooks are displayed
        $("#container").addClass("noWorkbook noMenuBar");
        $("#container").removeClass("wkbkViewOpen");
        Workbook.show(true);

        // Create a new workbook with the name already selected - Prompting
        // the user to click Create Workbook
        var name = getNewWorkbookName();
        $newWorkbookInput.val(name).select();
    };

    Workbook.goToMonitor = function() {
        $("#container").removeClass("setupMode wkbkViewOpen");
        $("#container").addClass("monitorMode noMenuBar");
        MainMenu.tempNoAnim();

        if (!MonitorPanel.isGraphActive()) {
            wasMonitorActive = false;
            MonitorPanel.active();
        } else {
            wasMonitorActive = true;
        }
    };

    Workbook.goToSetup = function() {
        $("#container").removeClass("monitorMode");
        $("#container").addClass("setupMode noMenuBar");
        MainMenu.tempNoAnim();
        if ($("#monitor-setup").hasClass("firstTouch")) {
            $("#monitor-setup").removeClass("firstTouch");
            MonitorConfig.refreshParams(true);
        }
    };

    Workbook.isWBMode = function() {
        return $("#container").hasClass("workbookMode");
    };

    function resetWorkbook() {
        $newWorkbookInput.val("").focus();
        clearActives();
    }

    function closeWorkbookPanel() {
        $(document).off("keypress", workbookKeyPress);
        resetWorkbook();
    }

    function getNewWorkbookName() {
        var regex = new RegExp(/[a-zA-Z0-9-_]*/);
        var un = regex.exec(XcSupport.getUser())[0];
        var defaultName = "untitled-" + un;
        var names = {};
        var workbooks = WorkbookManager.getWorkbooks();
        for (var workbookId in workbooks) {
            var name = workbooks[workbookId].getName();
            names[name] = true;
        }

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
        $workbookTopbar.find(".monitorBtn, .monitorLink").click(function(e) {
            e.preventDefault(); // prevent monitor link from actually navigating
            Workbook.goToMonitor();
        });

        // from monitor to workbook panel
        $("#monitorPanel").find(".backToWB").click(function() {
            $("#container").removeClass("monitorMode setupMode");
            $("#container").addClass("wkbkViewOpen");
            if (!wasMonitorActive) {
                MonitorPanel.inActive();
            }
        });
    }

    function clearActives() {
        $lastFocusedInput = "";
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
                    handleError(error, $workbookBox);
                });
            }
        });

        // Edit button
        $workbookSection.on("click", ".modify", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.attr("data-workbook-id");
            $(".tooltip").remove();
            WorkbookInfoModal.show(workbookId);
        });

        // Duplicate button
        $workbookSection.on("click", ".duplicate", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.attr("data-workbook-id");
            // Create workbook names in a loop until we find a workbook name
            // that we can use
            var currentWorkbookName = $workbookBox.find(".workbookName").text();
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
                // Add some random 5 digit number and call it a day
                currentWorkbookName += "-" + Math.floor(Math.random()*100000);
            }

            var $dupButton = $workbookBox.find(".duplicate");
            $dupButton.addClass("inActive");

            var deferred1 = createLoadingCard($workbookBox);
            var deferred2 = WorkbookManager.copyWKBK(workbookId,
                                                    currentWorkbookName);

            PromiseHelper.when(deferred1, deferred2)
            .then(function($fauxCard, newId) {
                replaceLoadingCard($fauxCard, newId);
            })
            .fail(function($fauxCard, error) {
                handleError(error, $dupButton);
                removeWorkbookBox($fauxCard);
            })
            .always(function() {
                $dupButton.removeClass("inActive");
            });

            $(".tooltip").remove();
        });

        // Delete button
        $workbookSection.on("click", ".delete", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            Alert.show({
                "title": WKBKTStr.Delete,
                "msg": WKBKTStr.DeleteMsg,
                "onConfirm": function() {
                    deleteWorkbookHelper($workbookBox);
                }
            });

            $(".tooltip").remove();
        });

        // pause button
        $workbookSection.on("click", ".pause", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            Alert.show({
                "title": WKBKTStr.Pause,
                "msg": WKBKTStr.PauseMsg,
                "onConfirm": function() {
                    pauseWorkbook($workbookBox);
                }
            });

            $(".tooltip").remove();
        });

        // deactivate button
        $workbookSection.on("click", ".deactivate", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            Alert.show({
                "title": WKBKTStr.Deactivate,
                "msg": WKBKTStr.DeactivateMsg,
                "onConfirm": function() {
                    deactiveWorkbook($workbookBox);
                }
            });

            $(".tooltip").remove();
        });

        $workbookSection.on("click", ".preview", function() {
            clearActives();
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.attr("data-workbook-id");
            WorkbookPreview.show(workbookId);
        });

        $workbookSection.on("mouseenter", ".tooltipOverflow", function() {
            var $div = $(this).find(".workbookName");
            xcTooltip.auto(this, $div[0]);
        });
    }

    

    Workbook.edit = function(workbookId, newName, description) {
        var $workbookBox = $workbookPanel.find(".workbookBox").filter(function() {
            return $(this).attr("data-workbook-id") === workbookId;
        });

        var workbook = WorkbookManager.getWorkbook(workbookId);
        var oldWorkbookName = workbook.getName();
        var oldDescription = workbook.getDescription() || "";
        if (oldWorkbookName === newName && oldDescription === description) {
            return PromiseHelper.resolve();
        } else {
            var deferred = jQuery.Deferred();
            var promise;
            if (oldWorkbookName === newName) {
                // only update description
                promise = WorkbookManager.updateDescription(workbookId, description);
            } else {
                promise = WorkbookManager.renameWKBK(workbookId, newName, description);
            }
            $workbookBox.addClass("loading")
                            .find(".loadSection .text").text(WKBKTStr.Updating);
            var loadDef = jQuery.Deferred();
            setTimeout(function() {
                // if only update description, it could blink the UI if update
                // is too fast, so use this to slow it down.
                loadDef.resolve();
            }, 500);

            PromiseHelper.when(promise, loadDef.promise())
            .then(function(curWorkbookId) {
                updateWorkbookInfo($workbookBox, curWorkbookId);
                deferred.resolve();
            })
            .fail(function(error) {
                handleError(error, $workbookBox);
                deferred.reject(error);
            })
            .always(function() {
                $workbookBox.removeClass("loading")
                            .find(".loadSection .text").text(WKBKTStr.Creating);
            });

            return deferred.promise();
        }
    };

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
                    }
                    $lastFocusedInput = "";
                }
                break;
            default:
                break;
        }
    }

    function updateWorkbookInfo($workbookBox, workbookId) {
        $workbookBox.attr("data-workbook-id", workbookId);
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var modified = workbook.modified;
        var description = workbook.getDescription() || "";
        var name = workbook.getName();
        if (modified) {
            modified = xcHelper.getDate("-", null, modified) + " " +
                        xcHelper.getTime(null, modified, true);
        } else {
            modified = "";
        }

        $workbookBox.find(".modifiedTime").text(modified);
        $workbookBox.find(".description").text(description);
        $workbookBox.find(".workbookName").text(name);

        var $subHeading = $workbookBox.find(".subHeading");
        xcTooltip.changeText($subHeading, name);
    }

    function updateWorkbookInfoWithReplace($card, workbookId) {
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var $updateCard = $(createWorkbookCard(workbook));
        $card.replaceWith($updateCard);
    }

    function getWorkbookInfo(isForceMode) {
        var $welcomeMsg = $welcomeCard.find(".description");
        var $welcomeUser = $welcomeCard.find(".heading .username");
        var user = XcSupport.getUser();
        $welcomeUser.text(user);

        if (isForceMode) {
            // forceMode does not have any workbook info
            $welcomeMsg.text(WKBKTStr.NewWKBKInstr);
            return;
        }
        $welcomeMsg.text(WKBKTStr.CurWKBKInstr);
    }

    function createNewWorkbook() {
        var workbookName = $newWorkbookInput.val();
        var isValid = xcHelper.validate([
            {
                "$ele": $newWorkbookInput,
                "formMode": true
            },
            {
                "$ele": $newWorkbookInput,
                "formMode": true,
                "error": ErrTStr.InvalidWBName,
                "check": function() {
                    return !xcHelper.isValidTableName($newWorkbookInput.val());
                }
            },
            {
                "$ele": $newWorkbookInput,
                "formMode": true,
                "error": xcHelper.replaceMsg(WKBKTStr.Conflict, {
                    "name": workbookName
                }),
                "check": function() {
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
        var $buttons = $newWorkbookInput.find("button").addClass("inActive");

        XcSupport.commitCheck()
        .then(function() {
            var deferred1 = WorkbookManager.newWKBK(workbookName);
            var deferred2 = createLoadingCard($newWorkbookCard);
            return PromiseHelper.when(deferred1, deferred2);
        })
        .then(function(id, $fauxCard) {
            replaceLoadingCard($fauxCard, id);

            $newWorkbookInput.val("");
            $lastFocusedInput = "";
        })
        .fail(function(error, $fauxCard) {
            handleError(error || WKBKTStr.CreateErr, $newWorkbookInput);
            removeWorkbookBox($fauxCard);
            $lastFocusedInput = $newWorkbookInput;
            $newWorkbookInput.focus();
        })
        .always(function() {
            $buttons.removeClass("inActive");
        });
    }

    function createLoadingCard($sibling) {
        var deferred = jQuery.Deferred();
        // placeholder
        var workbook = new WKBK({
            "id": "",
            "name": ""
        });
        var extraClasses = ["loading", "new"];
        var html = createWorkbookCard(workbook, extraClasses);

        var $newCard = $(html);
        $sibling.after($newCard);

        // need to remove "new" class from workbookcard a split second
        // after it's appended or it won't animate
        setTimeout(function() {
            $newCard.removeClass("new");
        }, 100);

        setTimeout(function() {
            deferred.resolve($newCard);
        }, newBoxSlideTime);

        return deferred.promise();
    }

    function replaceLoadingCard($card, workbookId) {
        var classes = ["loading"];
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var $updateCard = $(createWorkbookCard(workbook, classes));
        $card.replaceWith($updateCard);

        var animClasses = ".label, .info, .workbookName, .rightBar";
        $updateCard.removeClass("loading")
            .find(".loadSection").remove()
            .end()
            .addClass("finishedLoading")
            .find(animClasses).hide().fadeIn();
        setTimeout(function() {
            $updateCard.removeClass("finishedLoading");
        }, 500);
    }

    function deleteWorkbookHelper($workbookBox) {
        var workbookId = $workbookBox.attr("data-workbook-id");
        WorkbookManager.deleteWKBK(workbookId)
        .then(function() {
            removeWorkbookBox($workbookBox);
        })
        .fail(function(error) {
            handleError(error, $workbookBox);
        });
    }

    function removeWorkbookBox($workbookBox) {
        if ($workbookBox == null) {
            return;
        }
        $workbookBox.addClass("removing");
        setTimeout(function() {
            $workbookBox.remove();
        }, 600);
    }

    function handleError(error, $ele) {
        var errorText;
        var log;
        if (typeof error === "object" && error.error != null) {
            if (error.status === StatusT.StatusCanceled) {
                return;
            }
            errorText = error.error;
            log = error.log;
        } else if (typeof error === "string") {
            errorText = error;
        } else {
            errorText = JSON.stringify(error);
        }
        StatusBox.show(errorText, $ele, false, {
            "detail": log,
            "persist": true
        });
    }

    function pauseWorkbook($workbookBox) {
        var workbookId = $workbookBox.attr("data-workbook-id");
        WorkbookManager.pause(workbookId)
        .then(function() {
            updateWorkbookInfoWithReplace($workbookBox, workbookId);
            $("#container").addClass("noWorkbook noMenuBar");
        })
        .fail(function(error) {
            handleError(error, $workbookBox);
        });
    }

    function deactiveWorkbook($workbookBox) {
        var workbookId = $workbookBox.attr("data-workbook-id");
        WorkbookManager.deactivate(workbookId)
        .then(function() {
            updateWorkbookInfoWithReplace($workbookBox, workbookId);
        })
        .fail(function(error) {
            handleError(error, $workbookBox);
        });
    }

    function createWorkbookCard(workbook, extraClasses) {
        var workbookId = workbook.getId() || "";
        var workbookName = workbook.getName() || "";
        var createdTime = workbook.getCreateTime() || "";
        var modifiedTime = workbook.getModifyTime() || "";
        var description = workbook.getDescription() || "";
        var numWorksheets = workbook.getNumWorksheets() || 0;
        var noSeconds = true;

        extraClasses = extraClasses || [];

        if (workbook.isNoMeta()) {
            extraClasses.push("noMeta");
            workbookName += " (" + WKBKTStr.NoMeta + ")";
        }

        if (createdTime) {
            createdTime = xcHelper.getDate("-", null, createdTime) + " " +
                          xcHelper.getTime(null, createdTime, noSeconds);

        }

        if (modifiedTime) {
            modifiedTime = xcHelper.getDate("-", null, modifiedTime) + " " +
                           xcHelper.getTime(null, modifiedTime, noSeconds);
        }
        var activateTooltip;
        var isActive;
        var stopTab = "";

        if (workbookId === WorkbookManager.getActiveWKBK()) {
            extraClasses.push("active");
            isActive = WKBKTStr.Active;
            activateTooltip = WKBKTStr.ReturnWKBK;
            // pause button
            stopTab =
                '<div class="vertBarBtn pause"><div class="tab btn btn-small"' +
                ' data-toggle="tooltip" data-container="body"' +
                ' data-placement="auto right"' +
                ' title="' + WKBKTStr.Pause + '">' +
                    '<i class="icon xi-pause-circle"></i>' +
                '</div></div>';
        } else {
            activateTooltip = WKBKTStr.Activate;

            if (workbook.hasResource()) {
                isActive = WKBKTStr.Paused;
                // stop button
                stopTab =
                    '<div class="vertBarBtn deactivate"><div class="tab btn btn-small"' +
                    ' data-toggle="tooltip" data-container="body"' +
                    ' data-placement="auto right"' +
                    ' title="' + WKBKTStr.Deactivate + '">' +
                        '<i class="icon xi-stop-circle"></i>' +
                    '</div></div>';
            } else {
                isActive = WKBKTStr.Inactive;
                extraClasses.push("noResource");
                // delete button
                stopTab =
                '<div class="vertBarBtn delete"><div class="tab btn btn-small"' +
                ' data-toggle="tooltip" data-container="body"' +
                ' data-placement="auto right"' +
                ' title="' + WKBKTStr.Delete + '">' +
                    '<i class="icon xi-trash"></i>' +
                '</div></div>';
            }
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
                            ' data-original-title="' + workbookName + '">' +
                                '<div class="workbookName textOverflowOneLine">' +
                                    workbookName +
                                '</div>' +
                                '<div class="description textOverflowOneLine">' +
                                    description +
                                '</div>' +
                                // '<i class="preview icon xi-show xc-action" ' +
                                // ' data-toggle="tooltip" data-container="body"' +
                                // ' data-placement="top"' +
                                // ' data-title="' + CommonTxtTstr.Preview + '"' +
                                // '></i>' +
                            '</div>' +
                            '<div class="infoSection topInfo">' +
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
                                        WKBKTStr.State + ':' +
                                    '</div>' +
                                    '<div class="info isActive">' +
                                        isActive +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="rightBar vertBar">' +
                        '<div class="vertBarBtn activate"><div class="tab btn btn-small"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="auto right"' +
                        ' title="' + activateTooltip + '">' +
                            '<i class="icon xi-play-circle"></i>' +
                        '</div></div>' +
                        '<div class="vertBarBtn modify"><div class="tab btn btn-small"' +
                        ' data-toggle="tooltip" data-container="body"' +
                        ' data-placement="auto right"' +
                        ' title="' + WKBKTStr.EditName + '">' +
                            '<i class="icon xi-edit"></i>' +
                        '</div></div>' +
                        '<div class="vertBarBtn duplicate"><div class="tab btn btn-small"' +
                        ' data-toggle="tooltip" data-container="body" ' +
                        ' data-placement="auto right"' +
                        ' title="' + WKBKTStr.Duplicate + '">' +
                            '<i class="icon xi-duplicate"></i>' +
                        '</div></div>' +
                        stopTab +
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
            html = createWorkbookCard(activeWorkbook) + html;
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
