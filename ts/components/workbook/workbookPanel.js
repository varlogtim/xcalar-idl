window.WorkbookPanel = (function($, WorkbookPanel) {
    var $workbookPanel; // $("#workbookPanel")
    var $workbookTopbar; // $workbookPanel.find(".topSection")
    var $workbookSection; // $workbookPanel.find(".bottomSection")
    var $newWorkbookCard; // $workbookPanel.find(".newWorkbookBox")
    var $welcomeCard; // $workbookTopbar.find(".welcomeBox")
    var $wkbkMenu; //$workbookPanel.find("#wkbkMenu")
    var sortkey = "modified"; // No longer user configurable
    var wasMonitorActive = false; // Track previous monitor panel state for when
                                  // workbook closes
    var newBoxSlideTime = 700;
    var $fileUpload;
    var $dropDownCard;   //stores the most recently clicked parent of the dropDown Menu

    var downloadingWKBKs;
    var duplicatingWKBKs;

    WorkbookPanel.setup = function() {
        $workbookPanel = $("#workbookPanel");
        $workbookTopbar = $workbookPanel.find(".topSection");
        $workbookSection = $workbookPanel.find(".bottomSection");
        $newWorkbookCard = $workbookPanel.find(".newWorkbookBox");
        $welcomeCard = $workbookTopbar.find(".welcomeBox");
        $fileUpload = $("#WKBK_uploads");
        $wkbkMenu = $workbookPanel.find("#wkbkMenu");
        xcMenu.add($wkbkMenu);
        downloadingWKBKs = [];
        duplicatingWKBKs = [];

        addTopbarEvents();
        addWorkbookEvents();
        setupDragDrop();

        var closeTimer = null;
        var doneTimer = null;
        // open or close workbook view
        $("#homeBtn").click(function() {
            $(this).blur();
            var $container = $("#container");
            var $dialogWrap = $("#dialogWrap");

            //remove the dataset hint
            $("#showDatasetHint").remove();

            if (WorkbookPanel.isWBMode()) {
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
                    WorkbookPanel.hide();
                    $container.removeClass("monitorMode setupMode");
                }
            } else {
                WorkbookPanel.show();
            }
        });
    };

    WorkbookPanel.initialize = function() {
        try {
            getWorkbookInfo();
        } catch (error) {
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    WorkbookPanel.show = function(isForceShow) {
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

        WorkbookPanel.listWorkbookCards();
    };

    WorkbookPanel.hide = function(immediate) {
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

    WorkbookPanel.forceShow = function() {
        // When it's forceShow, no older workbooks are displayed
        $("#container").addClass("noWorkbook noMenuBar");
        $("#container").removeClass("wkbkViewOpen");
        WorkbookPanel.show(true);
    };

    WorkbookPanel.goToMonitor = function() {
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

    WorkbookPanel.goToSetup = function() {
        $("#container").removeClass("monitorMode");
        $("#container").addClass("setupMode noMenuBar");
        MainMenu.tempNoAnim();
        if ($("#monitor-setup").hasClass("firstTouch")) {
            $("#monitor-setup").removeClass("firstTouch");
            MonitorConfig.refreshParams(true);
        }
    };

    WorkbookPanel.isWBMode = function() {
        return $("#container").hasClass("workbookMode");
    };

    WorkbookPanel.edit = function(workbookId, newName, description, isNew) {
        var $workbookBox = getWorkbookBoxById(workbookId);
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var oldWorkbookName = workbook.getName();
        var oldDescription = workbook.getDescription() || "";
        if (oldWorkbookName === newName && oldDescription === description) {
            return PromiseHelper.resolve();
        } else {
            var deferred = PromiseHelper.deferred();
            var promise;
            if (oldWorkbookName === newName) {
                // only update description
                promise = WorkbookManager.updateDescription(workbookId, description);
            } else {
                promise = WorkbookManager.renameWKBK(workbookId, newName, description);
            }
            $workbookBox.addClass("loading")
                            .find(".loadSection .text").text(WKBKTStr.Updating);
            var loadDef = PromiseHelper.deferred();
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
                if (isNew) {
                    $workbookBox.find(".workbookName").focus().select();
                    $workbookBox.find(".workbookName").addClass("focussed");
                }
            })

            return deferred.promise();
        }
    };

    WorkbookPanel.listWorkbookCards = function() {
        var html = "";
        var sorted = [];
        var workbooks = WorkbookManager.getWorkbooks();
        for (var id in workbooks) {
            sorted.push(workbooks[id]);
        }
        $workbookPanel.find(".workbookBox").not($newWorkbookCard).remove();

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
        // Add tooltips to all descriptions
        var $descriptions = $workbookSection.find(".workbookBox .description");
        for (var i = 0; i < $descriptions.length; i++) {
            xcTooltip.add($descriptions.eq(i),
                            {title: xcHelper.escapeHTMLSpecialChar($descriptions.eq(i).text())});
        }
    }

    WorkbookPanel.updateWorkbooks = function(info) {
        if ($dropDownCard &&
            $dropDownCard.attr("data-workbook-id") === info.triggerWkbk) {
            if (info.action === "rename") {
                $dropDownCard.attr("data-workbook-id",
                                WorkbookManager.getIDfromName(info.newName));
            } else if (info.action === "delete") {
                if ($wkbkMenu.is(":visible")) {
                    xcMenu.close($wkbkMenu);
                }
            }
        }
    }

    function addTopbarEvents() {
        // Events for the top bar, welcome message, news, etc
        // Welcome message listener
        // News-Help listener
        // Tutorial listener

        // go to monitor panel
        $workbookTopbar.find(".monitorBtn, .monitorLink").click(function(e) {
            e.preventDefault(); // prevent monitor link from actually navigating
            WorkbookPanel.goToMonitor();
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

    function addWorkbookEvents() {
        // New Workbook card
        $("#createWKBKbtn").click(function() {
            var wbName;
            var workbooks = WorkbookManager.getWorkbooks();
            wbName = wbDuplicateName('New Workbook', workbooks, 0);
            var $btn =$(this);
            $btn.addClass("inActive").blur();
            WorkbookPanel.createNewWorkbook(wbName)
            .always(function() {
                $btn.removeClass("inActive");
            });
        });

        $("#browseWKBKbtn").click(function() {
            $("#WKBK_uploads").click();
        });

        $fileUpload.change(function() {
            if ($fileUpload.val() !== "") {
                changeFilePath();
            }
        });

        $workbookSection.on("blur", ".workbookName", function() {
            var $workbookBox = $(this).closest(".workbookBox");
            var $this = $(this);
            if ($this.val() === $this.parent().attr("data-original-title")) {
                $this.removeClass("focussed");
                $this.removeClass("error");
                $this.attr("disabled", "disabled");
                return;
            }
            if (!validateName($this.val(), $workbookBox.attr("data-workbook-id"), $this)) {
                $this.addClass("error");
                $this.val($this.parent().attr("data-original-title"));
            } else {
                WorkbookPanel.edit($workbookBox.attr("data-workbook-id"), $(this).val())
                .then(function() {
                    $this.removeClass("focussed");
                    $this.attr("disabled", "disabled");
                })
                .fail(function() {
                    $this.addClass("error");
                    $this.val($this.parent().attr("data-original-title"));
                });
            }
        });

        $workbookSection.on("keypress", ".workbookName", function(event) {
            $(this).removeClass("error");
            if (event.which === keyCode.Enter) {
                $(this).blur();
            }
        });

        $workbookSection.on("click", ".vertBarBtn", function() {
            xcTooltip.hideAll();
            StatusBox.forceHide();
        });

        // Events for the actual workbooks
        // anywhere on workbook card
        $workbookSection.on("click", ".activate", function(event) {
            if ($(event.target).hasClass("preview") || $(event.target).hasClass("dropDown") || $(event.target).hasClass("focussed")) {
                return;
            }
            activateWorkbook($(this).closest(".workbookBox"));
        });

        // Edit button
        $wkbkMenu.on("click", ".modify", function() {
            var workbookId = $dropDownCard.attr("data-workbook-id");
            WorkbookInfoModal.show(workbookId);
        });

        //Download Button
        $wkbkMenu.on("click", ".download", function() {
            var workbookId = $dropDownCard.attr("data-workbook-id");
            var workbook = WorkbookManager.getWorkbook(workbookId);
            var workbookName = workbook.getName();

            //$dlButton.addClass("inActive");
            downloadingWKBKs.push(workbookName);

            WorkbookManager.downloadWKBK(workbookName)
            .fail(function(err) {
                StatusBox.show(err.error, $dropDownCard);
            })
            .always(function() {
                var index = downloadingWKBKs.indexOf(workbookName);
                if (index !== -1) {
                    downloadingWKBKs.splice(index, 1);
                }
            });
        });

        // Duplicate button
        $wkbkMenu.on("click", ".duplicate", function() {
            var workbookId = $dropDownCard.attr("data-workbook-id");
            // Create workbook names in a loop until we find a workbook name
            // that we can use
            var $dropDownMenu = $dropDownCard.find(".dropDown");
            var currentWorkbookName = $dropDownCard.find(".workbookName").val();
            var currentWorkbooks = WorkbookManager.getWorkbooks();
            currentWorkbookName = wbDuplicateName(currentWorkbookName, currentWorkbooks, 0);

            duplicatingWKBKs.push(currentWorkbookName);

            var deferred1 = createLoadingCard($dropDownCard);
            var deferred2 = WorkbookManager.copyWKBK(workbookId,
                                                    currentWorkbookName);

            PromiseHelper.when(deferred1, deferred2)
            .then(function($fauxCard, newId) {
                replaceLoadingCard($fauxCard, newId);
            })
            .fail(function($fauxCard, error) {
                handleError(error, $dropDownMenu);
                removeWorkbookBox($fauxCard);
            })
            .always(function() {
                var index = duplicatingWKBKs.indexOf(currentWorkbookName);
                if (index !== -1) {
                    duplicatingWKBKs.splice(index, 1);
                }
            });
        });

        // Delete button
        $wkbkMenu.on("click", ".delete", function() {
            Alert.show({
                "title": WKBKTStr.Delete,
                "msg": WKBKTStr.DeleteMsg,
                "onConfirm": function() {
                    deleteWorkbookHelper($dropDownCard);
                }
            });
        });

        // deactivate button
        $wkbkMenu.on("click", ".deactivate", function() {
            Alert.show({
                "title": WKBKTStr.Deactivate,
                "msg": WKBKTStr.DeactivateMsg,
                "onConfirm": function() {
                    deactiveWorkbook($dropDownCard);
                }
            });
        });

        $wkbkMenu.on("click", ".newTab", function() {
            activateWorkbook($dropDownCard, true);
        });

        $workbookSection.on("click", ".preview", function() {
            var $workbookBox = $(this).closest(".workbookBox");
            var workbookId = $workbookBox.attr("data-workbook-id");
            WorkbookPreview.show(workbookId);
        });

        $workbookSection.on("contextmenu", ".workbookBox", function(event) {
            event.preventDefault();
            $dropDownCard = $(this);

            openDrodDown();
        });

        $workbookSection.on("click", ".dropDown", function() {
            $dropDownCard = $(this).closest(".workbookBox");

            openDrodDown();
        });

        $workbookSection.on("mouseenter", ".tooltipOverflow", function() {
            var $div = $(this).find(".workbookName");
            xcTooltip.auto(this, $div[0]);
        });
    }

    function updateWorkbookInfo($workbookBox, workbookId) {
        $workbookBox.attr("data-workbook-id", workbookId);
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var modified = workbook.modified;
        var description = workbook.getDescription() || "";
        var name = workbook.getName();
        if (modified) {
            modified = moment(modified).format("M-D-Y h:mm A");
        } else {
            modified = "";
        }

        $workbookBox.find(".modifiedTime").text(modified);
        $workbookBox.find(".description").text(description);
        $workbookBox.find(".workbookName").val(name);
        if (description.trim().length > 0) {
            xcTooltip.add($workbookBox.find(".description"), {title: xcHelper.escapeHTMLSpecialChar(description)});
        } else {
            xcTooltip.remove($workbookBox.find(".description"));
        }

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

    WorkbookPanel.createNewWorkbook = function(workbookName, description, file) {
        var deferred = PromiseHelper.deferred();

        checkFileSize(file)
        .then(function() {
            return XcSupport.commitCheck();
        })
        .then(function() {
            var deferred1;
            if (!file) {
                deferred1 = WorkbookManager.newWKBK(workbookName);
            } else {
                deferred1 = WorkbookManager.uploadWKBK(workbookName, file);
            }
            var $sibling;
            if (WorkbookManager.getActiveWKBK()) {
                $sibling = getWorkbookBoxById(WorkbookManager.getActiveWKBK());
            } else {
                $sibling = $newWorkbookCard;
            }
            var deferred2 = createLoadingCard($sibling);
            return PromiseHelper.when(deferred1, deferred2);
        })
        .then(function(id, $fauxCard) {
            var $newCard = replaceLoadingCard($fauxCard, id, true);
            return WorkbookPanel.edit(id, workbookName, description, true);
        })
        .then(deferred.resolve)
        .fail(function(error, $fauxCard, isCancel) {
            if (isCancel) {
                deferred.resolve();
                return;
            }

            handleError(error || WKBKTStr.CreateErr, $("#createWKBKbtn"));
            removeWorkbookBox($fauxCard);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    function checkFileSize(file) {
        if (file == null) {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var size = file.size;
        var sizeLimit = 5 * MB; // 5MB
        if (size <= sizeLimit) {
            deferred.resolve();
        } else {
            var msg = xcHelper.replaceMsg(ErrWRepTStr.LargeFileUpload, {
                size: xcHelper.sizeTranslator(sizeLimit)
            });
            Alert.show({
                msg: msg,
                onConfirm: deferred.resolve,
                onCancel: function() {
                    deferred.reject(null, null, true);
                }
            });
        }
        return  deferred.promise();
    }

    function createLoadingCard($sibling) {
        var deferred = PromiseHelper.deferred();
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

    function replaceLoadingCard($card, workbookId, isNewWKBK) {
        var classes = ["loading"];
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var $updateCard = $(createWorkbookCard(workbook, classes, isNewWKBK));
        $card.replaceWith($updateCard);

        var animClasses = ".label, .info, .workbookName, .rightBar";
        $updateCard.removeClass("loading")
            .addClass("finishedLoading")
            .find(animClasses).hide().fadeIn();
        setTimeout(function() {
            $updateCard.removeClass("finishedLoading");
        }, 500);
        return $updateCard;
    }

    function getWorkbookBoxById(workbookId) {
        var $workbookBox = $workbookPanel.find(".workbookBox").filter(function() {
            return $(this).attr("data-workbook-id") === workbookId;
        });
        return $workbookBox;
    }

    function activateWorkbook($workbookBox, newTab) {
        var workbookId = $workbookBox.attr("data-workbook-id");
        var activeWKBKId = WorkbookManager.getActiveWKBK();
        if (!newTab) {
            if (activeWKBKId === workbookId) {
                WorkbookPanel.hide();
            } else {
                alertActivate(workbookId, activeWKBKId)
                .then(function() {
                    WorkbookManager.switchWKBK(workbookId)
                    .fail(function(error) {
                        handleError(error, $workbookBox);
                        // has chance that inactivate the fromWorkbook
                        // but fail to activate the toWorkbook
                        if (WorkbookManager.getActiveWKBK() == null
                            && activeWKBKId != null) {
                            var $activeWKBK = getWorkbookBoxById(activeWKBKId);
                            updateWorkbookInfoWithReplace($activeWKBK, activeWKBKId);
                        }
                    });
                });
            }
        } else {
            WorkbookManager.switchWKBK(workbookId, true, $workbookBox)
            .fail(function(error) {
                handleError(error, $workbookBox);
            });
        }
    }

    function alertActivate(workbookId, activeWKBKId) {
        if (activeWKBKId == null) {
            // no activate workbook case
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var txCache = Transaction.getCache();
        var keys = Object.keys(txCache);
        if (keys.length === 0) {
            // when no opeartion running
            if (workbook.hasResource()) {
                return PromiseHelper.resolve();
            } else {
                // when activate inactive workbook
                Alert.show({
                    title: WKBKTStr.Activate,
                    msg: WKBKTStr.ActivateInstr,
                    onConfirm: deferred.resolve,
                    onCancel: deferred.reject
                });
                return deferred.promise();
            }
        }
        
        var key = keys[0];
        var operation = txCache[key].getOperation();
        var msg = xcHelper.replaceMsg(WKBKTStr.SwitchWarn, {
            op: operation
        });
        
        Alert.show({
            title: AlertTStr.Title,
            msg: msg,
            onConfirm: deferred.resolve,
            onCancel: deferred.reject
        });
        return deferred.promise();
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

    function validateName(wbName, wbId, $wbCard) {
        return xcHelper.validate([
            {
                "$ele": $wbCard,
                "formMode": true
            },
            {
                "$ele": $wbCard,
                "formMode": true,
                "error": ErrTStr.InvalidWBName,
                "check": function() {
                    return !xcHelper.checkNamePattern("workbook", "check", wbName);
                }
            },
            {
                "$ele": $wbCard,
                "formMode": true,
                "error": xcHelper.replaceMsg(WKBKTStr.Conflict, {
                    "name": wbName
                }),
                "check": function() {
                    var workbooks = WorkbookManager.getWorkbooks();
                    for (var wkbkId in workbooks) {
                        if (workbooks[wkbkId].getName() === wbName && wbId !== wkbkId) {
                            return true;
                        }
                    }
                    return false;
                }
            }
        ]);
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

    function deactiveWorkbook($workbookBox) {
        var workbookId = $workbookBox.attr("data-workbook-id");
        var isActiveWkbk = WorkbookManager.getActiveWKBK() === workbookId;
        WorkbookManager.deactivate(workbookId)
        .then(function() {
            updateWorkbookInfoWithReplace($workbookBox, workbookId);
            if (isActiveWkbk) {
                $("#container").addClass("noWorkbook noMenuBar");
            }
        })
        .fail(function(error) {
            handleError(error, $workbookBox);
        });
    }

    function createWorkbookCard(workbook, extraClasses, isNewWKBK) {
        var workbookId = workbook.getId() || "";
        var workbookName = workbook.getName() || "";
        var createdTime = workbook.getCreateTime() || "";
        var createdTimeDisplay = createdTime;
        var modifiedTime = workbook.getModifyTime() || "";
        var modifiedTimeDisplay = modifiedTime;
        var createdTimeTip = "";
        var modifiedTimeTip = "";
        var description = workbook.getDescription() || "";
        var numWorksheets = workbook.getNumWorksheets() || 0;
        var time;

        extraClasses = extraClasses || [];

        if (workbook.isNoMeta()) {
            extraClasses.push("noMeta");
            workbookName += " (" + WKBKTStr.NoMeta + ")";
        }

        if (createdTime) {
            time = moment(createdTime);
            createdTimeDisplay = time.calendar();
            createdTimeTip = xcTimeHelper.getDateTip(time);
        }

        if (modifiedTime) {
            time = moment(modifiedTime);
            modifiedTimeDisplay = time.calendar();
            modifiedTimeTip = xcTimeHelper.getDateTip(time);
        }
        var activateTooltip;
        var isActive;
        var stopTab = "";

        if (workbook.hasResource()) {
            extraClasses.push("active");
            isActive = WKBKTStr.Active;
            activateTooltip = WKBKTStr.ReturnWKBK;
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
                    '<div class="content activate">' +
                        '<div class="innerContent">' +
                            '<div class="infoSection topInfo">' +
                                '<div class="subHeading tooltipOverflow" ' +
                                ' data-toggle="tooltip" data-container="body"' +
                                ' data-original-title="' + workbookName + '">' +
                                    '<input type="text" class="workbookName ' +
                                    'tooltipOverflow"' +
                                    ' value="' + workbookName + '"' +
                                    (isNewWKBK ? '' : ' disabled') +
                                    ' spellcheck="false"/>' +
                                    '<i class="preview icon xi-show xc-action" ' +
                                    ' data-toggle="tooltip" data-container="body"' +
                                    ' data-placement="top"' +
                                    ' data-title="' + CommonTxtTstr.Preview + '"' +
                                    '></i>' +
                                    '<i class="dropDown icon xi-ellipsis-h xc-action" ' +
                                    ' data-toggle="tooltip" data-container="body"' +
                                    ' data-placement="top"' +
                                    ' data-title="' + WKBKTStr.MoreActions + '"' +
                                    '></i>' +
                                '</div>' +
                                '<div class="description textOverflowOneLine">' +
                                    xcHelper.escapeHTMLSpecialChar(description) +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        TimeTStr.Created + ':' +
                                    '</div>' +
                                    '<div class="info createdTime" ' +
                                        createdTimeTip + '">' +
                                        createdTimeDisplay +
                                    '</div>' +
                                '</div>' +
                                '<div class="row clearfix">' +
                                    '<div class="label">' +
                                        TimeTStr.LastSaved + ':' +
                                    '</div>' +
                                    '<div class="info modifiedTime" ' +
                                        modifiedTimeTip + '">' +
                                        modifiedTimeDisplay +
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
                '</div>' +
            '</div>';

        return html;
    }

    function changeFilePath(dragFile) {
        var path;
        if (dragFile) {
            file = dragFile;
        } else {
            file = $fileUpload[0].files[0];
        }

        path = file.name.replace(/C:\\fakepath\\/i, '').trim();
        var wbName = path.substring(0, path.indexOf(".")).trim()
                    .replace(/ /g, "");
        wbName = xcHelper.checkNamePattern("Workbook", "fix", wbName);

        var workbooks = WorkbookManager.getWorkbooks();
        wbName = wbDuplicateName(wbName, workbooks, 0);

        WorkbookPanel.createNewWorkbook(wbName, null, file)
        .fail(function(error) {
            StatusBox.show(error.error || error, $("#browseWKBKbtn"));
        })
        .always(function() {
            $fileUpload.val("");
        });
    }

    function wbDuplicateName(wbName, workbooks, n) {
        if (n >= 10) {
            console.log("Too many attempts to find unique name.");
            return xcHelper.randName(wbName);
        }
        var numbering = "";
        if (n > 0) {
            numbering = "_" + n;
        }
        for (var wkbkId in workbooks) {
            if (workbooks[wkbkId].getName() === wbName + numbering) {
                return wbDuplicateName(wbName, workbooks, n + 1);
            }
        }
        return wbName + numbering;
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

    function openDrodDown() {
        if ($dropDownCard.hasClass("loading")) {
            return;
        }

        var workbookId = $dropDownCard.attr("data-workbook-id");
        var workbook = WorkbookManager.getWorkbook(workbookId);
        var workbookName = workbook.getName();

        var $dropDownLocation = $dropDownCard.find(".dropDown");

        var index = downloadingWKBKs.indexOf(workbookName);
        if (index !== -1) {
            $wkbkMenu.find(".download").addClass("inActive");
        } else {
            $wkbkMenu.find(".download").removeClass("inActive");
        }

        index = duplicatingWKBKs.indexOf(workbookName);
        if (index !== -1) {
            $wkbkMenu.find(".duplicate").addClass("inActive");
        } else {
            $wkbkMenu.find(".duplicate").removeClass("inActive");
        }

        if ($dropDownCard.hasClass("active")) {
            $wkbkMenu.find(".delete").addClass("xc-hidden");
            $wkbkMenu.find(".deactivate").removeClass("xc-hidden");

            if (workbookId === WorkbookManager.getActiveWKBK()) {
                $wkbkMenu.find(".newTab").addClass("inActive");
            } else {
                $wkbkMenu.find(".newTab").removeClass("inActive");
            }
        } else {
            $wkbkMenu.find(".deactivate").addClass("xc-hidden");
            $wkbkMenu.find(".delete").removeClass("xc-hidden");
            $wkbkMenu.find(".newTab").removeClass("inActive");
        }
        xcHelper.dropdownOpen($dropDownLocation, $wkbkMenu);
    }

    function setupDragDrop() {
        var ddUploader = new DragDropUploader({
            $container: $workbookPanel.find(".mainContent"),
            text: "Drop a workbook file to upload",
            onDrop: function(files) {
                //WorkbookInfoModal.show(null, true, files);
                changeFilePath(files);
            },
            onError: function(error) {
                switch (error) {
                    case ('invalidFolder'):
                        Alert.error(UploadTStr.InvalidUpload,
                                    UploadTStr.InvalidFolderDesc);
                        break;
                    case ('multipleFiles'):
                        Alert.show({
                            title: UploadTStr.InvalidUpload,
                            msg: UploadTStr.OneFileUpload
                        });
                        break;
                    default:
                        break;
                }
            }
        });
    }

    if (window.unitTestMode) {
        WorkbookPanel.__testOnly__ = {};
        WorkbookPanel.__testOnly__.changeFilePath = changeFilePath;

    }

    return (WorkbookPanel);
}(jQuery, {}));