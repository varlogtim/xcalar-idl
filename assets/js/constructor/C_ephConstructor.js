// some general class
function XcMap() {
    this.map = {};
    return this;
}

XcMap.prototype = {
    entries: function() {

        return this.map;
    },

    set: function(id, item) {
        this.map[id] = item;
    },

    get: function(id) {
        return this.map[id];
    },

    has: function(id) {
        return this.map.hasOwnProperty(id);
    },

    delete: function(id) {
        delete this.map[id];
    },

    clear: function() {
        this.map = {};
    }
};

function Mutex(key, scope) {
    if (!key || !(typeof(key) === "string")) {
        console.log("No/Illegal mutex key, generating a random one.");
        key = xcHelper.randName("mutex", 5);
    }
    this.key = key;
    if (!scope) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }
    this.scope = scope;
    return this;
}

// workbookManager.js
function WKBKSet() {
    this.set = {};

    return this;
}

WKBKSet.prototype = {
    get: function(wkbkId) {
        return this.set[wkbkId];
    },

    getWithStringify: function() {
        return JSON.stringify(this.set);
    },

    getAll: function() {
        return this.set;
    },

    put: function(wkbkId, wkbk) {
        this.set[wkbkId] = wkbk;
    },

    has: function(wkbkId) {
        return this.set.hasOwnProperty(wkbkId);
    },

    delete: function(wkbkId) {
        delete this.set[wkbkId];
    }
};

// global MouseEvents
// useful to keep track of mousedown so when a blur happens, we know what
// element was clicked on to cause the blur
function MouseEvents() {
    var $lastMouseDownTarget = $(document);
    var $lastClickTarget = $lastMouseDownTarget;
    var lastTime = (new Date()).getTime();
    // will store last 3 mousedowns (needed for undo)
    var lastMouseDownTargets = [$lastMouseDownTarget];
    var $lastMDParents = $lastMouseDownTarget;

    this.setMouseDownTarget = function($element) {
        if (!$element) {
            $lastMouseDownTarget = $();
        } else {
            $lastMouseDownTarget = $element;
        }

        $lastMDParents = $lastMouseDownTarget.parents();

        lastTime = (new Date()).getTime();

        // store up to last 3 mousedowns
        if (lastMouseDownTargets.length === 3) {
            lastMouseDownTargets.splice(2, 1);
        }
        lastMouseDownTargets.unshift($element);
    };

    this.setClickTarget = function($element) {
        $lastClickTarget = $element;
    };

    this.getLastMouseDownTarget = function() {
        return $lastMouseDownTarget;
    };
    this.getLastMouseDownParents = function() {
        return $lastMDParents;
    };
    this.getLastMouseDownTargets = function() {
        return lastMouseDownTargets;
    };

    this.getLastClickTarget = function() {
        return $lastClickTarget;
    };

    this.getLastMouseDownTime = function() {
        return lastTime;
    };
}

// dsPreview.js
function DSFormController() {
    return this;
}

