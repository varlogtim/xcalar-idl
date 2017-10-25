window.LiveHelpModal = (function($, LiveHelpModal) {
    var $modal;  // $("#liveHelpModal");
    var modalHelper;
    var userName;
    var fullName;
    var email;
    var timer;
    var socket;
    var thread;
    var ticketId;
    var firstMsg;
    var connected = false;
    // Initial setup
    LiveHelpModal.setup = function() {
        $modal = $("#liveHelpModal");
        modalHelper = new ModalHelper($modal, {
            "sizeToDefault": true,
            "noBackground": true,
            "noCenter": true,
            "noEnter": true
        });
        addModalEvents();
    };
    // Three steps for user to connect to liveHelp:
    // 1. Request a connection
    // 2. Wait to be served by one of the supports
    // 3. Start chatting

    // Everytime click on 'liveHelp' on menu
    LiveHelpModal.show = function() {
        userName = XcSupport.getUser().split("@")[0];
        if (!$modal.is(":visible")) {
            modalHelper.setup();
            $modal.find(".xi-fullscreen").hide();
            // If reqConn UI is displayed, hide all other UIs
            if ($modal.find(".reqConn").is(":visible")) {
                $modal.find(".chatBox").hide();
                $modal.find(".emailInfo").show();
                $modal.find(".emailError").hide();
                $modal.find(".sendEmail").attr("data-original-title",
                                               AlertTStr.EmailDisabled);
                $modal.find(".sendEmail").addClass("email-disabled");
                $modal.find(".sendEmail").hide();
                // Auto-filling username and email
                $modal.find(".name").val(userName);
                var autoFillEmail = XcSupport.getUser();
                if (isValidEmail(autoFillEmail)) {
                    $modal.find(".email").val(autoFillEmail);
                }
                if (infoComplete()) {
                    $modal.find(".reqConnBtn").removeClass("btn-disabled");
                }
            }
        }
    };
    // Request a connection to the support
    function requestConn(autoResend) {
        if (!autoResend) {
            // If the client is not connected to socket yet
            if (!connected) {
                var url = "https://livechat.xcalar.com/";
                socket = io.connect(url);
                addSocketEvent();
            }
            appendMsg(AlertTStr.EmailFunc, "sysMsg");
            appendMsg(AlertTStr.WaitChat, "sysMsg");
        }
        setTimeout(function() {
            if (connected) {
                // Send the request to socket
                sendReqToSocket();
                firstMsg = true;
            }
        }, 1000);
        timer = setTimeout(function() {
            appendMsg(AlertTStr.NoSupport, "sysMsg");
            confirmTicket();
        }, 120000)
        // Hide reqConn UI, display chatting UI
        $modal.find(".reqConn").hide();
        $modal.find(".chatBox").show();
        $modal.find(".sendEmail").show();
        //$modal.find(".sendMsg").prop("disabled", true);
        clearInput();
    }
    function sendReqToSocket() {
        var opts = {
            userName: userName,
            email: email,
            fullName: fullName
        };
        socket.emit("liveHelpConn", opts);
    }
    function confirmTicket() {
        var confirmation = AlertTStr.SubmitTicket +
                           "<a class='confirmTicket'>" +
                           CommonTxtTstr.YES + "</a>";
        appendMsg(confirmation, "sysMsg");
    }
    // Only for sending messages
    function submitForm() {
        var message = {
            "room": thread,
            "content": $modal.find(".sendMsg").val(),
            "sender": fullName
        };
        sendMsgToSocket(message);
        appendMsg(message.content, "userMsg", fullName);
        clearInput();
    }
    function sendMsgToSocket(message) {
        socket.emit("liveHelpMsg", message);
    }
    // Update the chat messages in chat box
    function appendMsg(content, type, sender) {
        var row = "<div class='" + type + "'></div>";
        if (type !== "sysMsg") {
            // It seems that slack has already helped us escape it.
            // So we don't do it anymore
            //content = xcHelper.escapeHTMLSpecialChar(content);
            row = "<div class='" + type + "Sender'>" +
                    "<p>" + sender + "</p></div>" + row;
            if($modal.find(".sendEmail").hasClass("email-disabled")) {
                $modal.find(".sendEmail").removeClass("email-disabled");
                $modal.find(".sendEmail").attr("data-original-title",
                                               AlertTStr.EmailEnabled);
            }
        }
        content = content.replace(/\n/g,"</br>");
        var $content = $modal.find(".chatMsg");
        $modal.find(".chatMsg").append(row);
        $modal.find(".chatMsg").find("." + type).last()
                .html("<p class='text'>"+content+"</p>");
        $content.scrollTop($content[0].scrollHeight);
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
    function prepareEmail(dest) {
        if (dest && !$modal.find(".reqConn").is(":visible")) {
            var content = "";
            $modal.find(".userMsg, .supportMsg").each(function(i,e) {
                content += $(e).prev().text() + ": " + $(e).text() + "\n";
            });
            if (content) {
                var msgBody = "=====Your ticket ID is " + ticketId + "=====\n\n";
                if (!ticketId) {
                    msgBody = "=====No ticket is created=====\n\n";
                }
                var mailOpts = {
                    from: 'support-internal@xcalar.com',
                    to: dest,
                    subject: 'Support Chat History for ' + fullName,
                    text: msgBody + content
                };
                appendMsg(AlertTStr.EmailSending, "sysMsg");
                sendEmail(mailOpts);
            }
        }
    }
    function sendEmail(mailOpts) {
        socket.emit("sendEmail", mailOpts, function() {
            appendMsg(AlertTStr.EmailSent, "sysMsg");
        });
    }

    function startChatting() {
        fullName = $modal.find(".name").val();
        email = $modal.find(".email").val();
        if (!isValidEmail(email)) {
            $modal.find(".emailInfo").hide();
            $modal.find(".emailError").show();
            return;
        }
        requestConn();
    }
    function infoComplete() {
        return ($modal.find(".name").val() && $modal.find(".email").val());
    }
    function addModalEvents() {
        // Enable requesting connection only when both name and email are given
        $modal.find(".reqConn input").keypress(function(e) {
            if (e.which === keyCode.Enter && infoComplete()) {
                startChatting();
            }
        });
        $modal.find(".reqConn input").on("input", function() {
            if (infoComplete()) {
                $modal.find(".reqConnBtn").removeClass("btn-disabled");
            } else {
                $modal.find(".reqConnBtn").addClass("btn-disabled");
            }
        });

        // Click 'send' button when it is for requesting connection
        $modal.on("click", ".reqConnBtn", function() {
            startChatting();
        });
        // press enter when input
        $modal.find(".sendMsg").keypress(function(e) {
            if (e.which === keyCode.Enter && !e.shiftKey && $(this).val()) {
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
                    $(chatMsg).css("height", "calc(100% - " + (newHeight + 10) +
                                   "px");
                } else {
                    // Set to max-height
                    $(sendArea).height(200);
                    $(chatMsg).css("height", "calc(100% - 210px)");
                }
            }
        });
        $modal.on("click", ".sendEmail", function() {
            prepareEmail(email);
        });
        // Click leave button
        $modal.on("click", ".close", function() {
            // If it is not on reqConn UI, ask the user if he needs all messages
            // to be sent to his email
            if (!$modal.find(".reqConn").is(":visible")) {
                var confirmation = AlertTStr.LeaveConMsg +
                                   "<a class='confirmClose'>" +
                                   CommonTxtTstr.YES + "</a>";
                appendMsg(confirmation, "sysMsg");
            } else {
                closeModal();
            }
        });

        $modal.on("click", ".confirmClose", function() {
            closeModal();
        });
        $modal.on("click", ".confirmTicket", function() {
            submitTicket(true);
        });
        // Click on minimize button
        $modal.on("click", ".minimize", minimize);
    }
    // Minimze the liveHelp modal
    function minimize() {
        width = $modal.parent().width();
        height = $modal.parent().height();
        if ($modal.height() !== 36) {
            $modal.css("min-height","36px");
            $modal.animate({
                height: 36,
                width: 425,
                left: width - (15 + 425),
                top: height - (10 + 36)
            }, 200, function() {
                $modal.find(".modalContent").hide();
                $modal.find(".ui-resizable-handle").hide();
                $modal.find(".xi-exit-fullscreen").hide();
                $modal.find(".xi-fullscreen").show();
            });
        } else {
            $modal.css("min-height","300px");
            $modal.animate({
                height: 536,
                width: 425,
                left: width - (15 + 425),
                top: height - (10 + 536)
            }, 200, function() {
                $modal.find(".modalContent").show();
                $modal.find(".ui-resizable-handle").show();
                $modal.find(".xi-fullscreen").hide();
                $modal.find(".xi-exit-fullscreen").show();
            });
        }
    }
    function submitTicket(triggerPd) {
        firstMsg = false;
        $modal.find(".confirmTicket").addClass("xc-disabled");
        appendMsg(AlertTStr.WaitTicket, "sysMsg");
        var info;
        var success = true;
        var ticketObj = {
            "ticketId": null,
            "comment": "======This ticket is auto-generated from LiveChat=====",
            "userIdName": userIdName,
            "userIdUnique": userIdUnique,
            "severity": 4,
            "fromChat": true,
            "triggerPd": triggerPd
        };
        var licenseKey;
        var expiration;
        var admin;
        SupTicketModal.fetchLicenseInfo()
        .then(function(licenseObj) {
            licenseKey = licenseObj.key;
            expiration = licenseObj.expiration;
            return SupTicketModal.submitTicket(ticketObj, licenseObj, true,
                                               true);
        })
        .then(function(ret) {
            try {
                var logs = JSON.parse(ret.logs);
                ticketId = logs.ticketId;
                admin = logs.admin;
                info = AlertTStr.CaseId + "\n" + ticketId + "\n\n" +
                       AlertTStr.LicenseKey + "\n" + licenseKey + "\n\n" +
                       AlertTStr.LicenseExpire + "\n" + expiration + "\n\n" +
                       AlertTStr.XcalarAdmin + "\n" + admin;
            } catch (err) {
                success = false;
            }
        })
        .fail(function(err) {
            success = false;
        })
        .always(function() {
            if (!success) {
                firstMsg = true;
                info = AlertTStr.TicketError;
                appendMsg(info, "sysMsg");
                $modal.find(".confirmTicket").removeClass("xc-disabled");
                confirmTicket();
            } else {
                appendMsg(info, "sysMsg");
            }
        });
    }
    // Leave the conversation, reset liveHelp modal
    function closeModal() {
        LiveHelpModal.userLeft();
        if (socket) {
            socket.disconnect();
        }
        connected = false;
        thread = null;
        ticketId = null;
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        $modal.find(".reqConn").show();
        $modal.find(".chatMsg").html("");
        clearInput();
        // clearInterval(timer);
        modalHelper.clear();
    }
    function addSocketEvent() {
        socket.on("connect", function() {
            connected = true;
        });
        // For user, simply append message
        socket.on("liveChatMsg", function(message) {
            appendMsg(message.content, "supportMsg", message.sender);
            if (firstMsg) {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                submitTicket();
            }
        });
        socket.on("joinRoom", function(room) {
            thread = room;
        });
    }
    function isValidEmail(emailAddress) {
        var pattern = new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i);
        return pattern.test(emailAddress);
    }
    LiveHelpModal.userLeft = function() {
        sendToSlack();
        autoSendEmail();
        updateTicket();
    };
    function autoSendEmail() {
        // Only enable auto-sending email when modal is shown
        if ($modal.is(":visible") && isValidEmail(email)) {
            prepareEmail(email);
        }
    }
    function updateTicket() {
        var content = "";
        $modal.find(".userMsg, .supportMsg").each(function(i,e) {
            if($(e).hasClass("userMsg")) {
                content += "You: " + $(e).text() + "\n\n";
            } else {
                content += "Xcalar: " + $(e).text() + "\n\n";
            }
        });
        if (content != ""&& ticketId) {
            var ticketObj = {
                "ticketId": ticketId,
                "comment": "======This ticket is auto-generated from LiveChat" +
                           "=====\n"+ content,
                "userIdName": userIdName,
                "userIdUnique": userIdUnique,
                "severity": 4,
                "fromChat": true,
                "triggerPd": false
            };
            SupTicketModal.fetchLicenseInfo()
            .then(function(licenseObj) {
                SupTicketModal.submitTicket(ticketObj, licenseObj, true, true);
            });
        }
    }
    function sendToSlack() {
        socket.emit("userLeft", {"room": thread, "ticketId": ticketId});
    }
    /* Unit Test Only */
    if (window.unitTestMode) {
        LiveHelpModal.__testOnly__ = {};
        LiveHelpModal.__testOnly__.connected = connected;
        LiveHelpModal.__testOnly__.submitTicket = submitTicket;
        LiveHelpModal.__testOnly__.getSendEmail = sendEmail;
        LiveHelpModal.__testOnly__.setSendEmail = function(func) {
            sendEmail = func;
        };
        LiveHelpModal.__testOnly__.getSendReqToSocket = sendReqToSocket;
        LiveHelpModal.__testOnly__.setSendReqToSocket = function(func) {
            sendReqToSocket = func;
        };
        LiveHelpModal.__testOnly__.getSendMsgToSocket = sendMsgToSocket;
        LiveHelpModal.__testOnly__.setSendMsgToSocket = function(func) {
            sendMsgToSocket = func;
        };
    }
    /* End Of Unit Test Only */

    return (LiveHelpModal);
}(jQuery, {}));
