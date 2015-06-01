window.Alert = (function($, Alert){
    var $alertModal       = $("#alertModal");
    var $modalBackground  = $("#modalBackground");

    var $alertOptionInput = $("#alertOptionInput");
    var $btnSection       = $("#alertActions");

    var modalHelper       = new xcHelper.Modal($alertModal, 
                                               {"focusOnOpen": true});

    Alert.setup = function() {
        $alertModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
        });

         xcHelper.dropdownList($alertModal.find(".listSection"), {
            "onSelect" : function($li) {
                $alertOptionInput.val($li.text()).focus();
            }
        });
    }

    Alert.show = function(options) {
       /* options includes:
            title: titile of the alert
            instr: instruction information
            msg: alert cnotent
            isAlert: if it is an alert or a confirm
            isCheckBox: if checkbox is enabled  or disabled
            unclosable: if set true, will on close the modal when close
            optList: an object to setup datalist in alert modal, it contains:
                label: label to show
                list: options in the datalist
            buttons: buttons to show instead of confirm buttonm which contains:
                name: name of the button
                className: class of the button
                func: callback to trigger when click
            confirm: callback to trigger when click confirm button
            cancel:  callback to trigger when click cancel button
        */
        configAlertModal(options);

        $alertModal.show();
        $modalBackground.fadeIn(100, function() {
            Tips.refresh();
        });

        xcHelper.removeSelectionRange();

        modalHelper.setup();
    }

    Alert.error = function(title, error, options) {
        var type = typeof error;
        var msg;

        if (type === "object") {
            msg = error.error || "Error Occurred!";
        } else {
            msg = error;
        }

        var alertOptions = {
            "title"     : title,
            "msg"       : msg,
            "isAlert"   : true
        };

        alertOptions = $.extend(options, alertOptions);
        Alert.show(alertOptions);
    }

    Alert.getOptionVal = function() {
        var val = $alertOptionInput.val();
        return (jQuery.trim(val));
    }

    function closeAlertModal() {
        $btnSection.find(".funcBtn").remove();
        // remove all event listener
        $alertModal.off();
        $alertModal.hide();

        modalHelper.clear();

        if (!$modalBackground.hasClass("open")) {
            $modalBackground.fadeOut(200, function(){
                Tips.refresh();
            });
        }
    }

    // configuration for alert modal
    /* Cheng: how alertModal behaves when checkbox is checbox to "don't show again" 
        may need further discussion */
    function configAlertModal(options) {
        options = options || {};
        // set title
        var title = options.title || "Warning";
        $("#alertHeader").find(".text").text(title);

        // set alert message
        var msg           = options.msg || "";
        var $alertContent = $("#alertContent");
        $alertContent.find(".text").text(msg);

        // set alert instruction
        var $alretInstr = $("#alertInstruction");
        if (options.instr) {
            $alretInstr.find(".text").text(options.instr);
            $alretInstr.show();
        } else {
            $alretInstr.hide();
        }

        // set checkbox,  default is unchecked
        var $checkbox = $("#alertCheckBox");
        $checkbox.find(".checkbox").removeClass("checked");
        $checkbox.addClass("inactive"); // now make it disabled
        if (options.isCheckBox) {
             $alertModal.on("click", ".checkbox", function(event) {
                event.stopPropagation();
                $(this).toggleClass("checked");
            });
            $checkbox.show();
        } else {
            $checkbox.hide();
        }

        // set option list
        var $optionSection = $alertContent.find(".options");
        $alertOptionInput.val("");
        if (options.optList) {
            $("#alertlist").empty().append(options.optList.list);
            $("#alertOptionLabel").text(options.optList.label);
            $optionSection.show();
        } else {
            $optionSection.hide();
        }

        // close alert modal
        $alertModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();

            closeAlertModal();

            if (options.cancel) {
                options.cancel();
            }
        });

        // set confirm button
        var $confirmBtn = $btnSection.find(".confirm");
        if (!options.isAlert) {
            if (options.buttons) {
                $confirmBtn.hide();
                options.buttons.forEach(function(btnOption) {
                    var className = btnOption.className + " funcBtn";
                    var $btn      = $confirmBtn.clone();

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
                $confirmBtn.show();
                $alertModal.on("click", ".confirm", function(event) {
                    event.stopPropagation();
                    closeAlertModal();
                    if(options.confirm) {
                        options.confirm();
                    }
                });
            }
        } else {
            $confirmBtn.hide();
        }
    }

    return (Alert);
}(jQuery, {}));