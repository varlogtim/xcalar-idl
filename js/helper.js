window.xcHelper = (function($, xcHelper) {

    xcHelper.getTableIndexFromName = function(tableName, isHidden) {
        var table = isHidden ? gHiddenTables : gTables;

        for (var i = 0; i < gHiddenTables.length; i ++) {
            if (tableName === gHiddenTables[i].frontTableName) {
                return (i);
            }
        }

        return undefined;
    }

    // get a deep copy
    xcHelper.deepCopy = function(obj) {
        var string = JSON.stringify(obj);
        var res;

        try {
            res = JSON.parse(string);
        } catch (err) {
            console.error(err, string);
        }

        return (res);
    }

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

    xcHelper.getTwoWeeksDate = function() {
        var res     = [];
        var d       = new Date();
        var day     = d.getDate();
        var date;

        d.setHours(0, 0, 0, 0);

        // date from today to lastweek, all dates' time is 0:00 am
        for (var i = 0; i < 7; i ++) {
            date = new Date(d);
            date.setDate(day - i);
            res.push(date);
        }

        // older than one week
        date = new Date(d);
        date.setDate(day - 13);
        res.push(date);

        return (res);
    }

    return (xcHelper);
} (jQuery, {}));