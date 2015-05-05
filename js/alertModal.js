window.Alert = (function($, Alert){
    var $alertModal = $("#alertModal");
    var $modalBackground = $("#modalBackground");
    var $newBtns = [];
    var $dataList = $("#alertlist");
    var $alertOptionLabel = $("#alertOptionLabel");
    var $alertOptionInput = $("#alertOptionInput");

    Alert.show = function(options) {
       /* options includes:
            title: titile of the alert
            instr: instruction information
            msg: alert cnotent
            isAlert: if it is an alert or a confirm
            isCheckBox: if checkbox is enabled  or disabled
            confirm: callback when click confirm button
        */
        configAlertModal(options);

        $alertModal.show();
        $modalBackground.fadeIn(100);

        xcHelper.removeSelectionRange();
    }

    Alert.error = function(title, error, unclosable) {
        var options = {};
        var type = typeof error;

        options.title = title;
        if (type === "object" && error.error) {
            options.msg = error.error;
        } else {
            options.msg = error;
        }
        options.isAlert = true;
        options.unclosable = unclosable;
        Alert.show(options);
    }

    Alert.getOptionVal = function() {
        var val = $alertOptionInput.val();

        return (jQuery.trim(val));
    }

    function closeAlertModal() {
        $newBtns.forEach(function($btn) {
            $btn.remove();
        });
        $newBtns = [];
        $dataList.empty();
        $alertOptionLabel.empty();
        // remove all event listener
        $alertModal.off();
        $alertModal.hide();

        if (!$modalBackground.hasClass("open")) {
            $modalBackground.fadeOut(200);
        }
    }

    // configuration for alert modal
    /* Cheng: how alertModal behaves when checkbox is checbox to "don't show again" 
        may need further discussion */
    function configAlertModal(options) {
        var $alertHeader = $("#alertHeader");
        var $alertContent = $("#alertContent");
        var $alretInstruct = $("#alertInstruction");
        var $alertBtn = $("#alertActions");
        var $checkbox = $("#alertCheckBox");
        var $confirmBtn = $alertBtn.find(".confirm");
        var $contentOptions = $alertContent.find(".options");

        // close alert modal
        $alertModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            if (options && options.unclosable) {
                return;
            }
            closeAlertModal();

            if (options && options.cancel) {
                options.cancel();
            }
        });

        // check box, default is unchecked
        $checkbox.find(".checkbox").removeClass("checked");
        $checkbox.addClass("inactive"); // now make it disabled

        $contentOptions.hide();
        $confirmBtn.hide();

        $alertOptionInput.val("");
        // set all given options
        if (options) {
            // set title
            if (options.title) {
                $alertHeader.find(".text").text(options.title);
            } else {
                $alertHeader.find(".text").text("");
            }
            // set alert message
            if (options.msg) {
                $alertContent.find(".text").text(options.msg);
            } else {
                $alertContent.find(".text").text("");
            }

            if (options.optList) {
                $dataList.append(options.optList.option);
                $alertOptionLabel.text(options.optList.label);
                $contentOptions.show();
            }
            // set alert instruction
            if (options.instr) {
                $alretInstruct.find(".text").text(options.instr);
                $alretInstruct.show();
            } else {
                $alretInstruct.hide();
            }
            // set checkbox
            if (options.isCheckBox) {
                 $alertModal.on("click", ".checkbox", function(event) {
                    event.stopPropagation();
                    $(this).toggleClass("checked");
                });
                $checkbox.show();
            } else {
                $checkbox.hide();
            }
            // set confirm button
            if (!options.isAlert) {

                if (options.buttons) {

                    options.buttons.forEach(function(btnOption) {
                        var className = btnOption.className;
                        var $btn = $confirmBtn.clone();

                        $newBtns.push($btn);
                        $alertBtn.prepend($btn);
                        $btn.show();
                        $btn.text(btnOption.name);
                        $btn.addClass(className);
                        $btn.click(function(event) {
                            event.stopPropagation();
                            closeAlertModal();
                            btnOption.func();
                        });
                    });

                    return;
                }

                $confirmBtn.show();
                $alertModal.on("click", ".confirm", function(event) {
                    event.stopPropagation();
                    closeAlertModal();
                    if(options.confirm) {
                        options.confirm();
                    }
                });
            }
        }
    }

    return (Alert);
}(jQuery, {}));