window.xcHelper = (function($, xcHelper) {

    xcHelper.getTableFromId = function(tableId) {
        return (gTables[tableId]);
    };

    xcHelper.getElementByTableId = function(tableId, prefix) {
        var $ele = $('#' + prefix + '-' + tableId);
        if ($ele.length === 0) {
            return (null);
        } else {
            return ($ele);
        }
    };

    xcHelper.parseTableId = function(idOrEl) {
        // can pass in a string or jQuery element
        var id;
        if (idOrEl instanceof jQuery) {
            id = idOrEl.attr('id');
        } else {
            id = idOrEl;
        }
        return (id.split("-")[1]);
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
            if (oldType != null && oldType !== "undefined" &&
                oldType !== type && !isAllNum)
            {
                type = "mixed";
            }
        }

        return (type);
    };

    xcHelper.getLastVisibleRowNum = function(tableId) {
        var $tableWrap = $("#xcTableWrap-" + tableId);
        if ($tableWrap.length === 0) {
            return null;
        }

        var tableBottom = $tableWrap.offset().top + $tableWrap.height();
        var $trs = $tableWrap.find(".xcTable tbody tr");

        for (var i = $trs.length - 1; i >= 0; i--) {
            var $tr = $trs.eq(i);

            if ($tr.offset().top < tableBottom) {
                var rowNum = xcHelper.parseRowNum($tr) + 1;
                return rowNum;
            }
        }

        return null;
    }

    // get unique column name
    xcHelper.getUniqColName = function(name, tableCols) {
        var colNames = {};
        for (var i = 0, numCols = tableCols.length; i < numCols; i++) {
            colNames[tableCols[i].name] = true;
        }

        var suffix  = 1;
        var newName = name;

        while (colNames.hasOwnProperty(newName)) {
            newName = name + "_" + suffix;
            ++suffix;
        }

        return (newName);
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

    xcHelper.mapColGenerate = function(colNum, colName, mapStr, tableCols, options) {
        options = options || {};
        var copiedCols = xcHelper.deepCopy(tableCols);

        if (colNum > -1) {
            var cellWidth = options.replaceColumn ?
                                copiedCols[colNum - 1].width :
                                gNewCellWidth;
            var newProgCol = ColManager.newCol({
                "index"   : colNum,
                "name"    : colName,
                "width"   : cellWidth,
                "userStr" : '"' + colName + '" =map(' + mapStr + ')',
                "isNewCol": false
            });

            newProgCol.func.func = "pull";
            newProgCol.func.args = [];
            newProgCol.func.args[0] = colName.replace(/\./g, "\\\.");

            if (options.replaceColumn) {
                copiedCols.splice(colNum - 1, 1, newProgCol);
            } else if (options.isOnRight) {
                copiedCols.splice(colNum, 0, newProgCol);
            } else {
                copiedCols.splice(colNum - 1, 0, newProgCol);
            }
        }

        return (copiedCols);
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

    xcHelper.toggleModal = function(tableId, isHide, options) {
        var $modalBackground = $("#modalBackground");
        var $mainFrame    = $("#mainFrame");
        var $sideBarModal = $("#sideBarModal");
        var $rightSideBar = $("#rightSideBar");
        var $tableWrap = xcHelper.getElementByTableId(tableId, "xcTableWrap");

        options = options || {};

        if (isHide) {
            var fadeOutTime = options.time || 150;
            // when close the modal
            $modalBackground.fadeOut(fadeOutTime, function() {
                $(this).removeClass('light');
                $mainFrame.removeClass('modalOpen');
            });

            $sideBarModal.fadeOut(fadeOutTime, function() {
                $(this).removeClass('light');
                $rightSideBar.removeClass('modalOpen');
            });

            $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                             .removeClass('tableDarkened');

            $tableWrap.removeClass('modalOpen');
        } else {
            // when open the modal
            $tableWrap.addClass('modalOpen');
            $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                             .addClass('tableDarkened');

            $rightSideBar.addClass('modalOpen');
            $mainFrame.addClass('modalOpen');
            var fadeInTime = options.time || 150;

            $sideBarModal.addClass('light').fadeIn(fadeInTime);
            $modalBackground.addClass('light').fadeIn(fadeInTime);
        }
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
            try {
                selection.addRange(range);
            } catch(error) {
                console.error(error);
            }
            
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
            $listSection.on({
                "click": function(event) {
                    if (event.which !== 1) {
                        return;
                    }

                    event.stopPropagation();
                    toggleDropdownMenu($(this).closest(".listSection"));
                },
                "mousedown": function(event) {
                    if (event.which === 1) {
                        // stop propagation of left mousedown
                        // because hide dropdown is triggered by it
                        // should invalid that when mousedown on listSection
                        return false;
                    }
                }
            }, ".icon");
        } else {
            $listSection.on({
                "click": function(event) {
                    event.stopPropagation();
                    toggleDropdownMenu($(this));
                },
                "mousedown": function() {
                    if (event.which === 1) {
                        return false;
                    }
                }
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

    xcHelper.hideDropdowns = function($container) {
        var $sections = $container.find(".listSection");
        $sections.find(".list").hide().removeClass("openList");
        $sections.removeClass("open");
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
                    StatusBox.show(error, $e, ele.formMode);
                    ele.callback();
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

    xcHelper.getTableName = function(wholeName) {
        // get out tableName from tableName + hashId
        var hashIndex = wholeName.lastIndexOf('#');
        var tableName;
        if (hashIndex > -1) {
            tableName = wholeName.substring(0, hashIndex);
        } else {
            tableName = wholeName;
        }
        return (tableName);
    };

    xcHelper.getTableId = function(wholeName) {
        // get out hashId from tableName + hashId
        var hashIndex = wholeName.lastIndexOf('#');
        var hashId;
        if (hashIndex > -1) {
            hashId = wholeName.substring(hashIndex + 1);
        } else {
            hashId = null;
            console.warn('Table name does not contain hashId');
        }
        return (hashId);
    };

    xcHelper.checkDuplicateTableName = function(tableName) {
        var deferred = jQuery.Deferred();

        XcalarGetTables()
        .then(function(result) {
            var tables = result.nodeInfo;
            for (var i = 0; i < result.numNodes; i++) {
                var name = xcHelper.getTableName(tables[i].name);
                if (name === tableName) {
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

    xcHelper.lockTable = function(tableId) {
        // lock worksheet as well
        if (tableId == null) {
            console.error("Invalid Parameters!");
            return;
        }

        var $tableWrap  = xcHelper.getElementByTableId(tableId, "xcTableWrap");
        if ($tableWrap != null &&
            $tableWrap.length !== 0 &&
            !$tableWrap.hasClass('tableLocked'))
        {
            // tableWrap may not exist during multijoin on self
            // var $lockedIcon = $('<div class="lockedIcon">' +
            //                 '<img src="/images/biglocklight.png" /></div>');
            var $lockedIcon = $('<div class="lockedIcon">' +
                                '<img src="' + paths.hourglass + '" /></div>');
            var tableHeight = $tableWrap.find('.xcTbodyWrap').height();
            var mainFrameHeight = $('#mainFrame').height();
            var topPos = 100 * ((tableHeight / mainFrameHeight) / 2);

            topPos = Math.min(topPos, 40);
            $lockedIcon.css('top', topPos + '%');

            $tableWrap.addClass('tableLocked').append($lockedIcon);
            $tableWrap.find('.xcTbodyWrap').append('<div class="tableCover">' +
                                                   '</div>');

            $tableWrap.find('.tableCover').height(tableHeight - 40);
            $('#rowScroller-' + tableId).addClass('locked');
        }
        
        var table = xcHelper.getTableFromId(tableId);
        table.isLocked = true;

        // XXX Remove it when use tableId replae tableName


        WSManager.lockTable(tableId);
    };

    xcHelper.unlockTable = function(tableId, isHidden) {
        var table = gTables[tableId];

        if (isHidden) {
            table.isLocked = false;
        } else {
            table.isLocked = false;
            var $tableWrap = xcHelper.getElementByTableId(tableId, "xcTableWrap");
            $tableWrap.find('.lockedIcon').remove();
            $tableWrap.find('.tableCover').remove();
            $tableWrap.removeClass('tableLocked');
            $('#rowScroller-' + tableId).removeClass('locked');
        }

        // XXX Remove it when use tableId replae tableName

        WSManager.unlockTable(tableId);
    };

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
            // hide tooltip when open the modal
            $(".tooltip").hide();
            // XXX to find the visiable btn, must show the modal first
            var $modal = this.$modal;
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

            $(document).on("keydown.xcModal" + this.id, function(event) {
                if (event.which === keyCode.Tab) {
                     // for switch between modal tab using tab key
                    event.preventDefault();
                    getEleToFocus();

                    return false;
                } else if (event.which === keyCode.Escape) {
                    $modal.find(".modalHeader .close").click();
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
                    return (false);
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

    // inserts text into an input field and adds commas
    xcHelper.insertText = function($input, textToInsert, prefix) {
        var value  = $input.val();
        var valLen = value.length;
        var newVal;
       
        var currentPos = $input[0].selectionStart;
        var selectionEnd = $input[0].selectionEnd;
        var numCharSelected = selectionEnd - currentPos;
        var strLeft;
        if (prefix == null) {
            prefix = "";
        }

        textToInsert = prefix + textToInsert;

        if (valLen === 0) {
            // add to empty input box
            newVal = textToInsert;
            currentPos = newVal.length;
        } else if (numCharSelected > 0) {
            // replace a column
            strLeft = value.substring(0, currentPos);
            newVal = textToInsert;
            currentPos = strLeft.length + newVal.length;
        } else if (currentPos === valLen) {
            // append a column
            if (value.endsWith(",")) {
                // value ends with ",""
                newVal = " " + textToInsert;
            } else if (value.trimRight().endsWith(",")) {
                // value ends with sth like ",  "
                newVal = textToInsert;
            } else {
                newVal = ", " + textToInsert;
            }

            currentPos = value.length + newVal.length;
        } else if (currentPos === 0) {
            // prepend a column
            if (value.startsWith(",")) {
                // value starts with ",""
                newVal = textToInsert + " ";
            } else if (value.trimLeft().startsWith(",")) {
                // value start with sth like "  ,"
                newVal = textToInsert;
            } else {
                newVal = textToInsert + ", ";
            }

            currentPos = newVal.length; // cursor at the start of value
        } else {
            // insert a column. numCharSelected == 0
            strLeft = value.substring(0, currentPos);

            newVal = textToInsert + ", ";
            currentPos = strLeft.length + newVal.length;
        }

        $input.focus();
        if (!document.execCommand("insertText", false, newVal)) {
            $input.val($input.val() + newVal);
        }
        $input[0].setSelectionRange(currentPos, currentPos);
    };

    xcHelper.when = function() {
        var numProm = arguments.length;
        var mainDeferred = jQuery.Deferred();
        
        var numDone = 0;
        var returns = [];
        var argument = arguments;
        var hasFailures = false;

        for (var t = 0; t < numProm; t++) {
            whenCall(t);
        }

        function whenCall(i) {
            argument[i].then(function(ret) {
                console.log("Promise", i, "done!");
                numDone++;
                returns[i] = ret;

                if (numDone === numProm) {
                    console.log("All done!");
                    if (hasFailures) {
                        mainDeferred.reject.apply($, returns);
                    } else {
                        mainDeferred.resolve.apply($, returns);
                    }
                }
            }, function(ret) {
                console.warn("Promise", i, "failed!");
                numDone++;
                returns[i] = ret;
                hasFailures = true;
                if (numDone === numProm) {
                    console.log("All done!");
                    mainDeferred.reject.apply($, returns);
                }

            });
        }

        return (mainDeferred.promise());
    };

    xcHelper.assert = function(statement) {
        if (!statement) {
            console.error("Assert fail!");
        }
    };

    xcHelper.centerFocusedTable = function($tableWrap, animate) {
        var windowWidth = $(window).width();
        var tableWidth = $tableWrap.width();
        var currentScrollPosition = $('#mainFrame').scrollLeft();
        var tableOffset = $tableWrap.offset().left;
        var leftPosition = currentScrollPosition + tableOffset;
        var scrollPosition = leftPosition - ((windowWidth - tableWidth) / 2);
        if (animate && !gMinModeOn) {
            $('#mainFrame').animate({scrollLeft: scrollPosition}, 500,
                                function() {
                                    moveFirstColumn();
                                    xcHelper.removeSelectionRange();
                                });
        } else {
            $('#mainFrame').scrollLeft(scrollPosition);
            moveFirstColumn();
        }
    };

    xcHelper.isTableInScreen = function(tableId) {
        var windowWidth = $(window).width();
        var $tableWrap = $("#xcTableWrap-" + tableId);
        var tableLeft = $tableWrap.offset().left;
        var tableRight = tableLeft + $tableWrap.width();

        return (tableRight >= 0) && (tableLeft <= windowWidth);
    };

    return (xcHelper);
}(jQuery, {}));

