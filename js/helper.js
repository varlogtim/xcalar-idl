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

    //define type of the column
    xcHelper.parseColType = function(val, oldType) {
        var type = oldType;

        if (val !== "" && oldType !== "mixed") {
            type = typeof val;
            // get specific type
            if (type === "number") {
                // the case when type is decimal
                if (oldType === "decimal" ||
                    xcHelper.isDecimal(val))
                {
                    type = "decimal";
                } else {
                    type = "integer";
                }
            } else if (type === "object") {
                if (val instanceof Array) {
                    type = "array";
                }
            }

            if (oldType != undefined && oldType !== type) {
                type = "mixed";
            }
        }

        return (type);
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

    xcHelper.randName = function(name, digits, strip) {
        if (digits == undefined) {
            digits = 5; // default
        }

        var max = Math.pow(10, digits);
        var rand = Math.floor((Math.random() * max) + 1);

        if (strip) {
            // strip when name is "abc-000"
            var index = name.lastIndexOf("-");
            if (index > 0) {
                name = name.substring(0, index) + "-";
            }
        }

        function padZero(number, numDigits) {
            number = number.toString();
            return ((number.length < numDigits) ? 
                    padZero("0"+number, numDigits): number);
        }
        rand = padZero(rand, digits);
        return (name + rand);
    }

    xcHelper.removeSelectionRange = function() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    xcHelper.isDecimal = function(num) {
        return (num % 1 !== 0);
    }

    xcHelper.isArray = function(obj) {
        return (obj.constructor.toString().indexOf("Array") > -1);
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
    xcHelper.dropdownList = function($listSection, options) {
        options = options || {};
        /*
         * options includ:
            onlyClickIcon: if set true, only toggle dropdown menu when click
                             dropdown icon, otherwise, toggle also on click 
                             input section
            onSelect: callback to trigger when select an item on list, $li will
                      be passed into the callback
            container: will hide all other list in the container when focus on 
                       this one. Default is $listSectin.parent()
         *
         * Note that options can be extented if nesessary
         */
         var $container = options.container ? $(options.container) : 
                                              $listSection.parent();
         // toggle list section
         if (options.onlyClickIcon) {
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
                if (options.onSelect) {    // trigger callback
                    // keepOpen be true, false or undefined
                    keepOpen = options.onSelect($(this));
                }

                if (!keepOpen) {
                    hideDropdowns();
                }
            },
            "mouseenter": function() {
                $(this).addClass("hover");

            },
            "mouseleave": function() {
                $(this).removeClass("hover");
            }
        }, ".list li");

        function toggleDropdownMenu($listSection) {
            if ($listSection.hasClass("open")) {    // close dropdown
                hideDropdowns();
            } else {                                // open dropdown
                hideDropdowns();
                var $lists = $listSection.find(".list");
                if ($lists.children().length === 0) {
                    return;
                }
                $listSection.addClass("open");
                $lists.show().addClass("openList");
            }
        }

        function hideDropdowns() {
            var $sections = $container.find(".listSection");
            $sections.find(".list").hide().removeClass("openList");
            $sections.removeClass("open");
        }
    }

    xcHelper.validate = function(eles) {
        /*
         * eles is an object or an array of object, each object includes:

           $selector: selector to check
           check    : function to check validation, if empty, will check if the 
                      value of selecor is empty. Val of the selector will be 
                      passed into the function
           text     : text to show if now pass the check
           noWarn   : if set true, will not show any warnning box.
           callback : if not null, will call it after check fails
           isAlert  : if set true, will show Alert Modal, default is StatusBox
           formMode : if set true, will use StatusBox's form mode
           ...      : to be extened in the future.

         * Check will run in array's order.
         */

         if (!(eles instanceof Array)) {
            eles = [eles];
         }

        for (var i = 0; i < eles.length; i++) {
            var ele = eles[i];
            var $e  = ele.$selector;
            var val = $e.is("input") ? $e.val() : $e.text();
            var error;
            var notValid;

            if (ele.check != null) {
                notValid = ele.check(val);
                error    = ele.text || "Invalid Inputs.";
            } else {
                notValid = jQuery.trim(val) == "";
                error    = ele.text || "Please fill out this field.";
            }

            if (notValid) {
                if (ele.noWarn) {
                    return false;
                }

                if (ele.callback) {
                    callback();
                } else if (ele.isAlert) {
                    Alert.error("Invalid Filed", text);
                } else {
                    StatusBox.show(error, $e, ele.formMode);
                }

                return false;
            }
        }

        return true;
    }
    // an object used for global Modal Actions
    xcHelper.Modal = function($modal, options) {
        /* options incluade:
         * focusOnOpen: if set true, will focus on confirm btn when open modal
         */
        this.$modal = $modal;
        this.options   = options || {};
        this.id  = $modal.attr("id");

        return (this);
    }

    xcHelper.Modal.prototype.setup = function() {
        // XXX to find the visiable btn, must show the modal first
        var $modal      = this.$modal;
        var eleLists    = [
            $modal.find(".btn"),                // buttons
            $modal.find("input")                // input
        ];

        var focusIndex  = 0;
        var $focusables = [];

        // make an array for all focusable element
        eleLists.forEach(function($eles) {
            $eles.each(function() {
                $focusables.push($(this));
            });
        })

        var len = $focusables.length;
        for (var i = 0; i < len; i++) {
            $focusables[i].addClass("focusable").data("tabid", i);
            $focusables[i].on("focus.xcModal", function() {
                var $ele = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // for switch between modal tab using tab key
        $(document).on("keydown.xcModal" + this.id, function(event) {
            if (event.which == keyCode.Tab) {
                event.preventDefault();
                getEleToFocus();

                return false;
            }
        });

        // for when mouse move on other buttons
        var $btns = eleLists[0];
        $btns.on("mouseenter.xcModal", function() {
            var $btn = $(this);
            $btns.blur();
            $btn.focus();
        });

        $btns.on("mouseleave.xcModal", function() {
            $(this).blur();
        });

        // focus on the right most button
        if (this.options.focusOnOpen) {
            getEleToFocus();
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus() {
            // the current ele is not active, should no by aocused
            if (!isActive($focusables[focusIndex])) {
                var start  = focusIndex;
                focusIndex = (focusIndex + 1) % len;

                while (focusIndex !== start && 
                        !isActive($focusables[focusIndex])) 
                {
                    focusIndex = (focusIndex + 1) % len;
                }
                // not find any active ele that could be focused
                if (focusIndex === start) {
                    focusIndex = -1;
                }
            }

            if (focusIndex >= 0) {
                $focusables[focusIndex].focus();
            }
        }

        function focusOn(index) {
            focusIndex = index;
            // go to next index
            focusIndex = (focusIndex + 1) % len;
        }

        function isActive($ele) {
            if ($ele == undefined) {
                console.error("undefined element!");
            }
            return ($ele.is(":visible") && !$ele.is("[disabled]"));
        }
    }

    xcHelper.Modal.prototype.clear = function() {
        $(document).off("keydown.xcModal" + this.id);
        this.$modal.find(".focusable").off(".xcModal")
                                      .removeClass("focusable");
    }
    // check if any button is on focus
    xcHelper.Modal.prototype.checkBtnFocus = function() {
        return (this.$modal.find(".btn:focus").length > 0);
    }

    return (xcHelper);
} (jQuery, {}));
