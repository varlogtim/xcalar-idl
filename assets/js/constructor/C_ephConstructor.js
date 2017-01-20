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

// dsForm.js and fileBrowser.js
function DSFormAdvanceOption($section, container) {
    this.$section = $section;

    // add event listener
    $section.on("click", ".listInfo .expand, .listInfo .text", function() {
        $section.toggleClass("active");
        $(container).toggleClass("has-expand-list");
    });

    var $limit = $section.find(".option.limit");
    new MenuHelper($limit.find(".dropDownList"), {
        "onSelect": function($li) {
            var $input = $li.closest(".dropDownList").find(".unit");
            $input.val($li.text());
        },
        "container": container,
        "bounds"   : container
    }).setupListeners();

    xcHelper.optionButtonEvent($limit, function(option) {
        var $ele = $limit.find(".inputWrap, .dropDownList");
        if (option === "default") {
            $ele.addClass("xc-disabled");
        } else {
            $ele.removeClass("xc-disabled");
        }
    });

    var $pattern = $section.find(".option.pattern");
    $pattern.on("click", ".checkboxSection", function() {
        $(this).find(".checkbox").toggleClass("checked");
    });

    this.reset();

    return this;
}

DSFormAdvanceOption.prototype = {
    setMode: function() {
        var $section = this.$section;
        this.isInteractiveMod = (XVM.getLicenseMode() === XcalarMode.Mod);
        if (this.isInteractiveMod) {
            $section.addClass(XcalarMode.Mod);
            $section.find(".limit li:contains(TB)").hide();
        }
    },

    reset: function() {
        var $section = this.$section;
        $section.find("input").val("")
                .end()
                .find(".checked").removeClass("checked");

        this.set();
    },

    set: function(options) {
        options = options || {};

        var $section = this.$section;
        var $pattern = $section.find(".option.pattern");
        var $limit = $section.find(".option.limit");
        var hasSet;

        if (options.pattern != null && options.pattern !== "") {
            hasSet = true;
            $pattern.find("input").val(options.pattern);
        }

        if (options.isRecur) {
            hasSet = true;
            $pattern.find(".recursive .checkbox").addClass("checked");
        }

        if (options.isRegex) {
            hasSet = true;
            $pattern.find(".regex .checkbox").addClass("checked");
        }

        var previewSize = options.previewSize;
        if (previewSize != null && previewSize > 0) {
            hasSet = true;
            $limit.find(".radioButton[data-option='custom']").click();
        } else if (this.isInteractiveMod) {
            $limit.find(".radioButton[data-option='custom']").click();
            previewSize = UserSettings.getPref('DsDefaultSampleSize');
        } else {
            $limit.find(".radioButton[data-option='default']").click();
            previewSize = UserSettings.getPref('DsDefaultSampleSize');
        }

        this._changePreivewSize(previewSize);

        if (hasSet) {
            this._expandSection();
        }
    },

    modify: function(options) {
        options = options || {};
        var previewSize = options.previewSize;

        if (previewSize !== null && previewSize > 0) {
            this._changePreivewSize(previewSize);
        }
    },

    _changePreivewSize: function(previewSize) {
        var $limit = this.$section.find(".option.limit");
        var sizeArr = xcHelper.sizeTranslator(previewSize, true);

        if (!sizeArr) {
            $limit.find(".unit").val("GB");
            $limit.find(".size").val(10);
        } else {
            $limit.find(".unit").val(sizeArr[1]);
            $limit.find(".size").val(sizeArr[0]);
        }
    },

    _expandSection: function() {
        var $section = this.$section;
        if (!$section.hasClass("active")) {
            $section.find(".listInfo .expand").click();
        }
    },

    getArgs: function() {
        var $section = this.$section;
        var $limit = $section.find(".option.limit");
        var $customBtn = $limit.find(".radioButton[data-option='custom']");
        var previewSize = 0; // default size
        var size = "";
        var unit = "";

        if ($customBtn.hasClass("active")) {
            size = $limit.find(".size").val();
            var $unit = $limit.find(".unit");
            unit = $unit.val();
            // validate preview size
            if (size !== "" && unit === "") {
                this._expandSection();
                StatusBox.show(ErrTStr.NoEmptyList, $unit, false);
                return null;
            }
            previewSize = xcHelper.getPreviewSize(size, unit);

            var error = DataStore.checkSampleSize(previewSize);
            if (error != null) {
                this._expandSection();
                StatusBox.show(error, $unit, false);
                return null;
            }
        }

        var $pattern = $section.find(".option.pattern");
        var pattern = $pattern.find(".input").val().trim();
        var isRecur = $pattern.find(".recursive .checkbox").hasClass("checked");
        var isRegex = $pattern.find(".regex .checkbox").hasClass("checked");
        if (pattern === "") {
            pattern = null;
        }

        return {
            "pattern"    : pattern,
            "isRecur"    : isRecur,
            "isRegex"    : isRegex,
            "previewSize": previewSize
        };
    }
};

