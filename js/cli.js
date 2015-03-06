function addCli(title, options) {
    var $textarea = $('#rightBarTextArea');

    var html =  '<div class="cliContentWrap">' + 
                    '<div class="title"> >>' + title + ' :</div>' + 
                    '<div class="content">{'
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
    $textarea.append(html);

    // scroll to bottom
    cliScrollDown($textarea);
}

// scroll down cli to bottom
function cliScrollDown($textarea) {
    // scroll to bottom
    var scrollDiff = $textarea[0].scrollHeight - $textarea.height();
    if (scrollDiff > 0) {
        $textarea.scrollTop(scrollDiff);
    }
}

function clearCli() {
    $('#rightBarTextArea').html('');
}