window.Alert = (function($, Alert){
    var $alertModal       = $("#alertModal");
    var $modalBackground  = $("#modalBackground");

    var $alertOptionInput = $("#alertOptionInput");
    var $btnSection       = $("#alertActions");

    var modalHelper = new xcHelper.Modal($alertModal, {
        "focusOnOpen": true,
        "noResize"   : true,
        "noCenter"   : true
    });

    Alert.setup = function() {
        $alertModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        xcHelper.dropdownList($alertModal.find(".dropDownList"), {
            "onSelect": function($li) {
                $alertOptionInput.val($li.text()).focus();
            }
        });
    };

    Alert.show = function(options) {
       /* options includes:
            title: titile of the alert
            instr: instruction information
            msg: alert cnotent
            msgTemplate: instead of change alert text, change it's html
            isAlert: if it is an alert or a confirm
            isCheckBox: if checkbox is enabled or disabled
            modal: an modal element that trigger the alert
            optList: an object to setup datalist in alert modal, it contains:
                label: label to show
                list: options in the datalist
            buttons: buttons to show instead of confirm buttonm which contains:
                name: name of the button
                className: class of the button
                func: callback to trigger when click
            hideButtons: array of button class names to hide,
                        values can be: logout, copySql, or cancel
            confirm: callback to trigger when click confirm button
            cancel:  callback to trigger when click cancel button
            lockScreen: if screen should be frozen
            noAnimate: boolean, if true then remove fade in animation
        */
        if ($alertModal.hasClass('locked')) {
            // this handle the case that some modal failure handler
            // may close the modal and it will hide modalBackground
            $modalBackground.show();
            $modalBackground.addClass('locked');
            // alert modal is already opened and locked due to connection error
            return;
        }

        configAlertModal(options);

        if (options.lockScreen) {
            modalHelper.setup({"noEsc": true});
            $modalBackground.addClass('locked');
        } else {
            modalHelper.setup();
        }

        // Note that alert Modal's center position
        // is different from other modal, need this handle
        var $window = $(window);
        var winHeight   = $window.height();
        var winWidth    = $window.width();
        var modalWidth  = $alertModal.width();
        var modalHeight = $alertModal.height();

        var left = ((winWidth - modalWidth) / 2);
        var top  = ((winHeight - modalHeight) / 4);

        $alertModal.css({
            "left": left,
            "top" : top
        });

        if (gMinModeOn || options.noAnimate) {
            $modalBackground.show();
            $alertModal.show();
            Tips.refresh();
        } else {
            // alert should be fast, so the fade time
            // is different from other Modal,
            // XXX change it if there is better effect
            $modalBackground.fadeIn(180, function() {
                $alertModal.fadeIn(100);
                Tips.refresh();
            });
        }
    };

    Alert.error = function(title, error, options) {
        var type = typeof error;
        var msg;

        if (type === "object") {
            msg = error.error || "Error Occurred!";
        } else {
            msg = error;
        }

        var alertOptions = {
            "title"  : title,
            "msg"    : msg,
            "isAlert": true
        };

        alertOptions = $.extend(options, alertOptions);
        Alert.show(alertOptions);
    };

    Alert.getOptionVal = function() {
        var val = $alertOptionInput.val();
        return (jQuery.trim(val));
    };

    function closeAlertModal($modalContainer) {
        $btnSection.find(".funcBtn").remove();
        // remove all event listener
        $alertModal.off(".alert");
        modalHelper.clear();

        if ($modalContainer) {
            $alertModal.hide();
            $modalContainer.css("z-index", 40);
            return;
        }

        var fadeOutTime = gMinModeOn ? 0 : 300;

        $alertModal.hide();

        if ($(".modalContainer:visible:not(#alertModal)").length > 0) {
            // apart from alert modal, other modal is on
            Tips.refresh();
        } else {
            $modalBackground.fadeOut(fadeOutTime, function() {
                Tips.refresh();
            });
        }
    }

    // configuration for alert modal
    /* Cheng: how alertModal behaves when checkbox is checbox to
        "don't show again" may need further discussion */
    function configAlertModal(options) {
        options = options || {};
        // set title
        var title = options.title || "Warning";
        $("#alertHeader").find(".text").text(title);

        // set alert message
        var $alertContent = $("#alertContent");
        var msgTemplate = options.msgTemplate || null;
        if (msgTemplate != null) {
            $alertContent.find(".text").html(msgTemplate);
        } else {
            var msg = options.msg || "";
            $alertContent.find(".text").empty().text(msg);
        }

        // set alert instruction
        var $alretInstr = $("#alertInstruction");
        if (options.instr) {
            $alretInstr.find(".text").text(options.instr);
            $alretInstr.show();
        } else {
            $alretInstr.hide();
        }

        // lock screen if necessary
        if (options.lockScreen) {
            $('#alertHeader').find('.close').css('pointer-events', 'none');
            $alertModal.addClass('locked');
            var $copySqlBtn = $('<button type="button" ' +
                                'class="btn btnMid copySql" ' +
                                'data-toggle="tooltip" ' +
                                'title="Copy the SQL log onto your clipboard">' +
                                'Copy log</button>');

            var $logoutBtn = $('<button type="button" ' +
                                'class="btn btnMid logout" ' +
                                'data-toggle="tooltip" ' +
                                'title="Log Out">' +
                                'Log Out</button>');

            var $supportBtn = $('<button type="button" ' +
                                'class="btn btnMid logout" ' +
                                'data-toggle="tooltip" ' +
                                'title="Generate Support Bundle">' +
                                'Generate Bundle</button>');

            if (options.logout) {
                $btnSection.prepend($logoutBtn, $copySqlBtn, $supportBtn);
            } else {
                $btnSection.prepend($copySqlBtn, $logoutBtn, $supportBtn);
            }

            $copySqlBtn.click(function() {
                var $hiddenInput = $("<input>");
                $("body").append($hiddenInput);
                var logText = "";
                // logText += "Error: " + $('#alertHeader').find('.text')
                //                                         .text() + ", ";
                // logText += "Description: " + $('#alertContent').find('.text')
                //                                                .text();
                var sqlLogs = SQL.getLogs();
                var sql;
                if (sqlLogs.length === 0) {
                    sql = SQL.getLocalStorage();
                } else {
                    sql = JSON.stringify(sqlLogs);
                }

                if (sql !== "[]") {
                    // logText += ", SQL: " + sql;
                    logText = sql;
                }

                $hiddenInput.val(logText).select();
                document.execCommand("copy");
                $hiddenInput.remove();
                xcHelper.showSuccess();
            });

            $logoutBtn.click(function() {
                unloadHandler();
            });

            $supportBtn.click(function() {
                var $btn = $(this);
                xcHelper.toggleBtnInProgress($btn);
                // Tis flow is a little from xcHelper.genSub
                XcalarSupportSend()
                .then(function(ret) {
                    xcHelper.showSuccess();
                    $btn.text("Bundle Generated at" + ret)
                        .addClass("btnInactive");
                })
                .fail(function(error) {
                    console.error(error);
                    // XXX TODOs: use xcHelper.showFail() instead
                    // (function not implement yet!)
                    xcHelper.toggleBtnInProgress($btn);
                    var text = $btn.text();
                    $btn.text("Failed!");
                    setTimeout(function() {
                        $btn.text(text);
                    }, 1000);
                });
            });
        }

        // set checkbox,  default is unchecked
        var $checkbox = $("#alertCheckBox");
        $checkbox.find(".checkbox").removeClass("checked");
        $checkbox.addClass("inactive"); // now make it disabled
        if (options.isCheckBox) {
            $alertModal.on("click.alert", ".checkbox", function(event) {
                event.stopPropagation();
                $(this).toggleClass("checked");
            });
            $checkbox.show();
        } else {
            $checkbox.hide();
        }

        $('.logout, .cancel, .copySql').show();
        if (options.hideButtons) {
            for (var i = 0; i < options.hideButtons.length; i++) {
                $alertModal.find('.' + options.hideButtons[i]).hide();
            }
        }

        // set option list
        var $optionSection = $alertContent.find(".options");
        $alertOptionInput.val("");
        if (options.optList) {
            $("#alertlist").empty().append(options.optList.list);
            $("#alertOptionLabel").text(options.optList.label);
            $optionSection.show();
            $alertModal.addClass("withOptions");
        } else {
            $optionSection.hide();
            $alertModal.removeClass("withOptions");
        }

        // close alert modal
        $alertModal.on("click.alert", ".close, .cancel", function(event) {
            event.stopPropagation();

            closeAlertModal(options.modal);

            if (options.cancel) {
                options.cancel();
            }
            if (options.onClose) {
                options.onClose();
            }
        });

        if (options.modal) {
            var $container = options.modal;
            $container.css("z-index", 15);
        }

        // set confirm button
        var $confirmBtn = $btnSection.find(".confirm");
        // var $cancelBtn  = $btnSection.find(".cancel");
        if (!options.isAlert) {
            if (options.noCancel || options.lockScreen) {
                $alertModal.find(".close, .cancel").hide();
            } else {
                $alertModal.find(".close, .cancel").show();
            }

            if (options.buttons) {
                $confirmBtn.hide();
                options.buttons.forEach(function(btnOption) {
                    var className = "funcBtn";
                    if (btnOption.className) {
                        className += " " + btnOption.className;
                    }

                    var $btn = $confirmBtn.clone();

                    $btnSection.prepend($btn);
                    $btn.show();
                    $btn.text(btnOption.name);
                    $btn.addClass(className);
                    $btn.click(function (event) {
                        event.stopPropagation();
                        closeAlertModal();
                        btnOption.func();
                    });
                });
                return;
            } else {
                if (options.lockScreen) {
                    $confirmBtn.hide();
                } else {
                    $confirmBtn.show();
                    $alertModal.on("click.alert", ".confirm", function(event) {
                        event.stopPropagation();
                        closeAlertModal();
                        if (options.confirm) {
                            options.confirm();
                        }
                    });
                }
            }
        } else {
            $confirmBtn.hide();
            if (options.lockScreen) {
                $alertModal.find(".close, .cancel").hide();
            }
        }
    }

    return (Alert);
}(jQuery, {}));
