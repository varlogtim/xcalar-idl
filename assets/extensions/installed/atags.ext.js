window.UExtATags = (function(UExtATags, $) {
    UExtATags.buttons = [{
        "buttonText"   : "Enable A Tags",
        "fnName"       : "",
        "arrayOfFields": []
    }];

    UExtATags.undoActionFn = undefined;
    UExtATags.actionFn = function(txId, colNum, tableId, functionName, argList) {
        var $cellMenu = $("#cellMenu");
        if ($cellMenu.find(".tdLink").length === 0) {
            // Add the follow link feature
            $cellMenu.append("<li class='tdLink'>Open Link</li>");
            $cellMenu.on('mouseup', '.tdLink', function(event) {
                var $li = $(this);
                if (event.which !== 1 || $li.hasClass('unavailable')) {
                    Alert.error("Cannot Follow Link", "Option not available for selected cells");
                    $highlightBoxes.remove();
                    return PromiseHelper.resolve();
                }

                var $table = $("#xcTable-"+$cellMenu.data('tableId'));
                var $highlightBoxes = $table.find('.highlightBox');
                if ($highlightBoxes.length !== 1) {
                    Alert.error("More than 1 cell", "MultiCell not allowed. Pay Jerene $5 for this feature.");
                    $highlightBoxes.remove();
                    return PromiseHelper.resolve();
                }

                var $td = $highlightBoxes.eq(0).closest("td");
                var colVal = $td.find('.originalData').text();
                if (colVal == null || colVal === "") {
                    Alert.error("Empty Link", "Cannot open empty link");
                    $highlightBoxes.remove();
                    return PromiseHelper.resolve();
                }

                var url = colVal;
                if (url.toLowerCase().indexOf("http://") === -1) {
                    url = "http://" + url;
                }
                var popup = window.open(url, "_blank");
                if (!popup) {
                    Alert.error("Popup Blocked", "Your browser has blocked your popup.");
                    $highlightBoxes.remove();
                }
                $highlightBoxes.remove();
            });
            Alert.error("Enabled", "This extension has been enabled.\n" +
                                    " Click on any cell and select open link.");
        } else {
            Alert.error("Already enabled", "This extension is already enabled");
            closeMenu($cellMenu);
            return PromiseHelper.resolve();
        }
        return PromiseHelper.resolve();
    };

    return (UExtATags);
}({}, jQuery));