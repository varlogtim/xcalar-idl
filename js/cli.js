window.Cli = (function($, Cli) {
    var history = [];
    var $textarea = $('#rightBarTextArea');

    Cli.add = function(title, options) {
        history.push({"title": title, "options": options});
        $textarea.append(getCliHTML_helper(title, options));

        // scroll to bottom
        Cli.scrollToBottom($textarea);
    }

    Cli.getHistory = function() {
        return (history);
    }

    Cli.restoreFromHistory = function(oldCliHistory) {
        history = oldCliHistory;
        history.forEach(function(record) {
            $textarea.append(getCliHTML_helper(record.title, record.options));
            Cli.scrollToBottom($textarea);
        });
    }

    Cli.clear = function() {
        $textarea.html("");
        history = [];
    }

    Cli.scrollToBottom = function() {
        // scroll to bottom
        var scrollDiff = $textarea[0].scrollHeight - $textarea.height();
        if (scrollDiff > 0) {
            $textarea.scrollTop(scrollDiff);
        }
    }

    function getCliHTML_helper(title, options) {
        var html =  '<div class="cliContentWrap">' + 
                        '<div class="title"> >>' + title + ' :</div>' + 
                        '<div class="content">{';
        var count = 0;

        for (var key in options) {
            if (count > 0) {
                html += ',';
            }
            var val = JSON.stringify(options[key]);
            html += '<span class="' + key + '">' + 
                        '<span class="cliKey">' + key + '</span> : ' + 
                        '<span class="cliVal">' + val + '</span>' + 
                    '</span>';
            ++ count;
        }

        html += '}</div></div></div>';
        html = html.replace(/,/g, ", ");

        return (html);
    }

    return (Cli);
}(jQuery, {}));
