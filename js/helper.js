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

    xcHelper.parseTableNum = function($table) {
        // assumes we are passing in a table with an ID
        // that contains the string 'Table' ex. #xcTable2 or #worksheetTable2
        var id       = $table.attr('id');
        var numIndex = id.indexOf('Table') + 5;  // where tableNum is located
        var tableNum = parseInt(id.substring(numIndex));
        return (tableNum);
    }

    xcHelper.parseColNum = function($el) {
        var classNames = $el.attr('class');
        var index      = classNames.indexOf('col');
        var substring  = classNames.substring(index + 'col'.length);

        return (parseInt(substring));
    }

    xcHelper.parseJsonValue = function(value) {
        if (value == undefined) {
            value = '<span class="undefined">'+value+'</span>';
        } else {
            switch (value.constructor) {
                case (Object):
                    if ($.isEmptyObject(value)) {
                        value = "";
                    } else {
                        value = JSON.stringify(value).replace(/,/g, ", ");
                    }
                    break;
                case (Array):
                    value = value.join(', ');
                    break;
                default: // leave value as is;
            }
        }
        return (value);
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

    // handle dropdown list generally
    xcHelper.dropdownList = function($listSection, option) {
        option = option || {};
        /*
         * option includ:
            onlyClickIcon: if set true, only toggle dropdown menu when click
                             dropdown icon, otherwise, toggle also on click 
                             input section
            onSelect: callback to trigger when select an item on list
         *
         * Note that option can be extented if nesessary
         */

         // toggle list section
         if (option.onlyClickIcon) {
            $listSection.on("click", ".icon", function(event) {
                 event.stopPropagation();
                 toggleDropdownMenu($(this).closest(".listSection"));
            });
         } else {
            $listSection.on("click", function(event) {
                 event.stopPropagation();
                 toggleDropdownMenu($(this));
            });
         }

         // on click a list
        $listSection.on({
            "click": function(event) {
                var keepOpen = false;

                event.stopPropagation();
                // trigger callback
                if (option.onSelect) {
                    // keepOpen be true, false or undefined
                    keepOpen = option.onSelect($(this));
                }

                if (!keepOpen) {
                    toggleDropdownMenu($listSection, true);
                }
            },
            "mouseenter": function() {
                $(this).addClass("hover");

            },
            "mouseleave": function() {
                $(this).removeClass("hover");
            }
        }, ".list li");

        function toggleDropdownMenu($listSection, onlyHide) {
            if (onlyHide) {
                $listSection.removeClass("open");
                $listSection.find(".list").hide();
            } else {
                $listSection.toggleClass("open");
                $listSection.find(".list").toggle();
            }
         }
    }

    return (xcHelper);
} (jQuery, {}));