(function(window, document, $, undefined) {
    "use strict";

    $(document).ready(function() {
        // $("#searchButton").parent().on("click", function() {
        //     $("#exploreButton").parent().removeAttr("active");
        //     $("#searchButton").parent().attr("active", "active");

        //     $("#searchView").show();
        //     $("#exploreView").hide();
        // });
        $("#exploreButton").parent().on("click", function() {
            $("#searchButton").parent().removeAttr("active");
            $("#exploreButton").parent().attr("active", "active");

            $("#exploreView").show();
            $("#searchView").hide();
        });

        $("#importDataButton").click(function() {
            $("#importDataView").toggle();
            $('#importDataBottomForm').find('button[type=reset]').trigger('click');
            $('#filePath').focus();
        });

        $("grid-unit .label").each(function() {
            $(this).dotdotdot({ellipsis: "..."});
        });

        $('.dataViewBtn').click(function() {
            $('.dataViewBtn').removeClass('selected').addClass('btnDeselected');
            $(this).addClass('selected').removeClass('btnDeselected');
            if ($(this).attr('id') == "dataListView") {
                $('#gridView').addClass('listView');
            } else {
                $('#gridView').removeClass('listView');
            }
        });

    });

})(window, document, jQuery);