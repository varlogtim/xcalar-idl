Alert = (function(){
    var $alertModal = $("#alertModal");
    var $modalBackground = $("#modalBackground");

    AlertModal = function() {}

    AlertModal.prototype.show = function(options) {
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
        window.getSelection().removeAllRanges();
    }

    function closeAlertModal() {
        // remove all event listener
        $alertModal.off();

        $alertModal.hide();
        $modalBackground.fadeOut(200);
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
                $('#alertContent').text(options.msg);
            } else {
                $('#alertContent').text("");
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
                    if(options.confirm) {
                        options.confirm();
                    }
                    closeAlertModal();
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

    var self = new AlertModal();
    return (self);
})();