DSFormController.prototype = {
    set: function(options) {
        options = options || {};
        this.previewSet = {};
        this.files = this.files || [];

        if (options.targetName != null) {
            this.targetName = options.targetName;
        }

        if (options.multiDS != null) {
            this.multiDS = options.multiDS || false;
        }

        /*
         * each ele of files:
         *  {
         *      path: path of the file.folder
         *      recursive: recursive or not
         *      dsToReplace: dsId that to replace
         *      dsName: dsName to restore
         *  }
         */
        if (options.files != null) {
            this.files = options.files;
        }

        if (options.format != null) {
            this.format = options.format;
        }

        if (options.pattern != null) {
            this.pattern = options.pattern;
        }

        if (options.typedColumns != null) {
            this.typedColumns = options.typedColumns;
        }
    },

    reset: function() {
        this.fieldDelim = "";
        this.lineDelim = "\n";
        this.hasHeader = false;
        this.quote = "\"";
        this.previewFile = null;
        this.previewSet = {};
        this.files = [];

        delete this.multiDS;
        delete this.targetName;
        delete this.path;
        delete this.format;
        delete this.pattern;
        delete this.udfModule;
        delete this.udfFunc;
        delete this.typedColumns;
    },

    getTargetName: function() {
        return this.targetName;
    },

    getFile: function(index) {
        return this.files[index];
    },

    getFormat: function() {
        return this.format;
    },

    setFormat: function(format) {
        this.format = format;
    },

    useHeader: function() {
        return this.hasHeader;
    },

    setHeader: function(hasHeader) {
        if (hasHeader == null) {
            this.hasHeader = !this.hasHeader;
        } else {
            this.hasHeader = hasHeader;
        }
    },

    setFieldDelim: function(fieldDelim) {
        this.fieldDelim = fieldDelim;
    },

    getFieldDelim: function() {
        return this.fieldDelim;
    },

    setLineDelim: function(lineDelim) {
        this.lineDelim = lineDelim;
    },

    getLineDelim: function() {
        return this.lineDelim;
    },

    setQuote: function(quote) {
        this.quote = quote;
    },

    getQuote: function() {
        return this.quote;
    },

    setPreviewFile: function(file) {
        this.previewFile = file;
    },

    getPreviewFile: function() {
        return this.previewFile;
    },

    getPattern: function() {
        return this.pattern;
    },

    getArgStr: function() {
        var args = $.extend({}, this);
        delete args.previewFile;
        delete args.typedColumns;
        delete args.files;
        delete args.multiDS;
        delete args.previewSet;
        return JSON.stringify(args);
    },

    setOriginalTypedColumns: function(typedColumns) {
        this.typedColumns = typedColumns;
    },

    getOriginalTypedColumns: function() {
        return this.typedColumns;
    },

    isUniqueSingleFile: function() {
        return (this.files.length === 1 && this.files[0].isFolder === false);
    },

    isAllSingleFile: function() {
        var files = this.files;
        for (var i = 0, len = files.length; i < len; i++) {
            if (!(files[i].isFolder === false)) {
                // null case or true case
                return false;
            }
        }
        return true;
    },

    listFileInPath: function(path, recursive) {
        // set local variable at first in case
        // in the middle of async call this.previewSet get reset
        var previewSet = this.previewSet;
        if (previewSet.hasOwnProperty(path)) {
            return PromiseHelper.resolve(previewSet[path]);
        } else {
            var deferred = jQuery.Deferred();
            var options = {
                "targetName": this.getTargetName(),
                "path": path,
                "recursive": recursive
            };
            XcalarListFiles(options)
            .then(function(res) {
                previewSet[path] = res;
                deferred.resolve(res);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    },
};

// worksheet.js
function WorksheetScrollTracker() {
    this.positionMap = {};
    return this;
}

WorksheetScrollTracker.prototype = {
    cache: function(worksheetId) {
        this.positionMap[worksheetId] = $("#mainFrame").scrollLeft();
    },

    restore: function(worksheetId) {
        var leftPosition = this.positionMap[worksheetId];
        if (leftPosition != null) {
            $("#mainFrame").scrollLeft(leftPosition);
        }

        return leftPosition;
    }
};

/* Corrector */
function Corrector(words) {
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
}

Corrector.prototype = {
    correct: function(word, isEdits2) {
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
    },

    // returns only 1 value
    suggest: function(word, isEdits2) {
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
    }
};
/* End of Corrector */

/* SearchBar */
/*
 * options:
 * ignore: string or number, if ignore value is present in input, searching
 *         will not occur
 * removeSelected: function, callback for removing highlighted text
 * highlightSelected: function, callback for highlighted text
 * scrollMatchIntoView: function, callback for scrolling to a highlighted match
 * onInput: function, callback for input event
 * onEnter: function, callback for enter event
 * removeHighlight: boolean, if true, will unwrap $list contents and remove
 *                 highlighted class
 * arrowsPreventDefault: boolean, if true, preventDefault & stopPropagation will
                         be applied to the search arrows
 * codeMirror: codeMirror object
 * $input: jquery input, will search for 'input' in $searchArea by default
 * $list: container (typically a ul) for search contents
 *
 */

function SearchBar($searchArea, options) {
    options = options || {};
    this.$searchArea = $searchArea;
    this.$counter = $searchArea.find('.counter');
    this.$position = this.$counter.find('.position');
    this.$total = this.$counter.find('.total');
    this.$arrows = $searchArea.find('.arrows');
    this.$upArrow = $searchArea.find('.upArrow');
    this.$downArrow = $searchArea.find('.downArrow');
    this.options = options || {};
    this.matchIndex = null;
    this.numMatches = 0;
    this.$matches = [];
    this.$list = options.$list; // typically a ul element

    if (options.codeMirror) {
        this.$searchInput = options.$input;
        this.codeMirror = options.codeMirror;
    } else {
        this.$searchInput = $searchArea.find('input');
    }

    if (this.$searchArea.parent().hasClass("slidingSearchWrap")) {
        this.isSlider = true;
    }

    if (typeof options.toggleSliderCallback === "function") {
        this.toggleSliderCallback = options.toggleSliderCallback;
    }

    this._setup();

    return this;
}

SearchBar.prototype = {
    _setup: function() {
        var searchBar = this;
        var options = searchBar.options || {};
        var $searchInput;
        if (options.codeMirror) {
            $searchInput = searchBar.codeMirror;
        } else {
            $searchInput = searchBar.$searchInput;
        }

        // keydown event for up, down, enter keys
        // secondaryEvent is the event passed in by codemirror
        function handleKeyDownEvent(event, secondaryEvent) {
            if (searchBar.numMatches === 0) {
                return;
            }
            var e;
            if (searchBar.codeMirror) {
                e = secondaryEvent;
            } else {
                e = event;
            }

            if (e.which === keyCode.Up ||
                e.which === keyCode.Down ||
                e.which === keyCode.Enter) {
                var val;
                if (searchBar.codeMirror) {
                    val = searchBar.codeMirror.getValue();
                } else {
                    val = $searchInput.val();
                }
                val = val.trim();
                // if ignore value exists in the input, do not search
                if (options.ignore && val.indexOf(options.ignore) !== -1) {
                    return;
                }

                if (e.preventDefault) {
                    e.preventDefault();
                }
                var $matches = searchBar.$matches;

                if (e.which === keyCode.Up) {
                    searchBar.matchIndex--;
                    if (searchBar.matchIndex < 0) {
                        searchBar.matchIndex = searchBar.numMatches - 1;
                    }

                } else if (e.which === keyCode.Down ||
                           e.which === keyCode.Enter) {
                    searchBar.matchIndex++;
                    if (searchBar.matchIndex >= searchBar.numMatches) {
                        searchBar.matchIndex = 0;
                    }
                }
                if (options.removeSelected) {
                    options.removeSelected();
                }
                var $selectedMatch = $matches.eq(searchBar.matchIndex);
                if (options.highlightSelected) {
                    options.highlightSelected($selectedMatch);
                }
                $selectedMatch.addClass('selected');
                searchBar.$position.html(searchBar.matchIndex + 1);
                searchBar.scrollMatchIntoView($selectedMatch);
                if (e.which === keyCode.Enter &&
                    typeof options.onEnter === "function") {
                    options.onEnter();
                }
            }
        }
        // secondaryEvent is the event passed in by codemirror
        $searchInput.on("keydown", function(event, secondaryEvent) {
            handleKeyDownEvent(event, secondaryEvent);
        });

        searchBar.$downArrow.click(function() {
            var evt = {which: keyCode.Down, type: 'keydown'};
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                $searchInput.trigger(evt);
            }
        });

        searchBar.$upArrow.click(function() {
            var evt = {which: keyCode.Up, type: 'keydown'};
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                $searchInput.trigger(evt);
            }
        });

        if (options.arrowsPreventDefault) {
            searchBar.$arrows.mousedown(function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        // click listener on search icon for searchbar sliding
        if (searchBar.isSlider) {
            searchBar.$searchArea.find(".searchIcon").click(function() {
                searchBar.toggleSlider();
            });
        }

        if (typeof options.onInput === "function") {
            searchBar.$searchInput.on("input", function(event) {
                var val = $(this).val();
                options.onInput(val, event);
            });
        }
    },
    highlightSelected: function($match) {
        if (this.options.highlightSelected) {
            return (this.options.highlightSelected($match));
        } else {
            return (undefined);
        }
    },
    scrollMatchIntoView: function($match) {
        if (this.options.scrollMatchIntoView) {
            return (this.options.scrollMatchIntoView($match));
        } else {
            return (this._scrollMatchIntoView($match));
        }
    },
    _scrollMatchIntoView: function($match) {
        var $list = this.$list;
        if (!$list || $list.length === 0) {
            return;
        }
        xcHelper.scrollIntoView($match, $list);
    },
    updateResults: function($matches) {
        var searchBar = this;
        searchBar.$matches = $matches;
        searchBar.numMatches = $matches.length;
        searchBar.$matches.eq(0).addClass('selected');
        var position = Math.min(1, searchBar.numMatches);
        searchBar.matchIndex = position - 1;
        searchBar.$position.text(position);
        searchBar.$total.text("of " + searchBar.numMatches);
        if (searchBar.isSlider) {
            searchBar.$searchInput.css("padding-right",
                                        searchBar.$counter.width() + 25);
        }
    },
    clearSearch: function(callback, options) {
        var searchBar = this;
        searchBar.$position.html("");
        searchBar.$total.html("");
        searchBar.matchIndex = 0;
        searchBar.$matches = [];
        searchBar.numMatches = 0;
        if (!options || !options.keepVal) {
            if (searchBar.codeMirror) {
                searchBar.codeMirror.setValue("");
            } else {
                searchBar.$searchInput.val("");
            }
        }
        if (searchBar.options.removeHighlight && searchBar.$list) {
            searchBar.$list.find(".highlightedText").contents().unwrap();
        }
        if (searchBar.isSlider) {
            searchBar.$searchInput.css("padding-right", 25);
        }

        if (typeof callback === "function") {
            callback();
        }
    },
    toggleSlider: function() {
        var searchBar = this;
        if (!searchBar.isSlider) {
            return;
        }
        var $searchBar = searchBar.$searchArea;
        if ($searchBar.hasClass('closed')) {
            $searchBar.removeClass('closed');
            setTimeout(function() {
                searchBar.$searchInput.focus();
            }, 310);

        } else {
            $searchBar.addClass('closed');
            searchBar.$searchInput.val("");

            if (searchBar.toggleSliderCallback) {
                searchBar.toggleSliderCallback();
            } else {
                searchBar.clearSearch();
            }
        }
    }
};
/* End of SearchBar */

/* Modal Helper */
// an object used for global Modal Actions
function ModalHelper($modal, options) {
    /* options include:
     * noResize: if set true, will not reszie the modal
     * sizeToDefault: if set true, will set to initial width and height when open
     * defaultWidth: integer, optional
     * defaultHeight: integer, optional
     * noCenter: if set true, will not center the modal
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * noEnter: if set true, no event listener on key enter,
     * noBackground: if set true, no darkened modal background
     * beforeResize: funciton called before modal resizing
     * resizeCallback: function called during modal resizing
     * afterResize: funciton called after modal resizing
     */
    options = options || {};
    this.$modal = $modal;
    this.options = options;
    this.id = $modal.attr("id");
    this.defaultWidth = options.defaultWidth || $modal.width();
    this.defaultHeight = options.defaultHeight || $modal.height();
    this.minWidth = options.minWidth ||
                    parseFloat($modal.css("min-width")) ||
                    this.defaultWidth;
    this.minHeight = options.minHeight ||
                     parseFloat($modal.css("min-height")) ||
                     this.defaultHeight;

    this.__init();
    return this;
}

ModalHelper.prototype = {
    __init: function() {
        var self = this;
        var $modal = self.$modal;
        var options = self.options;

        // full screen and exit full screen buttons
        var $fullScreenBtn = $modal.find(".fullScreen");
        var $exitFullScreenBtn = $modal.find(".exitFullScreen");
        if ($fullScreenBtn.length) {
            $fullScreenBtn.click(function() {
                if (options.beforeResize) {
                    options.beforeResize();
                }
                var winWidth = $(window).width();
                var winHeight = $(window).height();
                $modal.width(winWidth - 14);
                $modal.height(winHeight - 9);
                $modal.css({
                    "top": 0,
                    "left": Math.round((winWidth - $modal.width()) / 2)
                });
                self.__resizeCallback();
            });

        }
        if ($exitFullScreenBtn.length) {
            $exitFullScreenBtn.click(function() {
                if (options.beforeResize) {
                    options.beforeResize();
                }
                var minWidth  = options.minWidth || 0;
                var minHeight = options.minHeight || 0;
                $modal.width(minWidth);
                $modal.height(minHeight);
                self.center();
                self.__resizeCallback();
            });
        }

        // draggable
        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        // resizable
        if (!options.noResize) {
            $modal.resizable({
                "handles": "n, e, s, w, se",
                "minHeight": self.minHeight,
                "minWidth": self.minWidth,
                "containment": "document",
                "start": options.beforeResize || null,
                "resize": options.resizeCallback || null,
                "stop": options.afterResize || null
            });
        }
    },

    __resizeCallback: function() {
        var self = this;
        var $modal = self.$modal;
        var options = self.options;
        if (options.resizeCallback) {
            options.resizeCallback(null, {
                size: {width: $modal.width(), height: $modal.height()}
            });
        }
        if (options.afterResize) {
            options.afterResize();
        }
    },

    setup: function(extraOptions) {
        var self = this;
        var deferred = jQuery.Deferred();
        var $modal = this.$modal;
        var options = $.extend(this.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcHelper.removeSelectionRange();
        // hide tooltip when open the modal
        xcTooltip.hideAll();

        if (!options.keepFnBar) {
            FnBar.clear();
            $(".selectedCell").removeClass("selectedCell");
        }

        // resize modal
        if (options.sizeToDefault) {
            self.__resizeToDefault();
        } else {
            self.__resizeToFitScreen();
        }

        // center modal
        if (!options.noCenter) {
            var centerOptions = options.center || {};
            this.center(centerOptions);
        }

        // Note: to find the visiable btn, must show the modal first
        if (!options.noTabFocus) {
            this.refreshTabbing();
        }

        $(document).on("keydown.xcModal" + this.id, function(event) {
            if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                $modal.find(".modalHeader .close").click();
                return false;
            } else if (event.which === keyCode.Enter) {
                if (options.noEnter || ($(":focus").hasClass('btn') &&
                    $(":focus").closest('#' + self.id).length)) {
                    // let default behavior take over
                    return true;
                }
                var $btn = $modal.find('.modalBottom .btn:visible')
                                .filter(function() {
                                    return (!$(this).hasClass('cancel') &&
                                            !$(this).hasClass('close'));
                                });
                if ($btn.length === 0) {
                    // no confirm button so treat as close
                    if (!$modal.hasClass('locked')) {
                        $modal.find(".modalHeader .close").click();
                    }
                } else if ($btn.length === 1) {
                    // trigger confirm
                    $btn.click();
                } else {
                    // multiple confirm buttons
                    StatusBox.show(ErrTStr.SelectOption,
                                    $modal.find('.modalBottom'), false, {
                                        "type": "info",
                                        "highZindex": true,
                                        "offsetY": 12
                                    });
                }
                return false;
            }
        });

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else if (!options.noBackground) {
            var $modalBg = $("#modalBackground");

            if (gMinModeOn) {
                $modalBg.show();
                $modal.show();
                deferred.resolve();
            } else {
                $modal.fadeIn(180);
                $modalBg.fadeIn(300, function() {
                    deferred.resolve();
                    $modalBg.css('display', 'block'); // when alert modal opens
                    // and drop table modal is open
                });
            }
        } else {
            $modal.addClass("noBackground").show();
            deferred.resolve();
        }

        return deferred.promise();
    },

    // resize modal back to it's default width and height
    __resizeToDefault: function() {
        var $modal = this.$modal;
        $modal.width(this.defaultWidth);
        $modal.height(this.defaultHeight);
    },

    __resizeToFitScreen: function() {
        var $modal = this.$modal;
        var winWidth = $(window).width();
        var winHeight = $(window).height();
        var minWidth = this.minWidth;
        var minHeight = this.minHeight;
        var width = $modal.width();
        var height = $modal.height();

        if (width > winWidth - 10) {
            width = Math.max(winWidth - 40, minWidth);
        }

        if (height > winHeight - 10) {
            height = Math.max(winHeight - 40, minHeight);
        }

        $modal.width(width).height(height);
        $modal.css({
            "minHeight": minHeight,
            "minWidth": minWidth
        });
    },

    // This function prevents the user from clicking the submit button multiple
    // times
    disableSubmit: function() {
        xcHelper.disableSubmit(this.$modal.find(".confirm"));
    },

    // This function reenables the submit button after the checks are done
    enableSubmit: function() {
        xcHelper.enableSubmit(this.$modal.find(".confirm"));
    },

    clear: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var options = $.extend(this.options, extraOptions) || {};
        var $modal = this.$modal;
        var numModalsOpen = $('.modalContainer:visible:not(#aboutModal):not(#liveHelpModal)').length;
        $(document).off("keydown.xcModal" + this.id);
        $(document).off("keydown.xcModalTabbing" + this.id);
        $modal.removeClass("noBackground");
        $modal.find(".focusable").off(".xcModal")
                                 .removeClass("focusable");
        this.enableSubmit();
        if (numModalsOpen < 2) {
            $("body").removeClass("no-selection");
        }
        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            var $modalBg = $("#modalBackground");
            var fadeOutTime = gMinModeOn ? 0 : 300;
            $modal.hide();
            if (options.noBackground) {
                deferred.resolve();
            } else {
                if (numModalsOpen < 2) {
                    $modalBg.fadeOut(fadeOutTime, function() {
                        deferred.resolve();
                    });
                } else {
                    deferred.resolve();
                }
            }
        }

        return deferred.promise();
    },

    center: function(options) {
        /*
         * to position modal in the center of the window
         * options:
         * horizontalOnly: if true, only horizontal cenater
         * verticalQuartile: if true, vertical top will be 1/4
         * maxTop: max top it could be
         * noLimitTop: if true, it will always center
                    with equal space on top and bottom,
                    if false, top will be minimum 0 and bottom will overfolw
                    when modal height is larger then window height
         */
        options = options || {};

        var $window = $(window);
        var $modal = this.$modal;
        var winWidth = $window.width();
        var modalWidth = $modal.width();
        var left = (winWidth - modalWidth) / 2;

        if (options.horizontalOnly) {
            $modal.css({"left": left});
            return;
        }

        var winHeight = $window.height();
        var modalHeight = $modal.height();
        var top;

        if (options.verticalQuartile) {
            top = (winHeight - modalHeight) / 4;
        } else {
            top = (winHeight - modalHeight) / 2;
        }

        if (options.maxTop && top < options.maxTop) {
            top = options.maxTop;
            var bottom = top + modalHeight;
            if (bottom > winHeight) {
                top -= (bottom - winHeight);
            }
        }

        if (!options.noLimitTop) {
            top = Math.max(top, 0);
        }

        $modal.css({
            "left": left,
            "top": top
        });
    },
    // options:
    // time - fade out or fade in time in ms
    // opSection - if operations section is opening
    toggleBG: function(tableId, isHide, options) {
        var $modalBg = $("#modalBackground");
        var $mainFrame = $("#mainFrame");
        var $tableWrap;

        if (tableId === "all") {
            $tableWrap = $('.xcTableWrap:visible');
        }

        options = options || {};

        if (isHide) {
            var fadeOutTime;
            if (options.time == null) {
                fadeOutTime = 150;
            } else {
                fadeOutTime = options.time;
            }

            // when close the modal
            if (gMinModeOn) {
                $modalBg.hide();
                $modalBg.removeClass('light');
                $mainFrame.removeClass('modalOpen');
            } else {
                $modalBg.fadeOut(fadeOutTime, function() {
                    $modalBg.removeClass('light');
                    $mainFrame.removeClass('modalOpen');
                });
            }

            if (tableId) {
                $tableWrap.removeClass('modalOpen');
            }
        } else {
            // when open the modal
            if (tableId) {
                $tableWrap.addClass('modalOpen');
            }

            $mainFrame.addClass('modalOpen');
            var fadeInTime;
            if (options.time === null) {
                fadeInTime = 150;
            } else {
                fadeInTime = options.time;
            }
            if (gMinModeOn) {
                $modalBg.addClass('light');
                $modalBg.show();
            } else {
                $modalBg.addClass('light').fadeIn(fadeInTime);
            }
        }
    },

    addWaitingBG: function() {
        var $modal = this.$modal;
        var waitingBg = '<div id="modalWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>';
        $modal.append(waitingBg);
        var $waitingBg =  $('#modalWaitingBG');
        var modalHeaderHeight = $modal.find('.modalHeader').height();
        var modalHeight = $modal.height();

        $waitingBg.height(modalHeight - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        if (gMinModeOn) {
            $waitingBg.find(".waitingIcon").show();
        } else {
            setTimeout(function() {
                $waitingBg.find('.waitingIcon').fadeIn();
            }, 200);
        }
    },

    removeWaitingBG: function() {
        if (gMinModeOn) {
            $('#modalWaitingBG').remove();
        } else {
            $('#modalWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    },

    refreshTabbing: function() {
        var $modal = this.$modal;

        $(document).off("keydown.xcModalTabbing" + this.id);

        $modal.find(".focusable").off(".xcModal")
                                 .removeClass("focusable");

        var eleLists = [
            $modal.find(".btn"),     // buttons
            $modal.find("input")     // input
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

        $(document).on("keydown.xcModalTabbing" + this.id, function(event) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();

                return false;
            }
        });

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
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
            // the current ele is not active, should no by focused
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
            } else {
                focusIndex = 0; // reset
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
                throw "undefined element!";
            }
            return ($ele.is(":visible") && !$ele.is("[disabled]") &&
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable") &&
                    !$ele.hasClass("btn-disabled") &&
                    $ele.css('visibility') !== "hidden");
        }
    }
};

/* End modalHelper */

/* Export Helper */
function ExportHelper($view) {
    this.$view = $view;

    return this;
}

ExportHelper.getTableCols = function(tableId, validTypes) {
    // each li has data-colnum that will link it to the corresponding
    // xcTable header
    var html = "";
    var numBlanks = 10; // to take up flexbox space
    var allCols = gTables[tableId].getAllCols();

    allCols.forEach(function(progCol, index) {
        if (validTypes.indexOf(progCol.getType()) > -1) {
            var colName = xcHelper.escapeHTMLSpecialChar(
                                progCol.getFrontColName(true));
            var colNum = (index + 1);
            html +=
                '<li class="checked" data-colnum="' + colNum + '">' +
                    '<span class="text tooltipOverflow" ' +
                    'data-original-title="' +
                        xcHelper.escapeDblQuoteForHTML(
                            xcHelper.escapeHTMLSpecialChar(colName)) + '" ' +
                    'data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body">' +
                        colName +
                    '</span>' +
                    '<div class="checkbox checked">' +
                        '<i class="icon xi-ckbox-empty fa-13"></i>' +
                        '<i class="icon xi-ckbox-selected fa-13"></i>' +
                    '</div>' +
                '</li>';
        }
    });

    for (var i = 0; i < numBlanks; i++) {
        html += '<div class="flexSpace"></div>';
    }
    return (html);
};

ExportHelper.prototype = {
    setup: function() {
        var self = this;
        self.$view.on("click", ".renameSection .renameIcon", function() {
            self._smartRename($(this).closest(".rename"));
        });
    },

    showHelper: function() {
        $('.xcTableWrap').addClass('exportMode');
    },

    clear: function() {
        this.$view.find(".renameSection").addClass("xc-hidden")
                    .find(".renamePart").empty();
        $('.xcTableWrap').removeClass('exportMode');
    },

    clearRename: function($group) {
        var $target;
        if ($group && $group.length) {
            $target = $group;
        } else {
            $target = this.$view;
        }
        $target.find(".renameSection").addClass("xc-hidden")
                    .find(".renamePart").empty();
    },

    getExportColumns: function($group) {
        var self = this;
        var $target;
        if ($group && $group.length) {
            $target = $group;
        } else {
            $target = self.$view;
        }

        var colsToExport = [];
        var $colsToExport = $target.find('.columnsToExport');

        $colsToExport.find('.cols li.checked').each(function() {
            colsToExport.push($(this).text().trim());
        });

        return colsToExport;
    },

    checkColumnNames: function(columnNames, $group) {
        if (columnNames == null) {
            return null;
        }

        var self = this;
        var $target;
        if ($group && $group.length) {
            $target = $group;
        } else {
            $target = this.$view;
        }
        if ($target.find(".renameSection").hasClass("xc-hidden")) {
            // when need check name conflict
            return self._checkNameConflict(columnNames, $target);
        } else {
            // when in rename step
            return self._checkRename(columnNames, $target);
        }
    },

    _checkNameConflict: function(columnNames, $target) {
        var self = this;
        var takenName = {};
        var invalidNames = [];
        var colNamesAfterCheck = [];

        columnNames.forEach(function(colName) {
            var parsedName = xcHelper.parsePrefixColName(colName).name;
            if (takenName.hasOwnProperty(parsedName)) {
                var nameWithConfilct = takenName[parsedName];
                // also need to include the name with conflict in rename
                if (!invalidNames.includes(nameWithConfilct)) {
                    invalidNames.push(nameWithConfilct);
                }
                invalidNames.push(colName);
            } else {
                takenName[parsedName] = colName;
                colNamesAfterCheck.push(parsedName);
            }
        });

        if (invalidNames.length > 0) {
            // when has name conflict
            self._addRenameRows(invalidNames, $target);
            return null;
        } else {
            return colNamesAfterCheck;
        }
    },

    _checkRename: function(columnNames, $target) {
        var takenName = {};
        var renameMap = {};
        var invalid = false;

        // put all names first
        // use parsed name because takenNames that do not get renamed will be
        // parsed
        columnNames.forEach(function(colName) {
            takenName[xcHelper.parsePrefixColName(colName).name] = true;
        });

        var $renameSection = $target.find(".renameSection");
        $renameSection.find(".rename").each(function() {
            var $row = $(this);
            var newName = $row.find(".newName").val();
            if (!newName) {
                $renameSection.closest(".group.minimized").removeClass("minimized");
                FormHelper.scrollToElement($renameSection);
                StatusBox.show(ErrTStr.NoEmpty, $row);
                invalid = true;
                return false;
            }
            var origName = $row.find(".origName").val();

            if (takenName.hasOwnProperty(newName) && origName !== newName) {
                $renameSection.closest(".group.minimized").removeClass("minimized");
                FormHelper.scrollToElement($renameSection);
                StatusBox.show(ErrTStr.NameInUse, $row);
                invalid = true;
                return false;
            }

            renameMap[origName] = newName;
            takenName[newName] = true;
        });

        if (invalid) {
            return null;
        }

        var colNamesAfterCheck = [];
        columnNames.forEach(function(colName) {
            if (renameMap.hasOwnProperty(colName)) {
                colNamesAfterCheck.push(renameMap[colName]);
            } else {
                var parsedName = xcHelper.parsePrefixColName(colName).name;
                colNamesAfterCheck.push(parsedName);
            }
        });

        return colNamesAfterCheck;
    },

    _addRenameRows: function(columnsToRename, $target) {
        var $renameSection = $target.find(".renameSection");
        var $renamePart = $renameSection.find(".renamePart");

        $renamePart.empty();

        for (var i = 0, len = columnsToRename.length; i < len; i++) {
            var $row = $(FormHelper.Template.rename);
            $row.find(".origName").val(columnsToRename[i]);
            $renamePart.append($row);
        }

        $renameSection.removeClass("xc-hidden");
        $renameSection.closest(".group.minimized").removeClass("minimized");
    },

    _smartRename: function($colToRename) {
        var self = this;
        var origName = $colToRename.find(".origName").val();
        var currentColumNames = self.getExportColumns($colToRename.closest(".group"));
        var nameMap = {};

        // collect all existing names
        currentColumNames.forEach(function(columnName) {
            if (columnName !== origName) {
                nameMap[columnName] = true;
            }
        });

        $colToRename.siblings(".rename").each(function() {
            if ($(this).find(".origName").is($colToRename.find(".origName"))) {
                return true;
            }
            var columnName = $(this).find(".newName").val();
            if (columnName) {
                nameMap[columnName] = true;
            }
        });

        var parsedResult = xcHelper.parsePrefixColName(origName);
        var newName;
        if (parsedResult.prefix) {
            newName = parsedResult.prefix + "-" + parsedResult.name;
        } else {
            newName = parsedResult.name;
        }
        var validName = xcHelper.autoName(newName, nameMap);
        $colToRename.find(".newName").val(validName);
    }
};

/* Form Helper */
// an object used for global Form Actions
function FormHelper($form, options) {
    /* options include:
     * focusOnOpen: if set true, will focus on confirm btn when open form
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * columnPicker: a object with column picker options, has attrs:
     *      state: the column picker's state
     *      mainMenuState: main menu's state before open the view
     *      noEvent: if set true, no picker event handler
     *      colCallback: called when click on column
     *      headCallback: called when click on table head
     *      dagCallback: called when click on dagtable icon
     *      validColTypes: (optional) array of valid column types
     */
    this.$form = $form;
    this.options = options || {};
    this.id = $form.attr("id");
    this.state = null;
    this.mainMenuState = null;
    this.openTime = null;
    this.isFormOpen = false;

    this.__init();

    return this;
}

FormHelper.Template = {
    "rename": '<div class="rename">' +
                '<input class="columnName origName arg" type="text" ' +
                'spellcheck="false" disabled/>' +
                '<div class="middleIcon renameIcon">' +
                    '<div class="iconWrapper">' +
                        '<i class="icon xi-play-circle fa-14"></i>' +
                    '</div>' +
                '</div>' +
                '<input class="columnName newName arg" type="text" ' +
                  'spellcheck="false"/>' +
            '</div>'
};

FormHelper.updateColumns = function(tableId) {
    DFCreateView.updateTables(tableId, true);
    ProjectView.updateColumns();
    OperationsView.updateColumns();
    JoinView.updateColumns();
    ExportView.updateColumns();
    SmartCastView.updateColumns(tableId);
    UnionView.updateColumns(tableId);
    SortView.updateColumns(tableId);
    // extensions view doesn't cache columns
};

// used for forms in the left panel
// options: paddingTop: integer, pixels from the top to position
FormHelper.scrollToElement = function($el, options) {
    options = options || {};
    var paddingTop = options.paddingTop || 0;
    var $container = $el.closest(".mainContent");
    var $containerTop = $container.offset().top;
    var $elTop = $el.offset().top;
    // only scrolls if top of $el is not visible
    if ($elTop > $containerTop + $container.height() ||
        $elTop < $containerTop) {
        var newScrollTop = $elTop + $container.scrollTop() - $containerTop;
        $container.scrollTop(newScrollTop - paddingTop);
    }
};

FormHelper.prototype = {
    // called only once per form upon creation
    __init: function() {
        // tooltip overflow setup
        var self = this;
        var $form = self.$form;
        $form.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    },

    // called everytime the form opens
    setup: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var self = this;
        var $form = self.$form;
        var options = $.extend(self.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcHelper.removeSelectionRange();
        // hide tooltip when open the form
        xcTooltip.hideAll();
        $(".selectedCell").removeClass("selectedCell");
        FnBar.clear();

        // Note: to find the visiable btn, must show the form first
        if (!options.noTabFocus) {
            self.refreshTabbing();
        }

        $(document).on("keydown.xcForm", function(event) {
            if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                if (!$form.is(":visible")) {
                    return true;
                }
                $form.find(".close").click();
                return false;
            }
        });

        // setup columnPicker
        var columnPicker = options.columnPicker || {};
        self.state = "columnPicker";
        if (columnPicker.state != null) {
            self.state += " " + columnPicker.state;
            $("#container").addClass(self.state);
        }

        // see table.less of the class
        // it stop some default events
        $(".xcTableWrap").addClass('columnPicker');

        // add noColumnPicker class to array and object columns
        if (!options.allowAllColPicker) {
            var $headers = $(".xcTable").find(".header");
            var $arrayHeaders = $headers.filter(function() {
                return $(this).hasClass("type-array");
            }).addClass("noColumnPicker").attr("data-tipClasses", "invalidTypeTip");
            var $objHeaders = $headers.filter(function() {
                return $(this).hasClass("type-object");
            }).addClass("noColumnPicker").attr("data-tipClasses", "invalidTypeTip");

            xcTooltip.add($arrayHeaders, {
                title: ColTStr.NoOperateArray,
                container: "body",
                placement: "bottom"
            });

            xcTooltip.add($objHeaders, {
                title: ColTStr.NoOperateObject,
                container: "body",
                placement: "bottom"
            });
        }

        if (columnPicker.validColTypes) {
            var validTypes = columnPicker.validColTypes;
            var $otherHeaders = $();

            $(".xcTable").each(function() {
                var $table = $(this);
                var table = gTables[xcHelper.parseTableId($table)];
                var $invalidHeaders = $table.find(".header").filter(function() {
                    var $header = $(this);
                    if ($header.hasClass("noColumnPicker")) {
                        return false;
                    }
                    var colNum = xcHelper.parseColNum($header.parent());
                    if (colNum > 0) {
                        var type = table.getCol(colNum).getType();
                        return (validTypes.indexOf(type) === -1);
                    } else {
                        return false;
                    }
                });
                $otherHeaders = $otherHeaders.add($invalidHeaders);
            });

            $otherHeaders.addClass("noColumnPicker");
            $otherHeaders.attr("data-tipClasses", "invalidTypeTip");

            xcTooltip.add($otherHeaders, {
                title: ColTStr.NoOperateGeneral,
                container: "body",
                placement: "bottom"
            });
        }

        if (!columnPicker.noEvent) {
            var colSelector = ".xcTable .header, .xcTable td.clickable";
            $("#mainFrame").on("click.columnPicker", colSelector, function(event) {
                var callback = columnPicker.colCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                var $target = $(event.target);
                if ($target.closest('.dataCol').length ||
                    $target.closest('.jsonElement').length ||
                    $target.closest('.dropdownBox').length) {
                    return;
                }

                // check to see if cell has a valid type
                var $td = $target.closest('td');
                var $header;
                if ($td.length) {
                    var colNum = xcHelper.parseColNum($td);
                    $header = $td.closest('.xcTable').find('th.col' + colNum)
                                                     .find('.header');
                } else {
                    $header = $(this);
                }

                if ($header.hasClass('noColumnPicker')) {
                    if (!columnPicker.validTypeException ||
                        !columnPicker.validTypeException()) {
                        return;
                    }
                }

                callback($target, event);
            });

            var headSelector = ".xcTheadWrap";
            $("#mainFrame").on("click.columnPicker", headSelector, function(event) {
                var callback = columnPicker.headCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                var $eventTarget = $(event.target);
                if ($eventTarget.closest('.dropdownBox').length) {
                    return;
                }
                var $target = $eventTarget.closest('.xcTheadWrap');
                if ($target.length === 0) {
                    // error case
                    console.error("no header");
                    return;
                }
                callback($target);
            });

            $("#dagPanel").on("mousedown.columnPicker", ".dagTable", function() {
                var callback = columnPicker.dagCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                callback($(this));
            });
        }

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            $form.show();
            deferred.resolve();
        }

        if ($form.closest('#mainMenu').length) {
            MainMenu.setFormOpen();
        }

        return deferred.promise();
    },

    showView: function(formName) {
        this.isFormOpen = true;
        this.openTime = Date.now();
        this.mainMenuState = MainMenu.getState();
        $("#workspaceMenu").find(".menuSection").addClass("xc-hidden");
        this.$form.removeClass("xc-hidden");

        var wasMenuOpen = false;
        if (MainMenu.isMenuOpen("mainMenu")) {
            BottomMenu.close(true);
            wasMenuOpen = true;
        } else {
            MainMenu.open();
        }
        $("#container").addClass("formOpen");

        var name = formName || this.id;
        name = name.toLowerCase();
        var viewIndex = name.indexOf("view");
        if (viewIndex > -1) {
            name = name.slice(0, viewIndex);
        }
        name = $.trim(name);
        DagPanel.updateExitMenu(name);
        var tableMenuID = "#tableMenu";
        var colMenuID = "#colMenu";
        TblMenu.updateExitOptions(tableMenuID, name);
        TblMenu.updateExitOptions(colMenuID, name);
        return wasMenuOpen;
    },

    hideView: function() {
        this.isFormOpen = false;
        var ignoreClose = false;
        if (!this.$form.is(":visible")) {
            // do not close the left panel if we've navigated away
            ignoreClose = true;
        }

        this.$form.addClass('xc-hidden');
        $("#container").removeClass("formOpen");
        DagEdit.exitForm();
        DagPanel.updateExitMenu();
        var tableMenuID = "#tableMenu";
        var colMenuID = "#colMenu";
        TblMenu.updateExitOptions(tableMenuID);
        TblMenu.updateExitOptions(colMenuID);
        if (this.mainMenuState != null) {
            MainMenu.restoreState(this.mainMenuState, ignoreClose);
            if (!this.mainMenuState.isTopOpen) {
                BottomMenu.unsetMenuCache();
            }
            this.mainMenuState = null;
        }

        StatusBox.forceHide();
        xcTooltip.hideAll();
    },

    checkBtnFocus: function() {
        // check if any button is on focus
        return (this.$form.find(".btn:focus").length > 0);
    },

    // This function prevents the user from clicking the submit button multiple
    // times
    disableSubmit: function() {
        xcHelper.disableSubmit(this.$form.find(".confirm"));
    },

    // This function reenables the submit button after the checks are done
    enableSubmit: function() {
        xcHelper.enableSubmit(this.$form.find(".confirm"));
    },

    clear: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var self = this;
        var options = $.extend(self.options, extraOptions) || {};
        var $form = self.$form;

        $(document).off("keydown.xcForm");
        $(document).off("keydown.xcFormTabbing");
        $form.find(".focusable").off(".xcForm")
                                  .removeClass("focusable");
        $(".xcTableWrap").removeClass("columnPicker");

        DagEdit.exitForm();
        var $noColPickers = $(".xcTable").find('.noColumnPicker')
                                         .removeClass('noColumnPicker')
                                         .removeAttr("data-tipClasses");
        xcTooltip.remove($noColPickers);
        $("#mainFrame").off("click.columnPicker");
        $("#dagPanel").off("mousedown.columnPicker");
        $("#container").removeClass(self.state);
        self.state = null;
        self.enableSubmit();

        $("body").removeClass("no-selection");

        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            deferred.resolve();
        }

        if ($form.closest('#mainMenu').length) {
            MainMenu.setFormClose();
        }

        return deferred.promise();
    },

    addWaitingBG: function(options) {
        options = options || {};
        var heightAdjust = options.heightAdjust || 0;
        var transparent = options.transparent || false;
        var $form = this.$form;
        var waitingBg = '<div id="formWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>';
        $form.append(waitingBg);
        var $waitingBg =  $('#formWaitingBG');
        if (transparent) {
            $waitingBg.addClass('transparent');
        } else {
            $waitingBg.removeClass('transparent');
        }
        var modalHeaderHeight = $form.children('header').height() || 0;
        var modalHeight = $form.height();

        $waitingBg.height(modalHeight + heightAdjust - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        setTimeout(function() {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
    },

    removeWaitingBG: function() {
        if (gMinModeOn) {
            $('#formWaitingBG').remove();
        } else {
            $('#formWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    },

    refreshTabbing: function() {
        var $form = this.$form;

        $(document).off("keydown.xcFormTabbing");

        $form.find(".focusable").off(".xcForm")
                                 .removeClass("focusable");

        var eleLists = [
            $form.find("button.btn, input:visible")
        ];

        var $focusables = [];
        // make an array for all focusable element
        eleLists.forEach(function($eles) {
            $eles.each(function() {
                $focusables.push($(this));
            });
        });

        // check if element already has focus and set focusIndex;
        var focusIndex;
        if (eleLists[0].index($(':focus')) > -1) {
            focusIndex = eleLists[0].index($(':focus')) + 1;
        } else {
            focusIndex = 0;
        }

        for (var i = 0, len = $focusables.length; i < len; i++) {
            addFocusEvent($focusables[i], i);
        }

        // focus on the right most button
        if (this.options.focusOnOpen) {
            getEleToFocus();
        }

        $(document).on("keydown.xcFormTabbing", function(event) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();

                return false;
            }
        });

        function addFocusEvent($focusable, index) {
            $focusable.addClass("focusable").data("tabid", index);
            $focusable.on("focus.xcForm", function() {
                var $ele = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus() {
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
            // the current ele is not active, should no by focused
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
            } else {
                focusIndex = 0; // reset
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
                throw "undefined element!";
            }
            return ($ele.is(":visible") && !$ele.is("[disabled]") &&
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable") &&
                    !$ele.hasClass("btn-disabled") &&
                    $ele.css('visibility') !== "hidden" &&
                    window.getComputedStyle($ele[0])
                    .getPropertyValue("pointer-events") !== "none");
        }
    },

    listHighlight: function($input, event, isArgInput) {
        return xcHelper.listHighlight($input, event, isArgInput);
    },

    getOpenTime: function() {
        return this.openTime;
    },

    isOpen: function() {
        return this.isFormOpen;
    },

    focusOnColumn: function(tableId, colNum, noSelect) {
        if (tableId == null || colNum == null) {
            // error case
            return;
        }

        var ws = WSManager.getWSFromTable(tableId);
        if (ws !== WSManager.getActiveWS()) {
            WSManager.focusOnWorksheet(ws, true);
        }

        xcHelper.centerFocusedColumn(tableId, colNum, true, noSelect);

        var $th = $("#xcTable-" + tableId).find("th.col" + colNum);
        xcTooltip.transient($th, {
            "title": TooltipTStr.FocusColumn,
            "container": "#container",
        }, 1000);
    }
};
/* End of FormHelper */

function RangeSlider($rangeSliderWrap, prefName, options) {
    options = options || {};
    var self = this;
    this.minVal = options.minVal || 0;
    this.maxVal = options.maxVal || 0;
    this.halfSliderWidth = Math.round($rangeSliderWrap.find('.slider').width() / 2);
    this.minWidth = options.minWidth || this.halfSliderWidth;
    this.maxWidth = options.maxWidth || $rangeSliderWrap.find('.rangeSlider').width();
    this.valRange = this.maxVal - this.minVal;
    this.widthRange = this.maxWidth - this.minWidth;
    this.$rangeSliderWrap = $rangeSliderWrap;
    this.$rangeInput = $rangeSliderWrap.find('input');
    this.prefName = prefName;
    this.options = options;

    $rangeSliderWrap.find('.leftArea').resizable({
        "handles": "e",
        "minWidth": self.minWidth,
        "maxWidth": self.maxWidth,
        "stop": function(event, ui) {
            var val = self.updateInput(ui.size.width);
            UserSettings.setPref(prefName, val, true);
            if (options.onChangeEnd) {
                options.onChangeEnd(val);
            }
        },
        "resize": function(event, ui) {
            self.updateInput(ui.size.width);
        }
    });


    $rangeSliderWrap.find('.leftArea').on('mousedown', function(event) {
        if (!$(event.target).hasClass('leftArea')) {
            // we don't want to respond to slider button being clicked
            return;
        }
        self.handleClick(event);
    });

    $rangeSliderWrap.find('.rightArea').on('mousedown', function(event) {
        self.handleClick(event);
    });

    $rangeSliderWrap.find('input').on('input', function() {
        var val = $(this).val();
        val = Math.min(self.maxVal, Math.max(val, self.minVal));
        self.updateSlider(val);
    });

    $rangeSliderWrap.find('input').on('change', function() {
        var val = $(this).val();
        val = Math.min(self.maxVal, Math.max(val, self.minVal));
        $(this).val(val);
        UserSettings.setPref(self.prefName, val, true);
        if (options.onChangeEnd) {
            options.onChangeEnd(val);
        }
    });

    $rangeSliderWrap.find('input').on('keydown', function(event) {
        if (event.which === keyCode.Enter) {
            $(this).blur();
        }
    });
}

RangeSlider.prototype = {
    updateInput: function(uiWidth) {
        var width = uiWidth - this.minWidth;
        var val = (width / this.widthRange) * this.valRange + this.minVal;
        val = Math.round(val);
        this.$rangeInput.val(val);
        return val;
    },
    updateSlider: function(val) {
        var width = ((val - this.minVal) / this.valRange) * this.widthRange +
                    this.minWidth;

        width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
        this.$rangeSliderWrap.find('.leftArea').width(width);
    },
    handleClick: function(event) {
        if (event.which !== 1) {
            return;
        }
        var self = this;
        var $rangeSlider = $(event.target).closest('.rangeSlider');
        var mouseX = event.pageX - $rangeSlider.offset().left +
                     self.halfSliderWidth;
        mouseX = Math.min(self.maxWidth, Math.max(self.minWidth, mouseX));
        var val = self.updateInput(mouseX);
        self.updateSlider(val);
        UserSettings.setPref(self.prefName, val, true);
        if (self.options.onChangeEnd) {
            self.options.onChangeEnd(val);
        }
    },
    setSliderValue: function(val) {
        this.updateSlider(val);
        this.$rangeInput.val(val);
    }
};

/*
* options include:
    onlyClickIcon: if set true, only toggle dropdown menu when click
                     dropdown icon, otherwise, toggle also on click
                     input section
    onSelect: callback to trigger when select an item on list, $li will
              be passed into the callback
    onOpen: callback to trigger when list opens/shows
    beforeOpenAsync: async callback to trigger when list opens/shows
    container: will hide all other list in the container when focus on
               this one. Default is $dropDownList.parent()
    bounds: restrain the dropdown list size to this element
    bottomPadding: integer for number of pixels of spacing between
                   bottom of list and $bounds,
    exclude: selector for an element to exclude from default click
             behavior
 *
    $menu needs to have the following structure for scrolling:
        <div class="menu/list">
            <ul></ul>
            <div class="scrollArea top">
              <i class="arrow icon xi-arrow-up"></i>
            </div>
            <div class="scrollArea bottom">
              <i class="arrow icon xi-arrow-down"></i>
            </div>
        </div>
    where the outer div has the same height as the ul

*/
function MenuHelper($dropDownList, options) {
    options = options || {};
    this.options = options;

    this.$container = options.container ? $(options.container) :
                                          $dropDownList.parent();
    var $list;
    if ($dropDownList.is('.list,.menu')) {
        $list = $dropDownList;
    } else {
        $list = $dropDownList.find('.list, .menu');
    }

    this.$list = $list;
    this.$dropDownList = $dropDownList;
    this.$ul = $list.children('ul');
    this.$scrollAreas = $list.find('.scrollArea');
    this.numScrollAreas = this.$scrollAreas.length;
    this.$subList = options.$subList;
    this.$bounds = options.bounds ? $(options.bounds) : $(window);
    this.bottomPadding = options.bottomPadding || 0;
    this.exclude = options.exclude ? options.exclude : false;
    this.isMouseInScroller = false;
    this.id = MenuHelper.counter;

    this.timer = {
        "fadeIn": null,
        "fadeOut": null,
        "setMouseMoveFalse": null,
        "hovering": null,
        "scroll": null,
        "mouseScroll": null
    };

    this.setupListScroller();
    MenuHelper.counter++;

    return this;
}

MenuHelper.counter = 0; // used to give each menu a unique id

MenuHelper.prototype = {
    setupListeners: function() {
        var self = this;
        var options = self.options;
        var $dropDownList = self.$dropDownList;
        // toggle list section
        if (options.onlyClickIcon) {
            self.$iconWrapper = $dropDownList.find('.iconWrapper');
            $dropDownList.on("click", ".iconWrapper", function() {
                var $list = $(this).closest(".dropDownList");
                if (!$list.hasClass("open") && self.options.beforeOpenAsync) {
                    self.options.beforeOpenAsync()
                    .then(function() {
                        self.toggleList($list, $list.hasClass("openUpwards"));
                    });
                } else {
                    self.toggleList($list, $list.hasClass("openUpwards"));
                }
            });
        } else {
            $dropDownList.addClass('yesclickable');

            $dropDownList.on("click", function(event) {
                var $list = $(this);
                if ($(event.target).closest('.list').length) {
                    return;
                }
                if (self.exclude &&
                    $(event.target).closest(self.exclude).length) {
                    return;
                }
                if (!$list.hasClass("open") && self.options.beforeOpenAsync) {
                    self.options.beforeOpenAsync()
                    .then(function() {
                        self.toggleList($list, $list.hasClass("openUpwards"));
                    });
                } else {
                    self.toggleList($list, $list.hasClass("openUpwards"));
                }
            });
        }

        // XXX Need to find and document the use case of this otherwise remove
        // because hidedropdown seems to only be called on mouseup now
        // $dropDownList.on("mousedown", function(event) {
        //     if (event.which === 1) {
        //         // stop propagation of left mousedown
        //         // because hide dropdown is triggered by it
        //         // should invalid that when mousedown on dropDownList
        //         event.stopPropagation();
        //         var mousedownTarget;
        //         if ($(this).find('input').length === 1) {
        //             mousedownTarget = $(this).find('input');
        //         } else {
        //             mousedownTarget = $(this);
        //         }
        //         gMouseEvents.setMouseDownTarget(mousedownTarget);
        //     }
        // });

        // on click a list
        $dropDownList.on({
            "mouseup": function(event) {
                if (event.which !== 1) {
                    return;
                }
                var $li = $(this);

                // remove selected class from siblings and if able,
                // add selected class to current li
                var $lastSelected = $(this).siblings(".selected");
                if (!$li.hasClass("hint") && !$li.hasClass("unavailable") &&
                    !$li.hasClass("inUse")) {
                    $lastSelected.removeClass("selected");
                    $li.addClass("selected");
                }

                var keepOpen = false;
                if (options.onSelect) {    // trigger callback
                    // keepOpen be true, false or undefined
                    keepOpen = options.onSelect($li, $lastSelected, event);
                }
                // keep Open may return weird tings, so check for true boolean
                if (!keepOpen) {
                    self.hideDropdowns();
                }
            },
            "mouseenter": function() {
                $(this).addClass("hover");

            },
            "mouseleave": function() {
                $(this).removeClass("hover");
            }
        }, ".list li");

        return this;
    },
    hideDropdowns: function() {
        var self = this;
        var $sections = self.$container;
        var $dropdown = $sections.hasClass("dropDownList")
                        ? $sections
                        : $sections.find(".dropDownList");
        $dropdown.find(".list").hide().removeClass("openList");
        $dropdown.removeClass("open");

        $(document).off("mousedown.closeDropDown" + self.id);
        $(document).off("keydown.closeDropDown" + self.id);
    },
    openList: function() {
        var self = this;
        var $list = self.$list;
        $list.addClass("openList").show();
        $list.closest(".dropDownList").addClass("open");
        self.showOrHideScrollers();
    },
    toggleList: function($curlDropDownList, openUpwards) {
        var self = this;
        var $list = self.$list;
        if ($curlDropDownList.hasClass("open")) {    // close dropdown
            self.hideDropdowns();
        } else {
            // hide all other dropdowns that are open on the page
            var $currentList;
            if ($list.length === 1) {
                $currentList = $list;
            } else {
                // this is triggered when $list contains more that one .list
                // such as the xcHelper.dropdownlist in mulitiCastModal.js
                $currentList = $curlDropDownList.find(".list");
            }

            if (!$list.parents('.list, .menu').length) {
                $('.list, .menu').not($currentList)
                                .hide()
                                .removeClass('openList')
                                .parent('.dropDownList')
                                .removeClass('open');
            }

            // open dropdown
            var $lists = $curlDropDownList.find(".list");
            if ($lists.children().length === 0) {
                return;
            }
            $curlDropDownList.addClass("open");
            $lists.show().addClass("openList");

            if (openUpwards) {
                // Count number of children and shift up by num * 30
                var shift = $curlDropDownList.find("li").length * (-30);
                $curlDropDownList.find(".list").css("top", shift);
            }

            $(document).on('mousedown.closeDropDown' + self.id, function(event) {
                $target = $(event.target);
                if (self.options.onlyClickIcon) {
                    // do not trigger close if clicking on icon dropdown
                    if ($target.closest('.iconWrapper').is(self.$iconWrapper)) {
                        return;
                    }
                    // do close if not clicking on the list, such as the input
                    if (!$target.closest('.list').length) {
                        self.hideDropdowns();
                        return;
                    }
                }

                // close if not clicking anywhere on the dropdownlist
                if (!$target.closest('.dropDownList').is(self.$dropDownList)) {
                    self.hideDropdowns();
                }
            });

            $(document).on("keydown.closeDropDown" + self.id, function(event) {
                if (event.which === keyCode.Tab ||
                    event.which === keyCode.Escape) {
                    self.hideDropdowns();
                }
            });

            if (typeof self.options.onOpen === "function") {
                self.options.onOpen($curlDropDownList);
            }
            self.showOrHideScrollers();
            $('.selectedCell').removeClass('selectedCell');
            FnBar.clear();
        }
        xcTooltip.hideAll();
    },
    setupListScroller: function() {
        if (this.numScrollAreas === 0) {
            return;
        }
        var self = this;
        var $list = this.$list;
        var $ul = this.$ul;
        var $scrollAreas = this.$scrollAreas;
        var timer = this.timer;
        var isMouseMoving = false;
        var $subList = this.$subList;
        var outerHeight;
        var innerHeight;
        $list.mouseleave(function() {
            clearTimeout(timer.fadeIn);
            $scrollAreas.removeClass('active');
        });

        $list.mouseenter(function() {
            outerHeight = $list.height();
            innerHeight = $ul[0].scrollHeight;
            isMouseMoving = true;
            fadeIn();
        });

        $list.mousemove(function() {
            clearTimeout(timer.fadeOut);
            clearTimeout(timer.setMouseMoveFalse);
            isMouseMoving = true;

            timer.fadeIn = setTimeout(fadeIn, 200);

            timer.fadeOut = setTimeout(fadeOut, 800);

            timer.setMouseMoveFalse = setTimeout(setMouseMoveFalse, 100);
        });

        $scrollAreas.mouseenter(function() {
            self.isMouseInScroller = true;
            $(this).addClass('mouseover');

            if ($subList) {
                $subList.hide();
            }
            var scrollUp = $(this).hasClass('top');
            scrollList(scrollUp);
        });

        $scrollAreas.mouseleave(function() {
            self.isMouseInScroller = false;
            clearTimeout(timer.scroll);

            var scrollUp = $(this).hasClass('top');

            if (scrollUp) {
                $scrollAreas.eq(1).removeClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
            }

            timer.hovering = setTimeout(hovering, 200);
        });

        $ul.scroll(function() {
            clearTimeout(timer.mouseScroll);
            timer.mouseScroll = setTimeout(mouseScroll, 300);
        });

        function fadeIn() {
            if (isMouseMoving) {
                $scrollAreas.addClass('active');
            }
        }

        function fadeOut() {
            if (!isMouseMoving) {
                clearTimeout(timer.fadeIn);
                $scrollAreas.removeClass('active');
            }
        }

        function scrollList(scrollUp) {
            var top;
            var scrollTop = $ul.scrollTop();

            if (scrollUp) { // scroll upwards
                if (scrollTop === 0) {
                    $scrollAreas.eq(0).addClass('stopped');
                    return;
                }
                timer.scroll = setTimeout(function() {
                    top = scrollTop - 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            } else { // scroll downwards
                if (outerHeight + scrollTop >= innerHeight) {
                    $scrollAreas.eq(1).addClass('stopped');
                    return;
                }

                timer.scroll = setTimeout(function() {
                    top = scrollTop + 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            }
        }

        function mouseScroll() {
            var scrollTop = $ul.scrollTop();
            if (scrollTop === 0) {
                $scrollAreas.eq(0).addClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            } else if (outerHeight + scrollTop >= innerHeight) {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).addClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            }
        }

        function setMouseMoveFalse() {
            isMouseMoving = false;
        }

        function hovering() {
            if (!self.isMouseInScroller) {
                $scrollAreas.removeClass('mouseover');
            }
        }
    },
    showOrHideScrollers: function($newUl) {
        if (this.numScrollAreas === 0) {
            return;
        }
        var $list = this.$list;
        var $bounds = this.$bounds;
        var bottomPadding = this.bottomPadding;
        if ($newUl) {
            this.$ul = $newUl;
        }
        var $ul = this.$ul;

        var offset = $bounds.offset();
        var offsetTop;
        if (offset) {
            offsetTop = offset.top;
        } else {
            offsetTop = 0;
        }

        var listHeight = offsetTop + $bounds.outerHeight() - $list.offset().top -
                         bottomPadding;
        listHeight = Math.min($(window).height() - $list.offset().top,
                              listHeight);
        listHeight = Math.max(listHeight - 1, 40);
        $list.css('max-height', listHeight);
        $ul.css('max-height', listHeight).scrollTop(0);

        var ulHeight = $ul[0].scrollHeight - 1;

        if (ulHeight > $list.height()) {
            $ul.css('max-height', listHeight);
            $list.find('.scrollArea').show();
            $list.find('.scrollArea.bottom').addClass('active');
        } else {
            $ul.css('max-height', 'auto');
            $list.find('.scrollArea').hide();
        }
        // set scrollArea states
        $list.find('.scrollArea.top').addClass('stopped');
        $list.find('.scrollArea.bottom').removeClass('stopped');
    }
};

function InputSuggest(options) {
    options = options || {};
    this.$container = options.$container;
    this.onClick = options.onClick;
    this.__init();
    return this;
}

InputSuggest.prototype = {
    __init: function() {
        var self = this;
        var $container = self.$container;
        // when click the hint list
        $container.on("click", ".hint li", function() {
            if (typeof self.onClick === "function") {
                self.onClick($(this));
            }
        });
    },

    listHighlight: function(event) {
        var $input = $(event.currentTarget);
        var $list = $input.siblings('.openList');
        if ($list.length && (event.which === keyCode.Up ||
            event.which === keyCode.Down))
        {
            xcHelper.listHighlight($input, event, true);
        }
    }
};

// options:
// menuHelper: (required) instance of MenuHelper
// preventClearOnBlur: boolean, if true will not reset the input on blur
// reorder: boolean, if true will place "starts with" matches first
function InputDropdownHint($dropdown, options) {
    this.$dropdown = $dropdown;
    this.options = options || {};
    this.__init();
    return this;
}

InputDropdownHint.prototype = {
    __init: function() {
        var self = this;
        var $dropdown = self.$dropdown;
        var options = self.options;
        var menuHelper = options.menuHelper;

        menuHelper.setupListeners();

        var $input = $dropdown.find("> input");
        var $lists = $dropdown.find("> .list");
        // this is to prevent the trigger of blur on mosuedown of li
        $lists.on("mousedown", "li", function() {
            return false;
        });

        $dropdown.on("click", ".iconWrapper", function() {
            // when it's goint to open
            if (!$dropdown.hasClass("open")) {
                $input.focus();
            }
        });

        $input.on("input", function() {
            var text = $input.val().trim();
            self.__filterInput(text);
            if (!$dropdown.hasClass("open")) {
                // show the list
                menuHelper.toggleList($dropdown);
            }
        });

        $input.on("blur", function() {
            var text = $input.val().trim();
            var oldVal = $input.data("val");
            if (!options.preventClearOnBlur && oldVal !== text) {
                $input.val(oldVal);
            }
            // reset
            self.__filterInput();
            // when the dropdown is closed
            if ($dropdown.hasClass("open")) {
                // close it
                menuHelper.toggleList($dropdown);
            }
        });

        $input.on("keydown", function(event) {
            if (event.which === keyCode.Enter) {
                var val = $input.val().trim();
                if (typeof options.onEnter === "function") {
                    var stopEvent = options.onEnter(val, $input);
                    if (stopEvent) {
                        event.stopPropagation();
                    }
                }
                menuHelper.hideDropdowns();
            } else if (event.which === keyCode.Up ||
                       event.which === keyCode.Down) {
                $lists.find("li.hover").removeClass("hover");
                xcHelper.listHighlight($input, event, false);
            }
        });
    },

    __filterInput: function(searchKey) {
        var $dropdown = this.$dropdown;
        $dropdown.find(".noResultHint").remove();

        var $lis = $dropdown.find("li");
        var $list = $lis.parent();
        if (!searchKey) {
            $lis.removeClass("xc-hidden");
            $list.scrollTop(0);
            this.options.menuHelper.showOrHideScrollers();
            return;
        }

        searchKey = searchKey.toLowerCase();

        var count = 0;
        $lis.each(function() {
            var $li = $(this);
            if ($li.text().toLowerCase().includes(searchKey)) {
                $li.removeClass("xc-hidden");
                count++;
            } else {
                $li.addClass("xc-hidden");
            }
        });

        // put the li that starts with value at first,
        // in asec order
        if (this.options.order) {
            $lis = $lis.filter(function() {
                return !$(this).hasClass("xc-hidden");
            });
            for (var i = $lis.length - 1; i >= 0; i--) {
                var $li = $lis.eq(i);
                if ($li.text().toLowerCase().startsWith(searchKey)) {
                    $list.prepend($li);
                }
            }
        }

        if (count === 0) {
            var li = '<li class="hint noResultHint" ' +
                     'style="pointer-events:none">' +
                        CommonTxtTstr.NoResult +
                    '</li>';
            $dropdown.find("ul").append(li);
        }

        $list.scrollTop(0);
        this.options.menuHelper.showOrHideScrollers();
    },

    setInput: function(val) {
        var $input = this.$dropdown.find("> input");
        $input.val(val).data("val", val);
    },

    clearInput: function() {
        var $input = this.$dropdown.find("> input");
        $input.val("").removeData("val");
    }
};


/* Extension Panel */
function ExtItem(options) {
    options = options || {};
    this.appName = options.appName;
    this.version = options.version;
    this.description = options.description;
    this.author = options.author;
    this.image = options.image;
    this.main = options.main;
    this.website = options.website;
    // XXX quick hack, if we later want to have multiple category
    // then keep the structure, otherwise, can refactor to remove
    // category related code
    this.category = options.category || ExtTStr.XcCategory;
}

ExtItem.prototype = {
    getName: function() {
        return this.appName;
    },

    getMainName: function() {
        var name = this.getName();
        if (this.main) {
            return this.main + " (" + name + ")";
        } else {
            return name;
        }
    },

    getCategory: function() {
        return this.category;
    },

    getAuthor: function() {
        return this.author || "N/A";
    },

    getDescription: function() {
        return this.description || "";
    },

    getVersion: function() {
        return this.version || "N/A";
    },

    getImage: function() {
        if (this.image == null) {
            return "";
        }

        return this.image;
    },

    setImage: function(newImage) {
        this.image = newImage;
    },

    getWebsite: function() {
        return this.website;
    },

    isInstalled: function() {
        var $extLists = $("#extension-lists");
        if ($extLists.find(".error").length) {
            return this.__findInstallFindScript();
        } else {
            var name = this.getName();
            var $li = $extLists.find(".item").filter(function() {
                return $(this).find(".name").text() === name;
            });
            return ($li.length > 0);
        }
    },

    __findInstallFindScript: function() {
        var exist = false;
        var name = this.getName() + ".ext.js";

        $("#extension-ops-script script").each(function() {
            var src = $(this).attr("src");
            if (src && src.includes(name)) {
                exist = true;
                // end loop
                return false;
            }
        });
        return exist;
    }
};


function ExtCategory(categoryName) {
    this.name = categoryName;
    this.extensions = {};

    return this;
}

ExtCategory.prototype = {
    getName: function() {
        return this.name;
    },

    getExtension: function(extName) {
        return this.extensions[extName];
    },

    hasExtension: function(extName) {
        return this.extensions.hasOwnProperty(extName);
    },

    addExtension: function(extension) {
        var extName = extension.appName;
        if (extName == null || this.hasExtension(extName)) {
            console.error("Duplicated extension");
            return false;
        }

        this.extensions[extName] = new ExtItem(extension);
        return true;
    },

    getExtensionList: function(searchKey) {
        searchKey = searchKey || "";
        searchKey = xcHelper.escapeRegExp(searchKey);
        var extensions = this.extensions;
        var listToSort = [];
        var regExp = new RegExp(searchKey, "i");
        for (var extName in extensions) {
            if (!regExp.test(extName)) {
                continue;
            }
            listToSort.push([extensions[extName], extName]);
        }

        // sort by extension name
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        var resList = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    },

    getAvailableExtensionList: function() {
        var list = this.getExtensionList();
        var resList = [];
        for (var i = 0, len = list.length; i < len; i++) {
            var extension = list[i];
            if (extension.isInstalled()) {
                resList.push(extension);
            }
        }
        return resList;
    }
};
function ExtCategorySet() {
    this.set = {};
    return this;
}

ExtCategorySet.prototype = {
    get: function(categoryName) {
        categoryName = categoryName.toLowerCase();
        return this.set[categoryName];
    },

    has: function(categoryName) {
        categoryName = categoryName.toLowerCase();
        return this.set.hasOwnProperty(categoryName);
    },

    addExtension: function(extension) {
        var categoryName = extension.category || ExtTStr.XcCategory;
        categoryName = categoryName.toLowerCase();
        var extCategory;

        if (this.has(categoryName)) {
            extCategory = this.get(categoryName);
        } else {
            extCategory = new ExtCategory(categoryName);
            this.set[categoryName] = extCategory;
        }
        extCategory.addExtension(extension);
    },

    getExtension: function(categoryName, extensionName) {
        categoryName = categoryName.toLowerCase();
        if (!this.has(categoryName)) {
            return null;
        }

        var category = this.get(categoryName);
        return category.getExtension(extensionName);
    },

    getList: function() {
        var set = this.set;
        var listToSort = [];
        for (var categoryName in set) {
            listToSort.push([set[categoryName], categoryName]);
        }

        // sort by category
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        var resList = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    }
};
/* End of Extension Panel */

/* Storage */
// Here the use of factory is to hide the salt in the scope
// so outside can not see it
(function createXcStorage() {
    var salt = "All rights to use the secret key is reserved to Xcalar Inc";

    function XcStorage(storage) {
        this.storage = storage;
        return this;
    }

    XcStorage.prototype = {
        setItem: function(key, value) {
            try {
                var encodedVal = this._encode(value);
                this.storage.setItem(key, encodedVal);
            } catch (error) {
                console.error(error);
            }
        },

        getItem: function(key) {
            var encodedVal = this.storage.getItem(key);
            if (encodedVal == null) {
                return null;
            }
            return this._decode(encodedVal);
        },

        removeItem: function(key) {
            return this.storage.removeItem(key);
        },

        _encode: function(str) {
            // null will be "null", that's how local/session storage handle it
            str = String(str);
            return CryptoJS.AES.encrypt(str, salt).toString();
        },

        _decode: function(encodedStr) {
            var encode = CryptoJS.enc.Utf8;
            return CryptoJS.AES.decrypt(encodedStr, salt).toString(encode);
        }
    };

    window.xcLocalStorage = new XcStorage(localStorage);
    window.xcSessionStorage = new XcStorage(sessionStorage);
}());
/* End of Storage */


/* Datastore File Upload */
// handles the queue of XcalarDemoFileAppend calls
function DSFileUpload(name, size, fileObj, options) {
    this.name = name;
    this.chunks = [];
    this.totalSize = size;
    this.sizeCompleted = 0;
    this.status = "started";
    this.cancelStatus = null;
    this.isWorkerDone = false;
    this.onCompleteCallback = options.onComplete;
    this.onUpdateCallback = options.onUpdate;
    this.onErrorCallback = options.onError;
    this.times = [];
    this.fileObj = fileObj; // needs this reference of fileObj when
                            // refreshing files
    return this;
}

DSFileUpload.prototype = {
    add: function(content, chunkSize) {
        if (this.status === "canceled" || this.status === "errored") {
            return PromiseHelper.reject();
        }

        this.chunks.push({"content": content, "size": chunkSize});

        if (this.chunks.length === 1) {
            return this.__stream();
        }
        return PromiseHelper.reject();
    },
    getSizeCompleted: function() {
        return this.sizeCompleted;
    },
    getFileObj: function() {
        return this.fileObj;
    },
    getStatus: function() {
        return this.status;
    },
    complete: function() {
        this.status = "done";
    },
    cancel: function() {
        var self = this;
        if (self.status === "started") {
            // hasn't begun streaming yet, ok to delete
            XcalarDemoFileDelete(self.name);
        }
        self.status = "canceled";
        self.chunks = [];
        // cannot call delete during an append so _stream checks for
        // self.status === 'canceled' and stops streaming and deletes
    },
    errored: function() {
        this.status = "errored";
    },
    workerDone: function() {
        this.isWorkerDone = true;
    },
    errorAdding: function(err) {
        // occurs when worker fails
        this.errored();
        Alert.error(DSTStr.UploadFailed, err);
        this.onErrorCallback();
    },
    __stream: function() {
        var self = this;
        var deferred = jQuery.Deferred();

        self.status = "inProgress";
        XcalarDemoFileAppend(self.name, self.chunks[0].content)
        .then(function() {
            if (self.status === "canceled") {
                XcalarDemoFileDelete(self.name);
                deferred.reject();
                return;
            }

            self.sizeCompleted += self.chunks[0].size;
            self.onUpdateCallback(self.sizeCompleted);
            self.chunks.shift();
            if (self.status === "errored") {
                deferred.reject();
                return;
            }

            if (self.chunks.length) {
                self.__stream();
            } else if (self.isWorkerDone) {
                self.onCompleteCallback();
                self.complete();
                console.log("upload done");
            } else {
                // no chunks in the stream but worker is not done so .add
                // and .__stream will get called again eventually
            }
            deferred.resolve();
        })
        .fail(function(err) {
            // XXX need to handle fails and storing the progress so we can
            // try from where we left off
            self.errorAdding(err);
            deferred.reject(err);
        });

        return deferred.promise();
    }
};

/* END DSFileUploader */

/* sub query */
var XcSubQuery = (function() {
    /* Attr:
        name: (string) subQuery's name
        time: (date) craeted time
        query: (string) query
        dstTable: (string) dst table
        id: (integer) subQuery's id
        index: (integer) subQuery's index
        queryName: (string) query name
        state: (string) enums in QueryStateT
        exportFileName: (string, optional) export's file
        retName: (string, optional) retName
    */
    function XcSubQuery(options) {
        options = options || {};
        this.name = options.name;
        this.time = options.time;
        this.query = options.query;
        this.dstTable = options.dstTable;
        this.id = options.id;
        this.index = options.index;
        this.queryName = options.queryName;

        if (options.state == null) {
            this.state = QueryStateT.qrNotStarted;
        } else {
            this.state = options.state;
        }
        if (options.exportFileName) {
            this.exportFileName = options.exportFileName;
        }
        this.retName = options.retName || "";

        return this;
    }

    XcSubQuery.prototype = {
        getName: function() {
            return this.name;
        },

        getId: function() {
            return this.id;
        },

        getTime: function() {
            return this.time;
        },

        getQuery: function() {
            // XXX XcalarQueryState also return the query,
            // so maybe not store it into backend?
            return this.query;
        },

        getState: function() {
            return this.state;
        },

        setState: function(state) {
            this.state = state;
        },

        getStateString: function() {
            return QueryStateTStr[this.state];
        },

        getProgress: function() {
            var self = this;
            var deferred = jQuery.Deferred();
            if (!self.dstTable || self.name.indexOf("drop") === 0) {
                // XXX This happens if the call is a "drop"
                // Since we don't have a dstDag call, we will just return 50%
                deferred.resolve(50);
                xcAssert(self.name.indexOf("drop") === 0,
                         "Unexpected operation! " + self.name);
            } else {
                XcalarGetOpStats(self.dstTable)
                .then(function(ret) {
                    var stats = ret.opDetails;
                    var pct = stats.numWorkCompleted / stats.numWorkTotal;
                    if (isNaN(pct)) {
                        pct = 0;
                    } else {
                        pct = Math.max(0, pct);
                        pct = parseFloat((100 * pct).toFixed(2));
                    }
                    deferred.resolve(pct);
                })
                .fail(function(error) {
                    console.error(error, self.dstTable, self.name);
                    deferred.reject(error);
                });
            }

            return deferred.promise();
        }
    };

    return XcSubQuery;
}());
/* end of sub query */

/* ScollTableChecker */
var ScollTableChecker = (function() {
    /* Attr:
        startTime: (date) log the the current time
        scrollPos: (numbner) log the current mainFrame position
    */
    function ScollTableChecker() {
        this.startTime = (new Date()).getTime();
        this.scrollPos = $("#mainFrame").scrollLeft();
        return this;
    }

    ScollTableChecker.prototype = {
        checkScroll: function() {
            var self = this;
            var startTime = self.startTime;
            var startScrollPos = self.scrollPos;

            var timeAllowed = 1000;
            var endTime = (new Date()).getTime();
            var elapsedTime = endTime - startTime;
            var timeSinceLastClick = endTime -
                                    gMouseEvents.getLastMouseDownTime();
            // we'll focus on table if its been less than timeAllowed OR
            // if the user hasn't clicked or scrolled
            var samePos = ($("#mainFrame").scrollLeft() === startScrollPos);
            if (elapsedTime < timeAllowed ||
                (timeSinceLastClick >= elapsedTime && samePos)) {
                return true;
            } else {
                return false;
            }
        }
    };

    return ScollTableChecker;
}());
/* End of ScollTableChecker */

/* Progress circle for locked tables */
var ProgressCircle = function(txId, iconNum, hasText) {
    this.txId = txId;
    this.iconNum = iconNum;
    this.__reset();
    this.status = "inProgress";
    this.progress = 0;
    this.hasText = hasText;
};

ProgressCircle.prototype = {
    update: function(pct, duration) {
        if (this.status === "done") {
            return;
        }
        if (isNaN(pct)) {
            pct = 0;
        }
        pct = Math.max(Math.min(pct, 100), 0);
        var prevPct = this.prevPct;
        this.prevPct = pct;

        if (prevPct > pct) {
            this.__reset();
        } else if (prevPct === pct) {
            // let the animation continue/finish
            return;
        }

        var svg = this.svg;
        var pie = this.pie;
        var arc = this.arc;
        var paths = svg.selectAll("path").data(pie([pct, 100 - pct]));

        if (duration == null) {
            duration = 2000;
        }

        paths.transition()
            .ease("linear")
            .duration(duration)
            .attrTween("d", arcTween);

        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return (function(t) {
                return (arc(i(t)));
            });
        }

        if (!this.hasText) {
            return;
        }

        d3.select('.lockedTableIcon[data-txid="' + this.txId +
                   '"] .pctText .num')
        .transition()
        .duration(duration)
        .ease("linear")
        .tween("text", function() {
            var num = this.textContent || 0;
            var i = d3.interpolateNumber(num, pct);
            return (function(t) {
                this.textContent = Math.ceil(i(t));
            });
        });
    },
    __reset: function() {
        var radius = 32;
        var diam = radius * 2;
        var thick = 7;
        $('.lockedTableIcon[data-txid="' + this.txId + '"][data-iconnum="' +
            this.iconNum + '"] .progress').empty();
        var arc = d3.svg.arc()
                    .innerRadius(radius - thick)
                    .outerRadius(radius);
        var pie = d3.layout.pie().sort(null);
        var svg = d3.select('.lockedTableIcon[data-txid="' + this.txId +
                            '"][data-iconnum="' + this.iconNum + '"] .progress')
                    .append("svg")
                    .attr({"width": diam, "height": diam})
                    .append("g")
                    .attr("transform", "translate(" + radius + ", " +
                            radius + ")");
        svg.selectAll("path")
            .data(pie([0, 100]))
            .enter()
            .append("path")
            .attr("d", arc)
            .each(function(d) {
                this._current = d;
            });

        this.svg = svg;
        this.pie = pie;
        this.arc = arc;
        this.prevPct = 0;
    },
    done: function() {
        this.status = "completing";
        this.update(100, 500);
        this.status = "done";
    }
};

/*
 * options:
    id: id of the rect element
    $container: container
    onStart: trigger when start move
    onDraw: trigger when drawing
    onEnd: trigger when mouse up
 */
function RectSelction(x, y, options) {
    options = options || {};
    var self = this;
    // move it 1px so that the filterSelection
    // not stop the click event to toggle percertageLabel
    // to be trigger
    self.x = x + 1;
    self.y = y;
    self.id = options.id;
    self.$container = options.$container;
    self.bound = self.$container.get(0).getBoundingClientRect();
    self.onStart = options.onStart;
    self.onDraw = options.onDraw;
    self.onEnd = options.onEnd;

    self.__init();

    return self;
}

RectSelction.prototype = {
    __init: function() {
        var self = this;
        var bound = self.bound;
        var left = self.x - bound.left;
        var top = self.y - bound.top;

        var html = '<div id="' + self.id + '" class="rectSelection" style="' +
                    'pointer-events: none; left:' + left +
                    'px; top:' + top + 'px; width:0; height:0;"></div>';
        self.__getRect().remove();
        self.$container.append(html);
        self.__addSelectRectEvent();
    },

    __addSelectRectEvent: function() {
        var self = this;
        $(document).on("mousemove.checkMovement", function(event) {
            // check for mousemovement before actually calling draw
            self.checkMovement(event.pageX, event.pageY);
        });

        $(document).on("mouseup.selectRect", function() {
            self.end();
            $(document).off(".selectRect");
            $(document).off("mousemove.checkMovement");
            if (typeof self.onMouseup === "function") {
                self.onMouseup();
            }
        });
    },

    __getRect: function() {
        return $("#" + this.id);
    },

    checkMovement: function (x, y) {
        var self = this;
        if (Math.abs(x - self.x) > 0 || Math.abs(y - self.y) > 0) {
            if (typeof self.onStart === "function") {
                self.onStart();
            }

            $(document).off('mousemove.checkMovement');
            $(document).on("mousemove.selectRect", function(event) {
                self.draw(event.pageX, event.pageY);
            });
        }
    },

    draw: function(x, y) {
        var self = this;
        var bound = self.bound;
        // x should be within bound.left and bound.right
        x = Math.max(bound.left, Math.min(bound.right, x));
        // y should be within boud.top and bound.bottom
        y = Math.max(bound.top, Math.min(bound.bottom, y));

        // update rect's position
        var left;
        var top;
        var w = x - self.x;
        var h = y - self.y;
        var $rect = self.__getRect();

        if (w >= 0) {
            left = self.x - bound.left;
        } else {
            left = x - bound.left;
            w = -w;
        }

        if (h >= 0) {
            top = self.y - bound.top;
        } else {
            top = y - bound.top;
            h = -h;
        }

        var bottom = top + h;
        var right = left + w;
        // the $rect is absolute to the $container
        // so if $container has scrollTop, the top need to consider it
        $rect.css("left", left)
            .css("top", top + self.$container.scrollTop())
            .width(w)
            .height(h);

        if (typeof self.onDraw === "function") {
            self.onDraw(bound, top, right, bottom, left);
        }
    },

    end: function() {
        var self = this;
        self.__getRect().remove();
        if (typeof self.onEnd === "function") {
            self.onEnd();
        }
    }
};


function InfList($list, options) {
    options = options || {};
    var self = this;
    self.$list = $list;
    self.numToFetch = options.numToFetch || 20;
    self.numInitial = options.numInitial || 40;
    self.__init();

    return self;
}

InfList.prototype = {
    __init: function() {
        var self = this;
        var $list = self.$list;
        var isMousedown = false;
        var lastPosition = 0;

        $list.on("mousedown", function() {
            var $list = $(this);
            isMousedown = true;
            lastPosition = $list.scrollTop();
            $(document).on("mouseup.listScroll", function() {
                isMousedown = false;
                $(document).off("mouseup.listScroll");
                var curPosition = $list.scrollTop();
                var height = $list[0].scrollHeight;
                var curTopPct = curPosition / height;
                // scroll up if near top 2% of textarea
                if (curPosition === 0 ||
                    (curTopPct < 0.02 && curPosition < lastPosition)) {
                    scrollup($list);
                }
            });
        });

        $list.scroll(function() {
            if ($list.scrollTop() === 0) {
                if (isMousedown) {
                    return;
                }
                scrollup();
            }
        });

        function scrollup() {
            var $hidden = $list.find(".infListHidden");
            // var numHidden = $hidden.length;
            var prevHeight = $list[0].scrollHeight;
            $hidden.slice(-self.numToFetch).removeClass("infListHidden");
            var top = $list[0].scrollHeight - prevHeight;
            $list.scrollTop(top);
        }
    },

    restore: function(selector) {
        var $list = this.$list;
        var $items = $list.find(selector);
        var limit = $items.length - this.numInitial;
        if (limit > 0) {
            $items.filter(":lt(" + limit + ")").addClass("infListHidden");
        }
    }
};