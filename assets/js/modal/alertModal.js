window.Alert = (function($, Alert){
    var $modal;   // $("#alertModal")
    var $modalBg; // $("#modalBackground")

    var $alertOptionInput; // $("#alertOptionInput")
    var $btnSection;       // $("#alertActions")

    var modalHelper;

    Alert.setup = function() {
        $modal = $("#alertModal");
        $modalBg = $("#modalBackground");
        $alertOptionInput = $("#alertOptionInput");
        $btnSection = $("#alertActions");

        modalHelper = new ModalHelper($modal, {
            "focusOnOpen": true,
            "noResize"   : true,
            "noCenter"   : true
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        xcHelper.dropdownList($modal.find(".dropDownList"), {
            "onSelect": function($li) {
                $alertOptionInput.val($li.text()).focus();
            }
        });
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
            confirm: callback to trigger when click confirm button
            cancel:  callback to trigger when click cancel button
            lockScreen: if screen should be frozen
            noAnimate: boolean, if true then remove fade in animation
            focusOnConfirm: boolean, if true then set focus on confirm button
        */
        if ($modal.hasClass('locked')) {
            // this handle the case that some modal failure handler
            // may close the modal and it will hide modalBackground
            $modalBg.show();
            $modalBg.addClass('locked');
            // alert modal is already opened and locked due to connection error
            return;
        }

        configAlertModal(options);

        var extraOptions = null;
        if (options.lockScreen) {
            extraOptions = {"noEsc": true};
            $modalBg.addClass('locked');
            $modal.draggable("destroy");
        }

        // Note that alert Modal's center position
        // is different from other modal, need this handle
        var $window = $(window);
        var winHeight   = $window.height();
        var winWidth    = $window.width();
        var modalWidth  = $modal.width();
        var modalHeight = $modal.height();

        var left = ((winWidth - modalWidth) / 2);
        var top  = ((winHeight - modalHeight) / 4);

        $modal.css({
            "left": left,
            "top" : top
        });

        modalHelper.setup(extraOptions)
        .always(function() {
            if (options.focusOnConfirm) {
                $btnSection.find(".confirm").focus();
            }
        });
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
        modalHelper.clear({"close": function() {
            // alert modal has its own closer
            return closeHelper($modalContainer);
        }});
        $btnSection.find(".funcBtn").remove();
        // remove all event listener
        $modal.off(".alert");
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
        var $alertInstr = $("#alertInstruction");
        if (options.instr) {
            $alertInstr.find(".text").text(options.instr);
            $alertInstr.show();
        } else {
            $alertInstr.hide();
        }

        // lock screen if necessary
        if (options.lockScreen) {
            $('#alertHeader').find('.close').css('pointer-events', 'none');
            $modal.addClass('locked');
            var $copySqlBtn = xcHelper.logoutButton("sql");
            var $logoutBtn = xcHelper.logoutButton();

            var supportDone = function(path, bid) {
                var text = ThriftTStr.CCNBE + "\n" +
                            "Bundle Id " + bid + " Generated at " + path;
                $("#alertContent .text").text(text);
            };
            var supportFail = function() {
                var text = ThriftTStr.CCNBE + "\n" +
                           CommonTxtTstr.GenBundleFail + ".";
                $("#alertContent .text").text(text);
            };
            var $supportBtn = xcHelper.logoutButton("support", supportDone, supportFail);

            if (options.logout) {
                $btnSection.prepend($logoutBtn, $copySqlBtn, $supportBtn);
            } else {
                $btnSection.prepend($copySqlBtn, $logoutBtn, $supportBtn);
            }
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
        } else {
            $checkbox.hide();
        }

        $('.logout, .cancel, .copySql').show();
        if (options.hideButtons) {
            for (var i = 0; i < options.hideButtons.length; i++) {
                $modal.find('.' + options.hideButtons[i]).hide();
            }
        }

        // set option list
        var $optionSection = $alertContent.find(".options");
        $alertOptionInput.val("");
        if (options.optList) {
            $("#alertlist").empty().append(options.optList.list);
            $("#alertOptionLabel").text(options.optList.label);
            $optionSection.show();
            $modal.addClass("withOptions");
        } else {
            $optionSection.hide();
            $modal.removeClass("withOptions");
        }

        // close alert modal
        $modal.on("click.alert", ".close, .cancel", function(event) {
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
                $modal.find(".close, .cancel").hide();
            } else {
                $modal.find(".close, .cancel").show();
            }
        } else {
            $confirmBtn.hide();
            if (options.lockScreen) {
                $modal.find(".close, .cancel").hide();
            }
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
        } else if (!options.isAlert) {
            if (options.lockScreen) {
                $confirmBtn.hide();
            } else {
                $confirmBtn.show();
                $modal.on("click.alert", ".confirm", function(event) {
                    event.stopPropagation();
                    closeAlertModal();
                    if (options.confirm) {
                        options.confirm();
                    }
                });
            }
        }
    }

    return (Alert);
}(jQuery, {}));
