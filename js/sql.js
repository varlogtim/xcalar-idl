window.SQL = (function($, SQL) {
    var history = [];
    var $textarea = $('#rightBarTextArea');

    SQL.add = function(title, options) {
        history.push({"title": title, "options": options});
        $textarea.append(getCliHTML_helper(title, options));

        // scroll to bottom
        SQL.scrollToBottom($textarea);
    }

    SQL.getHistory = function() {
        return (history);
    }

    SQL.restoreFromHistory = function(oldCliHistory) {
        history = oldCliHistory;
        history.forEach(function(record) {
            $textarea.append(getCliHTML_helper(record.title, record.options));
            SQL.scrollToBottom($textarea);
        });
    }

    SQL.clear = function() {
        $textarea.html("");
        history = [];
    }

    SQL.scrollToBottom = function() {
        // scroll to bottom
        var scrollDiff = $textarea[0].scrollHeight - $textarea.height();
        if (scrollDiff > 0) {
            $textarea.scrollTop(scrollDiff);
        }
    }

    function getCliHTML_helper(title, options) {
        var html =  '<div class="sqlContentWrap">' + 
                        '<div class="title"> >>' + title + ' :</div>' + 
                        '<div class="content">{';
        var count = 0;

        for (var key in options) {
            if (count > 0) {
                html += ',';
            }
            var val = JSON.stringify(options[key]);
            html += '<span class="' + key + '">' + 
                        '<span class="sqlKey">' + key + '</span> : ' + 
                        '<span class="sqlVal">' + val + '</span>' + 
                    '</span>';
            ++ count;
        }

        html += '}</div></div></div>';
        html = html.replace(/,/g, ", ");

        return (html);
    }

    return (SQL);
}(jQuery, {}));
