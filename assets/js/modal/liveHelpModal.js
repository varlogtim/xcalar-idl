window.LiveHelpModal = (function($, LiveHelpModal) {
    var $modal;  // $("#liveHelpModal");
    var modalHelper;
    var userName;
    var fullName;
    var email;
    var timer;
    var supportLeft;
    var socket;
    // A flag which controls whether to display this modal or not
    var flag = true;
    // Initial setup
    LiveHelpModal.setup = function() {
        if (flag) {
            $("#userMenu").find(".liveHelp").hide();
        }
        $modal = $("#liveHelpModal");
        modalHelper = new ModalHelper($modal, {
            "sizeToDefault": true,
            "noBackground": true,
            "noCenter": true,
            "noEnter": true
        });
        userName = XcSupport.getFullUsername();
        addModalEvents();
        // Consider reading url from config files later
        var url = "ec2-52-37-245-88.us-west-2.compute.amazonaws.com:12124";
        var options = {
            "reconnectionAttempts": 50
        };
        socket = io.connect(url, options);
        addSocketEvent();
    };
    // Three steps for user to connect to liveHelp:
    // 1. Request a connection
    // 2. Wait to be served by one of the supports
    // 3. Start chatting

    // Everytime click on 'liveHelp' on menu
    LiveHelpModal.show = function() {
        modalHelper.setup();
        // If reqConn UI is displayed, hide all other UIs
        if ($modal.find(".reqConn").is(":visible")) {
            $modal.find(".chatBox").hide();
        }
    };
    // Request a connection to the support
    function requestConn(autoSend, supportLeft) {
        if (!autoSend) {
            // If this request is caused by a disconnection from support, show instruction
            if (supportLeft) {
                appendMsg(AlertTStr.SuppLeft, "sysMsg");
            }
            appendMsg(AlertTStr.EmailFunc, "sysMsg");
            appendMsg(AlertTStr.WaitChat, "sysMsg");
        }
        if (socket.connected == false) {
            socket.connect();
        }
        // Send the request to socket
        socket.emit("liveHelpConn", userName);
        // Hide reqConn UI, display chatting UI
        $modal.find(".reqConn").hide();
        $modal.find(".chatBox").show();
        $modal.find(".sendMsg").prop("disabled", true);
        clearInput();
    }
    // Support is ready to chat
    function readyToChat(readyOpts) {
        clearInterval(timer);
        $modal.find(".sendMsg").prop("disabled", false);
        supportLeft = false;
        appendMsg(AlertTStr.StartChat + readyOpts.supportName, "sysMsg");
    }
    // Support is disconnected, user needs to wait to be served
    function returnToWait() {
        supportLeft = true;
        requestConn(false, supportLeft);
        timer = setInterval(function() {
                requestConn(true);
        }, 10000);
    }
    // Only for sending messages
    function submitForm() {
        var message = {
            "room": userName,
            "content": userName + ": " + $modal.find(".sendMsg").val()
        };
        socket.emit("liveHelpMsg", message);
        appendMsg(message.content, "userMsg");
        clearInput();
    }
    // Update the chat messages in chat box
    function appendMsg(content, type) {
        var row = "<div class='" + type + "'></div><div class='clear'></div>";
        var $content = $modal.find(".chatMsg");
        var scrollHeight = $content[0].scrollHeight;
        var curScrollTop = $content.scrollTop();
        var contentHeight = $content.height();
        $modal.find(".chatMsg").append(row);
        $modal.find(".chatMsg").find("." + type).last()
                .html("<p class='text '" + type + ">"+content+"</p>");
        if (curScrollTop + contentHeight + 30 > scrollHeight) {
            $content.scrollTop($content[0].scrollHeight);
        }
    }
    // Clear all input
    function clearInput() {
        $modal.find(".sendMsg").val("");
        $modal.find("input").val("");
        $modal.find(".reqConnBtn").addClass("btn-disabled");
    }
    // Resize send area
    function resetSendArea() {
        var sendArea = $modal.find(".sendArea")[0];
        var chatMsg = $modal.find(".chatMsg")[0];
        $(sendArea).css("height", "80px");
        $(chatMsg).css("height", "calc(100% - 90px)");
    }
    // Send email
    function sendEmailTo(dest) {
        if (!$modal.find(".reqConn").is(":visible")) {
            var content = "";
            $modal.find(".userMsg, .supportMsg").each(function(i,e) {
                content += $(e).text() + "\n";
            })
            var mailOpts = {
                from: 'support@xcalar.com',
                to: dest,
                subject: 'Support Chat History for ' + fullName,
                text: content
            }
            socket.emit("sendEmail", mailOpts, function() {
                appendMsg(AlertTStr.EmailSent, "sysMsg");
            });
        }
    }
    function addModalEvents() {
        // Enable requesting connection only when both name and email are given
        $modal.find(".reqConn input").on("input", function() {
            if($modal.find(".name").val() && $modal.find(".email").val()) {
                $modal.find(".reqConnBtn").removeClass("btn-disabled");
            } else {
                $modal.find(".reqConnBtn").addClass("btn-disabled");
            }
        });
        // Click 'send' button when it is for requesting connection
        $modal.on("click", ".reqConnBtn", function() {
            fullName = $modal.find(".name").val();
            email = $modal.find(".email").val();
            if (!isValidEmail(email)) {
                $modal.find(".emailInfo").html("Invalid email address");
                return;
            }
            requestConn();
            timer = setInterval(function() {
                requestConn(true);
            }, 10000);
        });
        // press enter when input
        $modal.find(".sendMsg").keypress(function(e) {
            if(e.which == keyCode.Enter && !e.shiftKey && $(this).val()) {
                e.preventDefault();
                submitForm();
                resetSendArea();
            }
        });
        // Enable sending message only when user enters chat message
        $modal.find(".sendMsg").on("input", function() {
            var sendArea = $modal.find(".sendArea")[0];
            var sendMsg = $modal.find(".sendMsg")[0];
            var chatMsg = $modal.find(".chatMsg")[0];
            // First, try to resize to default
            resetSendArea();
            var scrollHeight = sendMsg.scrollHeight;
            var toIncrease = scrollHeight - $(sendArea).height();
            // If need to increase height
            if (toIncrease > 0 ) {
                var newHeight = $(sendArea).height() + toIncrease;
                // If the new height is below max-height, adjust accordingly
                if (newHeight <= 200) {
                    $(sendArea).height($(sendArea).height() + toIncrease);
                    $(chatMsg).css("height", "calc(100% - " + (newHeight + 10) + "px");
                } else {
                    // Set to max-height
                    $(sendArea).height(200);
                    $(chatMsg).css("height", "calc(100% - 210px)");
                }
            }
        });
        $modal.on("click", ".sendEmail", function() {
            sendEmailTo(email);
        });
        // Click leave button
        $modal.on("click", ".close", function() {
            // If it is not on reqConn UI, ask the user if he needs all messages
            // to be sent to his email
            if (!$modal.find(".reqConn").is(":visible")) {
                appendMsg(AlertTStr.LeaveConMsg, "sysMsg");
                $modal.on("click", "a", function() {
                    closeModal();
                })
            } else {
                closeModal();
            }
        });
        // Click on minimize button
        $modal.on("click", ".minimize", minimize);
    }
    // Minimze the liveHelp modal
    function minimize() {
        width = $modal.parent().width();
        height = $modal.parent().height();
        if ($modal.height() != 36) {
            $modal.animate({
                height: 36,
                width: 425,
                left: width - (15 + 425),
                top: height - (10 + 36)
            }, 200, function() {
                $modal.find(".modalContent").hide();
            });
        } else {
            setTimeout(function () {
            }, 500);
            $modal.animate({
                height: 536,
                width: 425,
                left: width - (15 + 425),
                top: height - (10 + 536)
            }, 200, function() {
                $modal.find(".modalContent").show();
            });
        }
    }
    // Leave the conversation, reset liveHelp modal
    function closeModal() {
        // Auto-send email when user leaves
        LiveHelpModal.autoSendEmail();
        socket.io.disconnect();
        $modal.find(".reqConn").show();
        $modal.find(".chatMsg").html("");
        clearInput();
        clearInterval(timer);
        modalHelper.clear();
    }
    function addSocketEvent() {
        // For user, simply append message
        socket.on("liveHelpMsg", function(message) {
            appendMsg(message.content, "supportMsg");
        });
        socket.on("readyToChat", function(readyOpts) {
            readyToChat(readyOpts);
        });
        socket.on("supportLeftRoom", function() {
            returnToWait();
        });
    }
    function isValidEmail(emailAddress) {
        var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
        return pattern.test(emailAddress);
    }
    LiveHelpModal.autoSendEmail = function() {
        // Only enable auto-sending email when modal is shown
        if($modal.is(":visible")) {
            sendEmailTo("support@xcalar.com");
        }
    }
    return (LiveHelpModal);
}(jQuery, {}));
