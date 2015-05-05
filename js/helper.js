window.xcHelper = (function($, xcHelper) {

    xcHelper.randName = function(name, digits) {
        if (digits == undefined) {
            digits = 5; // default
        }

        var max = Math.pow(10, digits);
        var rand = Math.floor((Math.random() * max) + 1);

        return (name + rand);
    }

    xcHelper.removeSelectionRange = function() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }
    // fomart is mm-dd-yyyy
    xcHelper.getDate = function(delimiter, d, timeStamp) {
        var date;

        if (d == undefined) {
            d = (timeStamp == undefined) ? new Date() : new Date(timeStamp);
        }

        if (delimiter == undefined) {
            delimiter = "-";
        }
        date = d.toLocaleDateString().replace(/\//g, delimiter);

        return (date);
    }

    xcHelper.getTime = function(d, timeStamp) {
        if (d == undefined) {
            d = (timeStamp == undefined) ? new Date() : new Date(timeStamp);
        }

        return (d.toLocaleTimeString());
    }
    // time in million seconds
    xcHelper.getTimeInMS = function(d, timeStamp) {
        if (d == undefined) {
            d = (timeStamp == undefined) ? new Date() : new Date(timeStamp);
        }

        return d.getTime();
    }

    return (xcHelper);
} (jQuery, {}));