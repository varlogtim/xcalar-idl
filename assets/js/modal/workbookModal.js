window.WorkbookModal = (function($, WorkbookModal) {
    var $workbookModal; // $("#workbookModal")
    var $optionSection; // $workbookModal.find(".optionSection")
    var $workbookInput; // $("#workbookInput")
    var $workbookLists; // $("#workbookLists")

    var modalHelper;
    // default select all workbooks and sort by name
    var reverseLookup = {
        "name"    : false,
        "created" : false,
        "modified": false,
        "srcUser" : false,
        "curUser" : false
    };
    var sortkey = "name";
    var activeActionNo = 0;

    WorkbookModal.setup = function() {
        $workbookModal = $("#workbookModal");
        $optionSection = $workbookModal.find(".optionSection");
        $workbookInput = $("#workbookInput");
        $workbookLists = $("#workbookLists");

        // constant
        var minHeight = 400;
        var minWidth  = 750;

        modalHelper = new ModalHelper($workbookModal, {
            "focusOnOpen": true,
            "minWidth"   : minWidth,
            "minHeight"  : minHeight
        });

        $workbookModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document"
        });

        $workbookModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        // open workbook modal
        $("#workbookBtn").click(function() {
            $(this).blur();
            WorkbookModal.show();
        });

        addWorkbookEvents();
    };

    WorkbookModal.initialize = function() {
        try {
            getWorkbookInfo();
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
    };

    WorkbookModal.show = function(isForceShow) {
        $(document).on("keypress", workbookKeyPress);

        var extraOptions;
        if (isForceShow) {
            getWorkbookInfo(isForceShow);
            extraOptions = {"noEsc": true};
            $workbookModal.draggable("destroy");
            $workbookModal.resizable("destroy");
        }

        // default choose first option (new workbook)
        $optionSection.find(".radioButton").eq(0).click();
        addWorkbooks();
        modalHelper.setup(extraOptions);
    };

    WorkbookModal.forceShow = function() {
        $workbookModal.find(".cancel, .close").hide();
        var $logoutBtn = xcHelper.supportButton();
        $workbookModal.find(".modalBottom").append($logoutBtn);

        WorkbookModal.show(true);
        // deafult value for new workbook
        $workbookInput.val("untitled");
        var input = $workbookInput.get(0);
        input.setSelectionRange(0, input.value.length);
    };

    function resetWorkbookModal() {
        $workbookModal.find(".active").removeClass("active");
        // default select all workbooks and sort by name
        reverseLookup = {
            "name"    : false,
            "created" : false,
            "modified": false,
            "srcUser" : false,
            "curUser" : false
        };
        sortkey = "name";
        $workbookInput.val("").focus();
    }

    function closeWorkbookModal() {
        modalHelper.clear();
        $(document).off("keypress", workbookKeyPress);
        resetWorkbookModal();
    }

    function addWorkbookEvents() {
        // click cancel or close button
        $workbookModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeWorkbookModal();
        });

        // click confirm button
        $workbookModal.on("click", ".confirm", function(event) {
            $(this).blur();
            event.stopPropagation();
            submitForm();
        });

        // click title to srot
        var $titleSection = $workbookLists.siblings(".titleSection");
        $titleSection.on("click", ".title", function() {
            var $title = $(this);

            $titleSection.find(".title.active").removeClass("active");
            $title.addClass("active");

            var key = $title.data("sortkey");
            if (key === sortkey) {
                reverseLookup[key] = !reverseLookup[key];
            } else {
                sortkey = key;
                reverseLookup[key] = false;
            }
            addWorkbooks();
        });

        // select a workbook
        $workbookLists.on("click", ".grid-unit", function(event) {
            event.stopPropagation();
            $workbookLists.find(".active").removeClass("active");
            $(this).addClass("active");
        });

        // deselect workbook
        // $workbookLists.click(function() {
        //     $workbookLists.find(".active").removeClass("active");
        // });

        // choose an option
        xcHelper.optionButtonEvent($optionSection, function(option) {
            var no = Number(option);
            switchAction(no);
        });

        // scroll the title with when the body is scrolled
        $workbookLists.scroll(function() {
            var scrollLeft = $(this).scrollLeft();
            $workbookLists.siblings(".titleSection").scrollLeft(scrollLeft);
        });
    }

    function workbookKeyPress(event) {
        switch (event.which) {
            case keyCode.Enter:
                // when focus on a button, no trigger
                if (modalHelper.checkBtnFocus()) {
                    break;
                }
                $workbookModal.find(".confirm").click();
                break;
            default:
                break;
        }
    }

    function getWorkbookInfo(isForceMode) {
        var $instr = $workbookModal.find(".modalInstruction .text");
        var user = Support.getUser();
        var html;

        if (isForceMode) {
            // forceMode has no any workbook info
            html = xcHelper.replaceMsg(WKBKTStr.NewWKBKInstr, {"user": user});
            $instr.html(html);
            return;
        }

        var workbooks = WKBKManager.getWKBKS();
        var activeWKBKId = WKBKManager.getActiveWKBK();
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

    // helper function for toggle in option section
    function switchAction(no) {
        xcHelper.assert((no >= 0 && no <= 3), "Invalid action");

        var $inputSection = $workbookModal.find(".inputSection");
        var $mainSection = $workbookModal.find(".modalMain");

        activeActionNo = no;

        $workbookLists.find(".active").removeClass("active");
        $workbookModal.removeClass("no-0")
                    .removeClass("no-1")
                    .removeClass("no-2")
                    .removeClass("no-3")
                    .addClass("no-" + no);

        switch (no) {
            // new workbook
            case 0:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled"); // for tab key switch
                $mainSection.addClass("unavailable");
                $workbookModal.find(".modalBottom .confirm")
                            .text(CommonTxtTstr.Create.toUpperCase());
                break;
            // continue workbook
            case 1:
                $inputSection.addClass("unavailable");
                $workbookInput.attr("disabled", "disabled");
                $mainSection.removeClass("unavailable");
                $workbookModal.find(".modalBottom .confirm")
                            .text(CommonTxtTstr.Continue.toUpperCase());
                break;
            // copy workbook
            case 2:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled");
                $mainSection.removeClass("unavailable");
                $workbookModal.find(".modalBottom .confirm")
                            .text(CommonTxtTstr.Copy.toUpperCase());
                break;
            // rename workbook
            case 3:
                $inputSection.removeClass("unavailable");
                $workbookInput.removeAttr("disabled"); // for tab key switch
                $mainSection.removeClass("unavailable");
                $workbookModal.find(".modalBottom .confirm")
                            .text(CommonTxtTstr.Rename.toUpperCase());
            default:
                break;
        }
    }

    function addWorkbooks() {
        var html = "";
        var sorted = [];
        var workbooks = WKBKManager.getWKBKS();

        for (var id in workbooks) {
            sorted.push(workbooks[id]);
        }

        var activeWKBKId = WKBKManager.getActiveWKBK();
        // sort by workbook.name
        var isNum = (sortkey === "created" || sortkey === "modified");
        sorted = sortObj(sorted, sortkey, isNum);
        sorted.forEach(function(workbook) {
            var wkbkId    = workbook.id;
            var created   = workbook.created;
            var modified  = workbook.modified;
            var gridClass = "grid-unit";

            if (wkbkId === activeWKBKId) {
                gridClass += " activeWKBK";
            }

            if (workbook.noMeta) {
                gridClass += " noMeta";
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
                    '<div class="name">' + workbook.name + '</div>' +
                    '<div>' + createdTime + '</div>' +
                    '<div>' + modifiedTime + '</div>' +
                    '<div>' + (workbook.srcUser || "") + '</div>' +
                    '<div>' + (workbook.curUser || "") + '</div>' +
                '</div>';
        });

        if (!sorted.length) {
            var text = WKBKTStr.WKBKnotExists;
            $optionSection.find('.radioButton').not(':first-child')
                                            .addClass('disabled')
                                            .attr("data-toggle", "tooltip")
                                            .attr("data-original-title", text)
                                            .attr("data-container", "body")
                                            .attr("title", text);
        } else {
            $optionSection.find('.radioButton').removeClass('disabled')
                                        .removeAttr("data-toggle")
                                        .removeAttr("data-placement")
                                        .removeAttr("data-original-title")
                                        .removeAttr("data-container")
                                        .removeAttr("title");
        }

        $workbookLists.html(html);
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
                        var workbooks = WKBKManager.getWKBKS();
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
        modalHelper.submit();

        Support.commitCheck()
        .then(function() {
            var innerDeferred = jQuery.Deferred();
            workbookAction(activeActionNo, workbookName)
            .then(innerDeferred.resolve)
            .fail(function(error) {
                if ($workbookModal.is(":visible")) {
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

    function workbookAction(actionNo, workbookName) {
        var deferred = jQuery.Deferred();
        var workbookId = $workbookLists.find(".active").data("wkbkid");

        if (actionNo === 0) {
            // create new workbook part
            goWaiting();

            WKBKManager.newWKBK(workbookName)
            .then(function(id) {
                return WKBKManager.switchWKBK(id);
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

            WKBKManager.switchWKBK(workbookId)
            .then(deferred.resolve)
            .fail(function(error) {
                cancelWaiting();
                deferred.reject(error);
            });
        } else if (actionNo === 2) {
            // copy workbook part
            goWaiting(true);

            WKBKManager.copyWKBK(workbookId, workbookName)
            .then(function(id) {
                return WKBKManager.switchWKBK(id);
            })
            .then(deferred.resolve)
            .fail(function(error) {
                cancelWaiting();
                deferred.reject(error);
            });
        } else if (actionNo === 3) {
            goWaiting();
            WKBKManager.renameWKBK(workbookId, workbookName)
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

        if (reverseLookup[key] === true) {
            objs.reverse();
        }

        return objs;
    }

    function goWaiting(hasIcon) {
        $workbookModal.addClass('inactive');

        if (hasIcon) {
            $('body').append('<div id="workbookModalWaitingIcon" ' +
                            'class="waitingIcon"></div>');
            $('#workbookModalWaitingIcon').css({
                left: '50%',
                top : '50%'
            }).fadeIn();
        }
    }

    function cancelWaiting() {
        $workbookModal.removeClass('inactive');
        $("#workbookModalWaitingIcon").remove();
    }

    return (WorkbookModal);
}(jQuery, {}));
