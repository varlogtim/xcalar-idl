window.Alert = (function(){
    var $alertModal = $("#alertModal");
    var $modalBackground = $("#modalBackground");

    var self = {};

    self.show = function(options) {
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

        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    self.error = function(title, error, unclosable) {
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
        self.show(options);
    }

    function closeAlertModal() {
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

        // close alert modal
        $alertModal.on("click", ".close, .cancel", function(event) {
            event.stopPropagation();
            if (options && options.unclosable) {
                return;
            }
            closeAlertModal();
        });

        // check box, default is unchecked
        $checkbox.find(".checkbox").removeClass("checked");
        $checkbox.addClass("inactive"); // now make it disabled

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
                $('#alertContent .text').text(options.msg);
            } else {
                $('#alertContent .text').text("");
            }
            // set alert instruction
            if (options.instr) {
                $alretInstruct.find(".text").text(options.instr);
                $alretInstruct.show();
            } else {
                $alretInstruct.hide();
            }
            // set confirm button
            if (options.isAlert) {
                $alertBtn.find(".confirm").hide();
            } else {
                $alertBtn.find(".confirm").show();
                $alertModal.on("click", ".confirm", function(event) {
                    event.stopPropagation();
                    closeAlertModal();
                    if(options.confirm) {
                        options.confirm();
                    }
                });
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
        }
    }

    return (self);
}());