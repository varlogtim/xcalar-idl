// this file maps to xcalar/.jupyter/custom/custom.js
define(['base/js/namespace'], function(Jupyter) {
    Jupyter._target = '_self';
    if (!$("#notebooks").length){
        return;
    }

    // hide the log out button on the upper right
    $("#login_widget").remove();

    $(document).ready(function(){
        // prevents new window from opening
        $("#notebook_list").on("click", "a", function(event) {
            var url = $(this).attr("href");
            if (!url) {
                return;
            }
            event.preventDefault();
            // prevents bug where new tab opens in windows chrome
            window.location.href = $(this).attr("href");
        });
        $("#kernel-python2 a").off("click");
        $("#kernel-python2 a").click(function() {
            Jupyter.new_notebook_widget.contents.new_untitled("", {type: "notebook"})
            .then(function(data) {
                var url = "/notebooks/" + data.path + "?kernel_name=python2&needsTemplate=true?";
                window.location.href = url;
            });
        });
    });
    function receiveMessage(event) {
        window.alert = function(){};
        alert = function(){};
        var struct = JSON.parse(event.data);
        switch(struct.action) {
            case("publishTable"):
               publishTable(struct.tableName);
               break;
            default:
               break;
        }
    }

    function publishTable(tableName) {
        Jupyter.new_notebook_widget.contents.new_untitled("", {type: "notebook"})
        .then(function(data) {
            var encodedTableName = encodeURIComponent(tableName);
            var url = "/notebooks/" + data.path + "?kernel_name=python2&" +
                        "needsTemplate=true&publishTable=true&" +
                        "tableName=" + encodedTableName;
            window.location.href = url;
        });
    }
    window.addEventListener("message", receiveMessage, false);

});