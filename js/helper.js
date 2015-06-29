window.xcHelper = (function($, xcHelper) {
    xcHelper.getTableIndexFromName = function(tableName, isHidden) {
        var table = isHidden ? gHiddenTables : gTables;

        for (var i = 0; i < table.length; i++) {
            if (tableName === table[i].tableName) {
                return (i);
            }
        }

        return (undefined);
    };

    xcHelper.parseTableNum = function($table) {
        // assumes we are passing in a table with an ID
        // that contains the string 'Table' ex. #xcTable2 or #worksheetTable2
        var id       = $table.attr('id');
        var numIndex = id.indexOf('Table') + 5;  // where tableNum is located
        var tableNum = parseInt(id.substring(numIndex));
        return (tableNum);
    };

    xcHelper.parseRowNum = function($el) {
        var keyword    = "row";
        var classNames = $el.attr("class");
        var index      = classNames.indexOf(keyword);
        var substring  = classNames.substring(index + keyword.length);

        return (parseInt(substring));
    };

    xcHelper.parseColNum = function($el) {
        var keyword    = "col";
        var classNames = $el.attr("class");
        var index      = classNames.indexOf(keyword);
        var substring  = classNames.substring(index + keyword.length);

        return (parseInt(substring));
    };

    xcHelper.parseJsonValue = function(value) {
        if (value == null) {
            value = '<span class="undefined">' + value + '</span>';
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
    };

    //define type of the column
    xcHelper.parseColType = function(val, oldType) {
        var type = oldType;

        if (val != null && val !== "" && oldType !== "mixed") {
            var valType = typeof val;
            type = valType;
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

            var isAllNum = (valType === "number") &&
                           ((oldType === "decimal") || (oldType === "integer"));
            if (oldType != null && oldType !== type && !isAllNum)
            {
                type = "mixed";
            }
        }

        return (type);
    };

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
    };

    xcHelper.sizeTranslater = function(size, unitSeparated) {
        var unit  = ["B", "KB", "MB", "GB", "TB", "PB"];
        var start = 0;
        var end   = unit.length - 2;

        while (size >= 1024 && start <= end) {
            size = (size / 1024).toFixed(1);
            ++start;
        }
        if (size >= 10) {
            size = Math.ceil(size);
        }

        if (unitSeparated) {
            return ([size, unit[start]]);
        } else {
            return (size + unit[start]);
        }
    };

    xcHelper.textToBytesTranslator = function(numText) {
        // accepts parameters in the form of 23GB or 56.2 mb
        // and converts them to bytes
        var units  = ["B", "KB", "MB", "GB", "TB", "PB"];
        var num = parseFloat(numText);
        var text = $.trim(numText.substr(("" + num).length)).toUpperCase();
        var index = units.indexOf(text);
        var bytes = num * Math.pow(1024, index);
        return (bytes);
    };

    xcHelper.randName = function(name, digits, strip) {
        if (digits == null) {
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
                    padZero("0" + number, numDigits) : number);
        }
        rand = padZero(rand, digits);
        return (name + rand);
    };

    xcHelper.createSelection = function(element, atEnd) {
        if (element == null) {
            return;
        }

        var range;
        var selection;

        if (window.getSelection && document.createRange) {
            range = document.createRange();
            range.selectNodeContents(element);
            // move the cursor to end, else select all
            if (atEnd) {
                range.collapse(false);
            }
            selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (document.body.createTextRange) {
            range = document.body.createTextRange();
            range.moveToElementText(element);

            if (atEnd) {
                range.collapse(false);
            }
            range.select();
        }
    };

    xcHelper.removeSelectionRange = function() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    };

    xcHelper.isDecimal = function(num) {
        return (num % 1 !== 0);
    };

    xcHelper.isArray = function(obj) {
        return (obj.constructor.toString().indexOf("Array") > -1);
    };

    // fomart is mm-dd-yyyy
    xcHelper.getDate = function(delimiter, d, timeStamp) {
        var date;

        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }

        if (delimiter == null) {
            delimiter = "-";
        }
        date = d.toLocaleDateString().replace(/\//g, delimiter);

        return (date);
    };

    xcHelper.getTime = function(d, timeStamp) {
        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }

        return (d.toLocaleTimeString());
    };

    // time in million seconds
    xcHelper.getTimeInMS = function(d, timeStamp) {
        if (d == null) {
            d = (timeStamp == null) ? new Date() : new Date(timeStamp);
        }

        return d.getTime();
    };

    xcHelper.getTwoWeeksDate = function() {
        var res = [];
        var d   = new Date();
        var day = d.getDate();
        var date;

        d.setHours(0, 0, 0, 0);

        // date from today to lastweek, all dates' time is 0:00 am
        for (var i = 0; i < 7; i++) {
            date = new Date(d);
            date.setDate(day - i);
            res.push(date);
        }

        // older than one week
        date = new Date(d);
        date.setDate(day - 13);
        res.push(date);

        return (res);
    };

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

        function toggleDropdownMenu($curlistSection) {
            if ($curlistSection.hasClass("open")) {    // close dropdown
                hideDropdowns();
            } else {                                // open dropdown
                hideDropdowns();
                var $lists = $curlistSection.find(".list");
                if ($lists.children().length === 0) {
                    return;
                }
                $curlistSection.addClass("open");
                $lists.show().addClass("openList");
            }
        }

        function hideDropdowns() {
            var $sections = $container.find(".listSection");
            $sections.find(".list").hide().removeClass("openList");
            $sections.removeClass("open");
        }
    };

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
                error = ele.text || "Invalid Inputs.";
            } else {
                notValid = (jQuery.trim(val) === "");
                error = ele.text || "Please fill out this field.";
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
    };

    xcHelper.checkDuplicateTableName = function(tableName) {
        var deferred = jQuery.Deferred();
        XcalarGetDatasets()
        .then(function(result) {
            var datasets = result.datasets;
            for (var i = 0; i < result.numDatasets; i++) {
                if (datasets[i].name === tableName) {
                    return (deferred.reject('dataset'));
                }
            }
        })
        .then(XcalarGetTables)
        .then(function(result) {
            var tables = result.tables;
            for (var i = 0; i < result.numTables; i++) {
                if (tables[i].tableName === tableName) {
                    return (deferred.reject('table'));
                }
            }
            deferred.resolve('success');
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    xcHelper.lockTable = function(tableNum) {
        var $tableWrap = $('#xcTableWrap' + tableNum);
        var $lockedIcon = $('<div class="lockedIcon">' +
                            '<img src="/images/biglocklight.png" /></div>');
        var tableHeight = $tableWrap.find('.xcTbodyWrap').height();
        var mainFrameHeight = $('#mainFrame').height();
        var topPos = 100 * ((tableHeight / mainFrameHeight) / 2);
        topPos = Math.min(topPos, 40);
        $lockedIcon.css('top', topPos + '%');

        $tableWrap.addClass('tableLocked').append($lockedIcon);
        gTables[tableNum].isLocked = true;
        var tableName = gTables[tableNum].tableName;
        var lookupTable = gTableIndicesLookup[tableName];
        lookupTable.isLocked = true;
    }

    xcHelper.unlockTable = function(tableName, isHidden) {
        var tableNum = xcHelper.getTableIndexFromName(tableName, isHidden);
        if (isHidden) {
            gHiddenTables[tableNum].isLocked = false;
        } else {
            gTables[tableNum].isLocked = false;
            var $tableWrap = $('#xcTableWrap' + tableNum);
            $tableWrap.find('.lockedIcon').remove();
            $tableWrap.removeClass('tableLocked');
        }
        var lookupTable = gTableIndicesLookup[tableName];
        if (lookupTable) {
            lookupTable.isLocked = true;
        }
    }


    // an object used for global Modal Actions
    xcHelper.Modal = function($modal, options) {
        /* options incluade:
         * focusOnOpen: if set true, will focus on confirm btn when open modal
         */
        this.$modal = $modal;
        this.options = options || {};
        this.id = $modal.attr("id");

        return (this);
    };

    xcHelper.Modal.prototype = {
        setup: function() {
            // XXX to find the visiable btn, must show the modal first
            var $modal   = this.$modal;
            var eleLists = [
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
            });

            for (var i = 0, len = $focusables.length; i < len; i++) {
                addFocusEvent($focusables[i], i);
            }

            // for switch between modal tab using tab key
            $(document).on("keydown.xcModal" + this.id, function(event) {
                if (event.which === keyCode.Tab) {
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

            function addFocusEvent($focusable, index) {
                $focusable.addClass("focusable").data("tabid", index);
                $focusable.on("focus.xcModal", function() {
                    var $ele = $(this);
                    if (!isActive($ele)) {
                        return;
                    }
                    focusOn($ele.data("tabid"));
                });
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
                if ($ele == null) {
                    console.error("undefined element!");
                }
                return ($ele.is(":visible") && !$ele.is("[disabled]"));
            }
        },

        checkBtnFocus: function() {
            // check if any button is on focus
            return (this.$modal.find(".btn:focus").length > 0);
        },

        submit: function() {
            xcHelper.disableSubmit(this.$modal.find(".confirm"));
        },

        enableSubmit: function() {
            xcHelper.enableSubmit(this.$modal.find(".confirm"));
        },

        clear: function() {
            $(document).off("keydown.xcModal" + this.id);
            this.$modal.find(".focusable").off(".xcModal")
                                      .removeClass("focusable");
            this.enableSubmit();
        }
    };

    xcHelper.disableSubmit = function($submitBtn) {
        $submitBtn.prop('disabled', true);
    };

    xcHelper.enableSubmit = function($submitBtn) {
        $submitBtn.prop('disabled', false);
    };

    xcHelper.Corrector = function(words) {
        // traing texts
        // words = ["pull", "sort", "join", "filter", "aggreagte", "map"];
        var self = this;
        self.modelMap = {};
        self.model = transformAndTrain(words);

        return (self);
        // convert words to lowercase and train the word
        function transformAndTrain(features) {
            var res = {};
            var word;

            for (var i = 0, len = features.length; i < len; i++) {
                word = features[i].toLowerCase();
                if (word in res) {
                    res[word] += 1;
                } else {
                    res[word] = 2; // start with 2
                    self.modelMap[word] = features[i];
                }
            }
            return (res);
        }
    };

    xcHelper.Corrector.prototype.correct = function(word, isEdits2) {
        word = word.toLowerCase();
        var model = this.model;

        var edits1Res = edits1(word);
        var candidate;

        if (isEdits2) {
            candidate = known({word: true}) || known(edits1Res) ||
                        knownEdits2(edits1Res) || {word: true};
        } else {
            candidate = known({word: true}) || known(edits1Res) || {word: true};
        }

        var max = 0;
        var result;

        for (var key in candidate) {
            var count = getWordCount(key);

            if (count > max) {
                max = count;
                result = key;
            }
        }

        return (result);

        function getWordCount(w) {
            // smooth for no-exist word, model[word_not_here] = 1
            return (model[w] || 1);
        }

        function known(words) {
            var res = {};

            for (var w in words) {
                if (w in model) {
                    res[w] = true;
                }
            }

            return ($.isEmptyObject(res) ? null : res);
        }

        // edit distabnce of word;
        function edits1(w) {
            var splits = {};
            var part1;
            var part2;
            var wrongWord;

            for (var i = 0, len = w.length; i <= len; i++) {
                part1 = w.slice(0, i);
                part2 = w.slice(i, len);
                splits[part1] = part2;
            }

            var deletes    = {};
            var transposes = {};
            var replaces   = {};
            var inserts    = {};
            var alphabets  = "abcdefghijklmnopqrstuvwxyz".split("");

            for (part1 in splits) {
                part2 = splits[part1];

                if (part2) {
                    wrongWord = part1 + part2.substring(1);
                    deletes[wrongWord] = true;
                }

                if (part2.length > 1) {
                    wrongWord = part1 + part2.charAt(1) + part2.charAt(0) +
                                part2.substring(2);
                    transposes[wrongWord] = true;
                }

                for (var i = 0, len = alphabets.length; i < len; i++) {
                    if (part2) {
                        wrongWord = part1 + alphabets[i] + part2.substring(1);
                        replaces[wrongWord] = true;
                    }

                    wrongWord = part1 + alphabets[i] + part2;
                    inserts[wrongWord] = true;
                }
            }

            return $.extend({}, splits, deletes,
                            transposes, replaces, inserts);
        }

        function knownEdits2(e1Sets) {
            var res = {};

            for (var e1 in e1Sets) {
                var e2Sets = edits1(e1);
                for (var e2 in e2Sets) {
                    if (e2 in model) {
                        res[e2] = true;
                    }
                }
            }

            return ($.isEmptyObject() ? null : res);
        }
    };

    xcHelper.Corrector.prototype.suggest = function(word, isEdits2) {
        word = word.toLowerCase();

        var startStrCandidate = [];
        var subStrCandidate   = [];

        for (var w in this.model) {
            if (w.startsWith(word)) {
                startStrCandidate.push(w);
            } else if (w.indexOf(word) > -1) {
                subStrCandidate.push(w);
            }
        }

        if (startStrCandidate.length >= 1) {
            // suggest the only candidate that start with word
            if (startStrCandidate.length === 1) {
                return (this.modelMap[startStrCandidate[0]]);
            }
        } else if (subStrCandidate.length === 1) {
            // no candidate start with word
            // but has only one substring with word
            return (this.modelMap[subStrCandidate[0]]);
        }

        var res = this.correct(word, isEdits2);
        return (this.modelMap[res]);
    };

    return (xcHelper);
}(jQuery, {}));
