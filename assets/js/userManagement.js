window.UserManagement = (function(UserManagement, $){
    var $modal;
    // constant
    var minHeight = 564;
    var minWidth  = 500;

    UserManagement.setup = function() {
        $modal = $("#container");
        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $modal.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document"
        });

        $("#container .checkbox").on("click", function() {
            $(this).toggleClass("selected");
        });
    };

    return (UserManagement);
}({}, jQuery));
