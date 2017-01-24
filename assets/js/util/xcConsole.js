window.xcConsole = (function(xcConsole, $) {
    window.debugOn = false;
    var showThrift = false;
    var logs = [];

    xcConsole.log = function() {
        var stack = stackTrace();
        if (stack[0] && stack[0].indexOf("thriftLog") === 0) {
            if (!showThrift) {
                return;
            }
        }

        var args = [];
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

        if (this.isError) {
            // if error, we show stack trace in console no matter what
            stack.shift();
            console.error.apply(this, args.concat([stack]));
            logs.push({msg: args, stack: stack});

            if (window.debugOn) {
                showAlert(args, stack, true);
            }
        } else {
            if (window.debugOn) {
                console.log.apply(this, args.concat([stack]));
                logs.push({msg: args, stack: stack});
                showAlert(args, stack);
            } else {
                // if debug is off, we do not show stack trace in console
                var originMsg = [];
                if (stack[0]) {
                    originMsg = stack[0].split(" ").pop();
                }
                console.log.apply(this, args.concat(originMsg));
            }
        }       
    };

    xcConsole.error = function() {
        xcConsole.log.apply({isError: true}, arguments);
    };

    xcConsole.getLogs = function() {
        return logs;
    };

    xcConsole.hideThrift = function() {
        showThrift = false;
    };

    xcConsole.showThrift = function() {
        showThrift = true;
    };

    function stackTrace() {
        var err = new Error();
        var stack = err.stack.split("\n");
        stack.splice(0, 3);
        var firstStack = stack[0].trim();
        if (firstStack.indexOf('at xcAssert ') === 0 ||
            firstStack.indexOf('at window.onerror') === 0) {
            stack.shift();
        }
        for (var i = 0; i < stack.length; i++) {
            stack[i] = stack[i].trim().slice(3).split(" ").join("   ");
        }
        return stack;
    }

    function setupAlert() {
        var alert = '<div id="debugAlert">' +
                        '<div class="title">DEBUG' +
                            '<div class="clear" title="clear">' +
                              '<i class="icon xi-forbid"></i>' +
                            '</div>' +
                            '<div class="close" title="close">' +
                              '<i class="icon xi-close"></i>' +
                            '</div>' +
                        '</div>' +
                        '<div class="content"></div>' +
                    '</div>';
        $("#container").append(alert);

        var $alert = $("#debugAlert");

        $alert.draggable({
            "handle"     : ".title",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $alert.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : 100,
            "minWidth"   : 200,
            "containment": "document"
        });

        $alert.find('.close').click(function() {
            $alert.hide();
        });
        $alert.find('.clear').click(function() {
            $alert.find('.content').empty();
        });
    }

    function showAlert(args, stack, isError) {
        var $alert = $("#debugAlert");
        if (!$alert.length) {
            setupAlert();
            $alert = $("#debugAlert");
        }
        $alert.show();
        var stackStr = "";
        var msg = "";
        for (var i = 0; i < stack.length; i++) {
            msg = xcHelper.escapeHTMLSepcialChar(stack[i]);
            msg = msg.replace(/\(/g, '<span style="color: #999;">');
            msg = msg.replace(/\)/g, '</span>');
            stackStr += '<div>' + msg + '</div>';
        }

        var content = "";
        if (isError) {
            content = '<div style="color:red;">';
        } else {
            content = '<div>';
        }
        content += content + '<b>Info:</b><br/>' + JSON.stringify(args) +
                      '</div>' +
                      '<div><b>Stack:</b><br/>' + stackStr +
                      '</div>';
        $alert.find('.content').html(content);
    }

    return xcConsole;

})({}, jQuery);
