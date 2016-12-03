window.Alert = (function($, Alert){
    var $modal;   // $("#alertModal")
    var $modalBg; // $("#modalBackground")
    var $btnSection; // $("#alertActions")

    var modalHelper;

    Alert.setup = function() {
        $modal = $("#alertModal");
        $modalBg = $("#modalBackground");
        $btnSection = $("#alertActions");

        modalHelper = new ModalHelper($modal, {
            "noResize"   : true,
            "center"     : {"verticalQuartile": true}
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $modal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : 167,
            "minWidth"   : 500,
            "containment": "document"
        });

        var alertList = new MenuHelper($modal.find(".dropDownList"), {
            "onSelect": function($li) {
                $("#alertOptionInput").val($li.text()).focus();
            }
        });
        alertList.setupListeners();
    };

    Alert.show = function(options) {
        options = options || {};
       /* options includes:
            title: title of the alert
            instr: instruction information
            msg: alert content
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
            onConfirm: callback to trigger when click confirm button
            onCancel:  callback to trigger when click cancel button
            lockScreen: if screen should be frozen
            focusOnConfirm: boolean, if true then set focus on confirm button,
            highZIndex: boolean, if true then will set z-index above locked
                        background modal
        */
        if ($modal.hasClass('locked')) {
            // this handle the case that some modal failure handler
            // may close the modal and it will hide modalBackground
            $modalBg.show();
            $modalBg.addClass('locked');
            // alert modal is already opened and locked due to connection error
            return;
        } else if ($('#container').hasClass('supportOnly') &&
            options.lockScreen) {
            // do not show any more modals that lock the screen
            return;
        }


        // call it here because alert.show() may be called when another alert is visible
        clean();
        configAlertModal(options);

        var extraOptions = {keepFnBar: options.keepFnBar};
        if (options.lockScreen) {
            extraOptions = {"noEsc": true};
            $modalBg.addClass('locked');
            // $modal.draggable("disable");
            $("#container").addClass('locked');
            // should not show initial screen
            $("#initialLoadScreen").hide();
        }

        if (options.highZindex) {
            $modal.addClass('highZindex');
        } else {
            $modal.removeClass('highZindex');
        }

        // resize modal back to it's smallest width and height
        var minWidth = $modal.css('min-width');
        var minHeight = $modal.css('min-height');
        $modal.width(minWidth);
        $modal.height(minHeight);

        modalHelper.setup(extraOptions);
    };

    Alert.error = function(title, error, options) {
        var type = typeof error;
        var msg;

        if (type === "object") {
            // if it's an try/catch error, code will also goes here
            msg = error.error || AlertTStr.ErrorMsg;
        } else {
            msg = error;
        }
        if (msg === undefined) {
            msg = title;
        }

        var alertOptions = {
            "title"  : title,
            "msg"    : msg,
            "isAlert": true
        };
        alertOptions = $.extend(options, alertOptions);
        Alert.show(alertOptions);
    };

    Alert.forceClose = function(keepBg) {
        closeAlertModal();
        $modal.removeClass('locked');
        if (!keepBg) {
            $modalBg.removeClass('locked');
        }
    };

    // hides the alert modal but doesn't close/reset  it
    Alert.tempHide = function() {
        $modal.addClass('xc-hidden');
    };

    Alert.unhide = function() {
        $modal.removeClass('xc-hidden');
    };

    Alert.getOptionVal = function() {
        var val = $("#alertOptionInput").val().trim();
        return val;
    };

    function closeAlertModal($modalContainer) {
        modalHelper.clear({"close": function() {
            // alert modal has its own closer
            return closeHelper($modalContainer);
        }});
    }

    function closeHelper($modalContainer) {
        var deferred = jQuery.Deferred();
        if ($modalContainer) {
            $modal.hide();
            $modalContainer.css("z-index", 40);
            deferred.resolve();
        } else if ($(".modalContainer:visible:not(#alertModal)").length > 0) {
            // apart from alert modal, other modal is on
            $modal.hide();
            deferred.resolve();
        } else {
            var fadeOutTime = gMinModeOn ? 0 : 300;

            $modal.hide();
            $modalBg.fadeOut(fadeOutTime, deferred.resolve);
        }

        return deferred.promise();
    }

    function clean() {
        $btnSection.find(".funcBtn").remove();
        $btnSection.find(".copySql, .logout, .genSub, .adminSupport").remove();
        // remove all event listener
        $modal.off(".alert");
        $modal.find(".confirm, .cancel, .close").show();
    }

    // configuration for alert modal
    /* Cheng: how alertModal behaves when checkbox is checbox to
        "don't show again" may need further discussion */
    function configAlertModal(options) {
        options = options || {};
        // set title
        var title = options.title || AlertTStr.Title;
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
        var $alertInstr = $("#alertInstruction");
        if (options.instr != null) {
            $alertInstr.find(".text").text(options.instr);
            $alertInstr.show();

            $modal.addClass('hasInstr');
        } else {
            $alertInstr.hide();
            $modal.removeClass('hasInstr');
        }

        // set checkbox,  default is unchecked
        var $checkbox = $("#alertCheckBox");
        $checkbox.find(".checkbox").removeClass("checked");
        $checkbox.addClass("inactive"); // now make it disabled
        if (options.isCheckBox) {
            $modal.on("click.alert", ".checkbox", function(event) {
                event.stopPropagation();
                $(this).toggleClass("checked");
            });
            $checkbox.show();
            $modal.addClass('hasCheckbox');
        } else {
            $checkbox.hide();
            $modal.removeClass('hasCheckbox');
        }

        // set option list
        var $optionSection = $alertContent.find(".options");
        $("#alertOptionInput").val("");
        if (options.optList) {
            $("#alertlist").empty().append(options.optList.list);
            $("#alertOptionLabel").text(options.optList.label);
            $optionSection.show();
            $modal.addClass("withOptions");
        } else {
            $optionSection.hide();
            $modal.removeClass("withOptions");
        }

        if (options.modal) {
            var $container = options.modal;
            $container.css("z-index", 15);
        }

        // set close and cancel button
        $modal.on("click.alert", ".close, .cancel", function(event) {
            event.stopPropagation();
            closeAlertModal(options.modal);
            if (options.onCancel instanceof Function) {
                options.onCancel();
            }
        });

        // set confirm button
        $modal.on("click.alert", ".confirm", function(event) {
            event.stopPropagation();
            closeAlertModal();
            if (options.onConfirm instanceof Function) {
                options.onConfirm();
            }
        });

        var $confirmBtn = $btnSection.find(".confirm");

        if (options.noCancel) {
            $modal.find(".close, .cancel").hide();
        }

        if (options.buttons) {
            $modal.find(".cancel").text(AlertTStr.CANCEL);
            $confirmBtn.hide();
            options.buttons.forEach(function(btnOption) {
                var className = "funcBtn";
                if (btnOption.className) {
                    className += " " + btnOption.className;
                }

                var $btn = $confirmBtn.clone();

                $btnSection.prepend($btn);

                $btn.show()
                    .text(btnOption.name)
                    .addClass(className);
                $btn.click(function (event) {
                    event.stopPropagation();
                    closeAlertModal();
                    btnOption.func();
                });
            });
        } else if (options.isAlert) {
            $modal.find(".cancel").text(AlertTStr.CLOSE);
            $confirmBtn.hide();
        } else {
            $modal.find(".cancel").text(AlertTStr.CANCEL);
        }

        // lock screen if necessary
        if (options.lockScreen) {
            $modal.addClass('locked');
            $modal.find(".close, .cancel").hide();
            $confirmBtn.hide();

            var $copySqlBtn = xcHelper.supportButton("sql");
            var $logoutBtn = xcHelper.supportButton();
            var $adminSupportBtn = xcHelper.supportButton("adminSupport");
            var $supportBtn = xcHelper.supportButton("support");

            if (options.expired) {
                $btnSection.prepend($logoutBtn);
            } else if (options.logout) {
                $btnSection.prepend($adminSupportBtn, $logoutBtn, $copySqlBtn,
                                    $supportBtn);
            } else {
                $btnSection.prepend($adminSupportBtn, $copySqlBtn, $logoutBtn,
                                    $supportBtn);
            }
        }

        if (options.hideButtons) {
            for (var i = 0; i < options.hideButtons.length; i++) {
                $modal.find('.' + options.hideButtons[i]).hide();
            }
        }
    }

    return (Alert);
}(jQuery, {}));
