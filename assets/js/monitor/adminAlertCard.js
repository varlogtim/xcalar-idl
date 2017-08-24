window.AdminAlertCard = (function($, AdminAlertCard) {
    var $card;             // $("adminAlertCard")

    AdminAlertCard.setup = function() {
        $card = $("#adminAlertCard");
        addCardEvents();
    };

    function submitForm() {
        var alertOption = {
            "title": MonitorTStr.AdminAlert,
            "message": "From " + XcSupport.getUser() + " : " +
                       $card.find(".alert-msg").val()
        };
        if (alertOption.message) {
            XcSocket.sendMessage("adminAlert", alertOption);
        }
        clear();
    }

    function addCardEvents() {
        $("#adminAlert").click(function() {
            $card.removeClass("xc-hidden");
        });

        $card.find(".alert-msg").on("input", function() {
            if (!this.value) {
                $card.find(".confirm").addClass("btn-disabled");
            } else {
                $card.find(".confirm").removeClass("btn-disabled");
            }
        });
        // click cancel or close button
        $card.on("click", ".close", function() {
            event.stopPropagation();
            closeCard();
        });
        $card.on("click", ".clear", function() {
            clear();
        });
        // click send button
        $card.on("click", ".confirm", function() {
            submitForm();
        });
        // press enter when input
        $card.find(".alert-msg").keypress(function(e) {
            if (e.which === keyCode.Enter && !e.shiftKey) {
                e.preventDefault();
                submitForm();
            }
        });
    }

    function closeCard() {
        $card.addClass("xc-hidden");
        clear();
    }

    function clear() {
        $card.find(".alert-msg").val("");
        $card.find(".confirm").addClass("btn-disabled");
    }

    return (AdminAlertCard);

}(jQuery, {}));
