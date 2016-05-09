window.HelpSearch = (function($, HelpSearch) {

    HelpSearch.setup = function() {

        // $('#helpSearch').on('keypress', function(e) {
        //     if (e.which === keyCode.Enter) {
        //         submitQuery($(this).val());
        //     }
        // });

        $('#helpSearch').tipuesearch({
            newWindow: true,
            showTitleCount: false
            // debug: true
        });

        $('#helpSubmit').click(function() {
            $('#helpResults').find('.noResults').hide();
            $('#helpSearch').trigger({"type": "keyup", "keyCode": 13});
        });

        // XX the following code is for searching without pressing enter

        // var inputTimer;
        // var storedVal = "";
        // $('#helpSearch').on('input', function(event) {
        //     console.log(event);
        //     clearTimeout(inputTimer);
        //     // var val = $(this).val();
        //     inputTimer = setTimeout(function() {
        //         // if ($('#helpSearch').val() !== storedVal && $("#helpSearch").val().length > 2) {
        //             $('#helpResults').find('.noResults').hide();
        //             // $('#tipue_search_warning').remove();
        //             $('#helpSearch').trigger({"type": "keyup", "keyCode": 13});
        //             storedVal = $('#helpSearch').val();
        //         // }

        //     }, 200);
        // });

        // var keydownTimer;
        // $('#helpSearch').on('keydown', function(event) {
        //     clearTimeout(keydownTimer);
        //     // if (event.which === keyCode.)
        // });

        $('#helpSearchArea').submit(function() {
            $('#helpResults').find('.noResults').hide();
            $('#tipue_search_warning').remove();
            return false;
        });

        // $("#helpSubmit").on('click', function() {
        //     submitQuery($('#helpSearch').val());
        // });
    };

    function submitQuery(val) {
        var $resultsArea = $('#helpResults').find('.resultsArea');
        if (helpHashTags.hasOwnProperty(val)) {
            // $resultsArea.html(JSON.stringify(helpHashTags[val]));
            var html = "";
            var results = helpHashTags[val];
            var link = "";
            for (var i = 0; i < results.length; i++) {
                html += '<b>' + results[i].title + '</b>';
                html += '<br>';
                html += results[i].summary;
                html += '<br>';
                // link = "http://xcalar.com/help/" + results[i].link.slice(12);
                link = results[i].link;
                // html += '<a href="' + link + '" target="_blank">' + link + '</a>';
                html += '<a href="' + link + "?xcq=" + val + '" target="xchelp">' + link + '</a>';
                html += '<br><br>';
            }
            $resultsArea.html(html);
        } else {
            $resultsArea.html("");
        }
    }


    return (HelpSearch);

}(jQuery, {}));
