window.Cli = (function($) {
    var self = {};
    var history = [];
    var $textarea = $('#rightBarTextArea');

    self.add = function(title, options) {
        history.push({"title": title, "options": options});
        $textarea.append(getCliHTML(title, options));

        // scroll to bottom
        self.scrollToBottom($textarea);
    }

    self.get = function() {
        return (history);
    }

    self.restore = function(oldCliHistory) {
        history = oldCliHistory;
        history.forEach(function(record) {
            $textarea.append(getCliHTML(record.title, record.options));
            self.scrollToBottom($textarea);
        });
    }

    self.clear = function() {
        $textarea.html("");
        history = [];
    }

    self.scrollToBottom = function() {
        // scroll to bottom
        var scrollDiff = $textarea[0].scrollHeight - $textarea.height();
        if (scrollDiff > 0) {
            $textarea.scrollTop(scrollDiff);
        }
    }

    function getCliHTML(title, options) {
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

    return (self);
}(jQuery));