// dsPreview.js
function DSFormController() {
    return this;
}

DSFormController.prototype = {
    set: function(options) {
        options = options || {};

        if (options.path != null) {
            this.path = options.path;
        }

        if (options.format != null) {
            this.format = options.format;
        }
    },

    reset: function() {
        this.fieldDelim = "";
        this.lineDelim = "\n";
        this.hasHeader = false;
        this.quote = "\"";

        delete this.path;
        delete this.format;
    },

    getPath: function() {
        return this.path;
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
    }
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
 * arrowsPreventDefault: boolean, if true, preventDefault & stopPropagation will
                         be applied to the search arrows
 * codeMirror: codeMirror object
 * $input: jquery input, will search for 'input' in $searchArea by default
 */

function SearchBar($searchArea, options) {
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

    return this;
}

SearchBar.prototype = {
    setup: function() {
        var searchBar = this;
        var options = searchBar.options || {};
        var $searchInput;
        if (options.codeMirror) {
            $searchInput = searchBar.codeMirror;
        } else {
            $searchInput = searchBar.$searchInput;
        }

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
        var listHeight = $list.height();
        var scrollTop = $list.scrollTop();
        var matchOffsetTop = $match.position().top;
        if (matchOffsetTop > (listHeight - 25)) {
            $list.scrollTop(matchOffsetTop + scrollTop - (listHeight / 2) + 30);
        } else if (matchOffsetTop < -5) {
            $list.scrollTop(scrollTop + matchOffsetTop - (listHeight / 2));
        }
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

        if (typeof callback === "function") {
            callback();
        }
    }
};
/* End of SearchBar */

/* Modal Helper */
// an object used for global Modal Actions
function ModalHelper($modal, options) {
    /* options include:
     * noResize: if set true, will not reszie the modal
     * noCenter: if set true, will not center the modal
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * noEnter: if set true, no event listener on key enter,
     * noBackground: if set true, no darkened modal background
     */
    this.$modal = $modal;
    this.options = options || {};
    this.id = $modal.attr("id");
    this.__init();
    return this;
}

ModalHelper.prototype = {
    __init: function() {
        var self = this;
        var $modal = self.$modal;
        var options = self.options;

        // full screen and exit full screen buttons
        var $fullScreenBtn = $modal.find('.fullScreen');
        var $exitFullScreenBtn = $modal.find('.exitFullScreen');
        if ($fullScreenBtn.length) {
            $fullScreenBtn.click(function() {
                var winWidth = $(window).width();
                var winHeight = $(window).height();
                $modal.width(winWidth - 14);
                $modal.height(winHeight - 9);
                $modal.css({
                    "top" : 0,
                    "left": Math.round((winWidth - $modal.width()) / 2)
                });
                if (options.resizeCallback) {
                    options.resizeCallback();
                }
            });

        }
        if ($exitFullScreenBtn.length) {
            // debugger;
            $exitFullScreenBtn.click(function() {
                // var winWidth = $(window).width();
                // var winHeight = $(window).height();
                var minWidth  = options.minWidth || 0;
                var minHeight = options.minHeight || 0;
                $modal.width(minWidth);
                $modal.height(minHeight);
                self.center();
                if (options.resizeCallback) {
                    options.resizeCallback();
                }
            });
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
        $(".tooltip").hide();

        if (!options.keepFnBar) {
            FnBar.clear();
            $(".selectedCell").removeClass("selectedCell");
        }

        if (!options.noResize) {
            // resize modal
            var winWidth  = $(window).width();
            var winHeight = $(window).height();
            var minWidth  = options.minWidth || 0;
            var minHeight = options.minHeight || 0;
            var width  = $modal.width();
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
                "minWidth" : minWidth
            });
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
                                        "type"      : "info",
                                        "highZindex": true,
                                        "offsetY"   : 12
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
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else if (!options.noBackground) {
            var $modalBg = $("#modalBackground");

            if (gMinModeOn) {
                $modalBg.show();
                $modal.show();
                Tips.refresh();
                deferred.resolve();
            } else {
                $modal.fadeIn(180);
                $modalBg.fadeIn(300, function() {
                    Tips.refresh();
                    deferred.resolve();
                    $modalBg.css('display', 'block'); // when alert modal opens
                    // and drop table modal is open
                });
            }
        } else {
            $modal.show();
            Tips.refresh();
            deferred.resolve();
        }

        return deferred.promise();
    },

    checkBtnFocus: function() {
        // check if any button is on focus
        return (this.$modal.find(".btn:focus").length > 0);
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
        var numModalsOpen = $('.modalContainer:visible:not(#aboutModal)').length;
        $(document).off("keydown.xcModal" + this.id);
        $(document).off("keydown.xcModalTabbing" + this.id);
        $modal.find(".focusable").off(".xcModal")
                                  .removeClass("focusable");
        this.enableSubmit();
        if (numModalsOpen) {
            $("body").removeClass("no-selection");
        }
        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else {
            var $modalBg = $("#modalBackground");
            var fadeOutTime = gMinModeOn ? 0 : 300;
            $modal.hide();
            if (options.noBackground) {
                Tips.refresh();
                deferred.resolve();
            } else {
                if (numModalsOpen < 2) {
                    $modalBg.fadeOut(fadeOutTime, function() {
                        Tips.refresh();
                        deferred.resolve();
                    });
                } else {
                    Tips.refresh();
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
            "top" : top
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
            $modalBg.fadeOut(fadeOutTime, function() {
                $modalBg.removeClass('light');
                $mainFrame.removeClass('modalOpen');
            });

            if (tableId) {
                $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                          .removeClass('tableDarkened tableOpSectionDarkened');
                $tableWrap.removeClass('modalOpen');
            }
        } else {
            // when open the modal
            if (tableId) {
                $tableWrap.addClass('modalOpen');
            }

            $mainFrame.addClass('modalOpen');
            var fadeInTime;
            if (options.time == null) {
                fadeInTime = 150;
            } else {
                fadeInTime = options.time;
            }
            $modalBg.addClass('light').fadeIn(fadeInTime);
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
        setTimeout(function() {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
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
            var colName = progCol.getFrontColName(true);
            var colNum = (index + 1);
            html +=
                '<li class="checked" data-colnum="' + colNum + '">' +
                    '<span class="text tooltipOverflow" ' +
                    'data-original-title="' + colName + '" ' +
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
        var $renameSection = self.$view.find(".renameSection");
        $renameSection.on("click", ".renameIcon", function() {
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

    clearRename: function() {
        this.$view.find(".renameSection").addClass("xc-hidden")
                    .find(".renamePart").empty();
    },

    getExportColumns: function() {
        var self = this;
        var colsToExport = [];
        var $colsToExport = self.$view.find('.columnsToExport');

        $colsToExport.find('.cols li.checked').each(function() {
            colsToExport.push($(this).text().trim());
        });

        return colsToExport;
    },

    checkColumnNames: function(columnNames) {
        if (columnNames == null) {
            return null;
        }

        var self = this;
        if (self.$view.find(".renameSection").hasClass("xc-hidden")) {
            // when need check name conflict
            return self._checkNameConflict(columnNames);
        } else {
            // when in rename step
            return self._checkRename(columnNames);
        }
    },

    _checkNameConflict: function(columnNames) {
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
            self._addRenameRows(invalidNames);
            return null;
        } else {
            return colNamesAfterCheck;
        }
    },

    _checkRename: function(columnNames) {
        var self = this;
        var takenName = {};
        var renameMap = {};
        var invalid = false;

        // put all names first
        columnNames.forEach(function(colName) {
            takenName[colName] = true;
        });

        var $renameSection = self.$view.find(".renameSection");
        $renameSection.find(".rename").each(function() {
            var $row = $(this);
            var newName = $row.find(".newName").val();
            if (!newName) {
                StatusBox.show(ErrTStr.NoEmpty, $row);
                invalid = true;
                return false;
            }

            if (takenName.hasOwnProperty(newName)) {
                StatusBox.show(ErrTStr.NameInUse, $row);
                invalid = true;
                return false;
            }

            var origName = $row.find(".origName").val();
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

    _addRenameRows: function(columnsToRename) {
        var $renameSection = this.$view.find(".renameSection");
        var $renamePart = $renameSection.find(".renamePart");

        $renamePart.empty();

        for (var i = 0, len = columnsToRename.length; i < len; i++) {
            var $row = $(FormHelper.Template.rename);
            $row.find(".origName").val(columnsToRename[i]);
            $renamePart.append($row);
        }

        $renameSection.removeClass("xc-hidden");
    },

    _smartRename: function($colToRename) {
        var self = this;
        var origName = $colToRename.find(".origName").val();
        var currentColumNames = self.getExportColumns();
        var nameMap = {};

        // collect all existing names
        currentColumNames.forEach(function(columnName) {
            nameMap[columnName] = true;
        });

        $colToRename.siblings(".rename").each(function() {
            var columnName = $(this).find(".newName").val();
            if (columnName) {
                nameMap[columnName] = true;
            }
        });

        var parsedResult = xcHelper.parsePrefixColName(origName);
        var newName = parsedResult.prefix + "-" + parsedResult.name;
        var validName = newName;
        var tryCnt = 0;
        var maxTry = 20;

        while (nameMap.hasOwnProperty(validName) && tryCnt <= maxTry) {
            tryCnt++;
            validName = newName + tryCnt;
        }

        if (tryCnt > maxTry) {
            validName = xcHelper.randName(newName);
        }

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
     *      validColTypes: (optional) array of valid column types
     */
    this.$form = $form;
    this.options = options || {};
    this.id = $form.attr("id");
    this.state = null;
    this.mainMenuState = null;

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
        $(".tooltip").hide();
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
        var $headers = $(".xcTable").find(".header");
        var $arrayHeaders = $headers.filter(function() {
            return $(this).hasClass("type-array");
        }).addClass("noColumnPicker");
        var $objHeaders = $headers.filter(function() {
            return $(this).hasClass("type-object");
        }).addClass("noColumnPicker");

        xcTooltip.add($arrayHeaders, {
            title    : ColTStr.NoOperateArray,
            container: "body",
            placement: "bottom"
        });

        xcTooltip.add($objHeaders, {
            title    : ColTStr.NoOperateObject,
            container: "body",
            placement: "bottom"
        });

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

            xcTooltip.add($otherHeaders, {
                title    : ColTStr.NoOperateGeneral,
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
                    return;
                }
 
                callback($target);
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
        }

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else {
            $form.show();
            Tips.refresh();
            deferred.resolve();
        }

        if ($form.closest('#mainMenu').length) {
            MainMenu.setFormOpen();
        }

        return deferred.promise();
    },

    showView: function() {
        this.mainMenuState = MainMenu.getState();
        $("#workspaceMenu").find(".menuSection").addClass("xc-hidden");
        this.$form.removeClass("xc-hidden");

        var wasMenuOpen = false;
        if (MainMenu.isMenuOpen("mainMenu")) {
            BottomMenu.close(true);
            wasMenuOpen = true;
        } else {
            MainMenu.open();
            // due to lag if many columns are present, do another table
            // alignment 600 ms after menu opens
            setTimeout(function() {
                if (MainMenu.isMenuOpen("mainMenu")) {
                    TblManager.alignTableEls();
                }
            }, 600);
        }

        return wasMenuOpen;
    },

    hideView: function() {
        this.$form.addClass('xc-hidden');
        if (this.mainMenuState != null) {
            MainMenu.restoreState(this.mainMenuState);
            this.mainMenuState = null;
        }
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
        var $noColPickers = $(".xcTable").find('.noColumnPicker')
                                         .removeClass('noColumnPicker');
        xcTooltip.remove($noColPickers);
        $("#mainFrame").off("click.columnPicker");
        $("#container").removeClass(self.state);
        self.state = null;
        self.enableSubmit();

        $("body").removeClass("no-selection");

        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else {
            Tips.refresh();
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
                    $ele.css('visibility') !== "hidden");
        }
    }
};
/* End of ModalHelper */

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
        "handles" : "e",
        "minWidth": self.minWidth,
        "maxWidth": self.maxWidth,
        "stop"    : function(event, ui) {
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
            <div class="scrollArea top"></div>
            <div class="scrollArea bottom"></div>
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
        "fadeIn"           : null,
        "fadeOut"          : null,
        "setMouseMoveFalse": null,
        "hovering"         : null,
        "scroll"           : null,
        "mouseScroll"      : null
    };

    this.setupListScroller();
    MenuHelper.counter++;
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
                self.toggleList($(this).closest(".dropDownList"),
                                $(this).closest(".dropDownList").hasClass("openUpwards"));
            });
        } else {
            $dropDownList.addClass('yesclickable');

            $dropDownList.on("click", function(event) {
                if ($(event.target).closest('.list').length) {
                    return;
                }
                if (self.exclude &&
                    $(event.target).closest(self.exclude).length) {
                    return;
                }
                self.toggleList($(this), $(this).hasClass("openUpwards"));
            });
        }

        // XX Need to find and document the use case of this otherwise remove
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
                var keepOpen = false;
                if (options.onSelect) {    // trigger callback
                    // keepOpen be true, false or undefined
                    keepOpen = options.onSelect($(this));
                }
                // keep Open may return weird tings, so check for true boolean
                if (keepOpen === true) {
                    return;
                }
                self.hideDropdowns();
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
        var $sections = self.$container.find(".dropDownList");
        $sections.find(".list").hide().removeClass("openList");
        $sections.removeClass("open");
        $(document).off('mousedown.closeDropDown' + self.id);
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


            if (typeof self.options.onOpen === "function") {
                self.options.onOpen($curlDropDownList);
            }
            self.showOrHideScrollers();
            $('.selectedCell').removeClass('selectedCell');
            FnBar.clear();
        }
        $('.tooltip').hide();
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

        var ulHeight = $ul[0].scrollHeight;

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

/* Extension Panel */
function ExtItem(options) {
    options = options || {};
    this.name = options.name;
    this.version = options.version;
    this.description = options.description;
    this.main = options.main;
    this.repository = options.repository;
    this.author = options.author;
    this.devDependencies = options.devDependencies;
    this.category = options.category;
    this.imageUrl = options.imageUrl;
    this.website = options.website;
    this.installed = options.installed || false;
}

ExtItem.prototype = {
    getName: function() {
        return this.name;
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

    getWebsite: function() {
        return this.website;
    },

    getImage: function() {
        if (this.imageUrl == null) {
            return "";
        }

        return this.imageUrl;
    },

    getUrl: function() {
        if (this.repository != null) {
            return this.repository.url;
        }

        return null;
    },

    setImage: function(newImage) {
        this.imageUrl = newImage;
    },

    isInstalled: function() {
        return this.installed;
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
        var extName = extension.name;
        if (extName == null || this.hasExtension(extName)) {
            console.error("Duplicated extension");
            return false;
        }

        this.extensions[extName] = new ExtItem(extension);
        return true;
    },

    getExtensionList: function(searchKey) {
        searchKey = searchKey || "";
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

    getInstalledExtensionList: function() {
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
        return this.set[categoryName];
    },

    has: function(categoryName) {
        return this.set.hasOwnProperty(categoryName);
    },

    addExtension: function(extension) {
        var categoryName = extension.category;
        // var isCustom = true;
        // if (extension.repository && extension.repository.type === "market") {
        //     isCustom = false;
        // }

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
            var encodedVal = this._encode(value);
            this.storage.setItem(key, encodedVal);
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
function DSFileUpload(name, size, onCompleteCallback) {
    this.name = name;
    this.chunks = [];
    this.totalSize = size;
    this.sizeCompleted = 0;
    this.status = 'started';
    this.isWorkerDone = false;
    this.onCompleteCallback = onCompleteCallback;
    this.__init();

    return this;
}

DSFileUpload.prototype = {
    __init: function() {
        // nothing to init yet
    },
    add: function(content, chunkSize) {
        this.chunks.push({content: content, size: chunkSize});
        
        if (this.chunks.length === 1) {
            this.__stream();
        }
    },
    getSizeCompleted: function() {
        return this.sizeCompleted;
    },
    complete: function(callback) {
        this.status = 'done';
    },
    workerDone: function() {
        this.isWorkerDone = true;
    },
    errored: function() {
        this.status = 'errored';
    },
    getStatus: function() {
        return this.status;
    },

    __stream: function() {
        var self = this;
        self.status = 'inProgress';
        XcalarDemoFileAppend(self.name, self.chunks[0].content)
        .then(function() {
            self.sizeCompleted += self.chunks[0].size;
            console.log(self.sizeCompleted + ' out of ' + self.totalSize);
            self.chunks.shift();
            if (self.chunks.length) {
                self.__stream();
            } else if (self.isWorkerDone) {
                self.onCompleteCallback();
                self.complete();
                console.log('upload done');
            }
        })
        .fail(function() {
            // xx need to handle fails
        });

        //xx temporary
        function XcalarDemoFileAppend(fileName, fileContents) {
            var deferred = jQuery.Deferred();

            setTimeout(function() {
                deferred.resolve();
            }, 500);

            return deferred.promise();
        }
    }
};

/* END DSFileUploader */