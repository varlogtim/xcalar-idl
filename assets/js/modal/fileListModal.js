window.FileListModal = (function(FileListModal, $) {
    var $modal;    // $("#fileListModal")
    var modalHelper;
    var nodesMap;
    var roots;
    var curResultSetId;
    var modalId;

    var TreeNode = function(value) {
        this.value = value;
        this.children = [];
    };

    FileListModal.setup = function() {
        $modal = $("#fileListModal");
        $textArea = $modal.find(".xc-textArea");

        modalHelper = new ModalHelper($modal, {
            noEnter: true,
            sizeToDefault: true,
            defaultWidth: 400,
            defaultHeight: 400
        });
        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".label.folder", function() {
            $(this).parent().toggleClass("collapsed");
        });

        setupSearch();
    };

    FileListModal.show = function(dsId, dsName, hasFileErrors) {
        if ($modal.is(":visible")) {
            return;
        }
        modalId = Date.now();
        var curModalId = modalId;
        dsName = dsName || "Dataset";
        modalHelper.setup();
        $modal.addClass("load");
        $modal.find(".loadingSection .text").text(StatusMessageTStr.Loading);

        getList(dsId, hasFileErrors)
        .then(function(list) {
            if (modalId !== curModalId) {
                return;
            }

            constructTree(list, dsName);
            drawAllTrees();
            resizeModal();
        })
        .fail(function(error) {
            if (modalId !== curModalId) {
                return;
            }
            $modal.addClass("hasError");
            var type = typeof error;
            var msg;
            var log = "";

            if (type === "object") {
                msg = error.error || AlertTStr.ErrorMsg;
                log = error.log;
            } else {
                msg = error;
            }

            $modal.find(".errorSection").text(msg + ". " + log);
        })
        .always(function() {
            if (modalId !== curModalId) {
                return;
            }
            $modal.removeClass("load");
        });
    };

    function constructTree(list, dsName) {
        nodesMap = {};
        roots = {};

        for (var i = 0; i < list.length; i++) {
            var heirarchy = list[i].split("/");
            // first el in heirarchy is "" because fullpath starts with /
            heirarchy[0] = dsName;
            var prevNode = null;
            for (var j = heirarchy.length - 1; j >= 0; j--) {
                var name = heirarchy[j];
                var fullPath = heirarchy.slice(0, j + 1).join("/");
                if (nodesMap.hasOwnProperty(fullPath)) {
                    // stop searching because we already stored this directory
                    // as well as it's parents directories
                    if (prevNode) {
                        nodesMap[fullPath].children.push(prevNode);
                    }
                    break;
                }

                var node = new TreeNode({
                    type: j === (heirarchy.length - 1) ? "file" : "folder",
                    name: name,
                    fullPath: fullPath,
                    isRoot: false
                });

                nodesMap[fullPath] = node;
                if (j === 0) {
                    node.value.isRoot = true;
                    roots[fullPath] = node;
                }
                if (prevNode) {
                    node.children.push(prevNode);
                }
                prevNode = node;
            }
        }
    }

    function drawAllTrees() {
        var html = '';
        for (var name in roots) {
            html += '<ul class="root">';
            html += drawTree(roots[name]);
            html += '</ul>';
        }
        $modal.find(".treeWrap").html(html);
    }

    function drawTree(node) {
        var collapsed = "";
        if (node.children.length > 100) {
            // collapse folder if it has too many files
            collapsed = "collapsed";
        }
        var icon = "";
        if (node.value.isRoot) {
            icon = '<i class="icon datasetIcon xi_data"></i>';
        } else if (node.value.type === "folder") {
            icon = '<i class="icon folderIcon xi-folder"></i>' +
                    '<i class="icon folderIcon xi-folder-opened"></i>';
        }
        var html = '<li class="' + collapsed + '">' +
                    '<div class="label ' + node.value.type + '">' +
                        icon +
                        '<div class="name">' + node.value.name + '</div>' +
                    '</div>';
        if (node.children.length) {
            html += '<ul>';
        }
        node.children.sort(function(a, b) {
            if (a.value.type !== b.value.type) {
                return a.value.type < b.value.type;
            } else {
                return a.value.name > b.value.name;
            }
        });

        for (var i = 0; i < node.children.length; i++) {
            html += drawTree(node.children[i], html);
        }
        if (node.children.length) {
            html += '</ul>';
        }
        html += '</li>';
        return html;
    }

    function resizeModal() {
        var $treeWrap = $modal.find(".treeWrap");
        var innerHeight = $treeWrap.outerHeight();
        var wrapHeight = $modal.find(".modalMain").height();
        var diff = innerHeight - wrapHeight;
        var winDiff;

        var change = false;
        if (diff > 0) {
            var modalHeight = $modal.height();
            var winHeight = $(window).height() - 10;
            winDiff = winHeight - modalHeight;
            if (winDiff > 0) {
                var heightToAdd = Math.min(winDiff, diff);
                $modal.height(modalHeight + heightToAdd);
                change = true;
            }
        }

        var innerWidth = $treeWrap.outerWidth();
        var wrapWidth = $modal.find(".modalMain").width();
        diff = innerWidth - wrapWidth;
        if (diff > 0) {
            var modalWidth = $modal.width();
            var winWidth = $(window).width() - 10;
            winDiff = winWidth - modalWidth;
            if (winDiff > 0) {
                var widthToAdd = Math.min(winDiff, diff);
                $modal.width(modalWidth + widthToAdd);
                change = true;
            }
        }

        if (change) {
            modalHelper.center();
        }
    }

    function closeModal() {
        $modal.find(".treeWrap").empty();
        modalHelper.clear();
        searchHelper.clearSearch();
        $modal.find(".searchbarArea").addClass("closed");
        nodesMap = null;
        roots = null;
        modalId = null;
        $modal.removeClass("hasError load");
        if (curResultSetId) {
            XcalarSetFree(curResultSetId);
        }
        curResultSetId = null;
    }

    function setupSearch() {
        var $searchArea = $modal.find(".searchbarArea");
        searchHelper = new SearchBar($searchArea, {
            "removeSelected": function() {
                $modal.find('.selected').removeClass('selected');
            },
            "highlightSelected": function($match) {
                $match.addClass("selected");
            },
            "scrollMatchIntoView": scrollMatchIntoView,
            "$list": $modal.find(".treeWrap"),
            "removeHighlight": true,
            "toggleSliderCallback": searchText,
            "onInput": function() {
                searchText();
            }
        });

        var $searchInput = $searchArea.find("input");
        $searchArea.find(".closeBox").click(function() {
            if ($searchInput.val() === "") {
                searchHelper.toggleSlider();
            } else {
                searchHelper.clearSearch(function() {
                    $searchInput.focus();
                });
            }
        });
    }

    function searchText() {
        var $content = $modal.find(".treeWrap");
        var $searchArea = $modal.find(".searchbarArea");
        var $searchInput = $searchArea.find("input");
        var text = $searchInput.val().toLowerCase();
        if (text === "") {
            searchHelper.clearSearch();
            return;
        }

        $content.find(".highlightedText").contents().unwrap();
        var $targets = $content.find('.name').filter(function() {
            return ($(this).text().toLowerCase().indexOf(text) !== -1);
        });

        text = xcHelper.escapeRegExp(text);
        var regex = new RegExp(text, "gi");

        $targets.each(function() {
            var foundText = $(this).text();
            foundText = foundText.replace(regex, function (match) {
                return ('<span class="highlightedText">' + match +
                        '</span>');
            });
            $(this).html(foundText);
        });
        searchHelper.updateResults($content.find('.highlightedText'));

        if (searchHelper.numMatches !== 0) {
            scrollMatchIntoView(searchHelper.$matches.eq(0));
        }
    }

    function scrollMatchIntoView($match) {
        $match.parents("li.collapsed").removeClass("collapsed");
        var $container = $modal.find(".modalMain");
        var containerHeight = $container.outerHeight();
        var scrollTop = $container.scrollTop();
        var containerTop = $container.offset().top;
        var matchOffset = $match.offset().top - containerTop;

        if (matchOffset > containerHeight - 15 || matchOffset < 0) {
            $container.scrollTop(scrollTop + matchOffset -
                                 (containerHeight / 2));
        }
    }


    function getList(dsName, hasFileErrors) {
        var deferred = PromiseHelper.deferred();

        XcalarMakeResultSetFromDataset(dsName, true)
        .then(function (result) {
            curResultSetId = result.resultSetId;
            var numEntries = result.numEntries;
            var maxPerCall = hasFileErrors ? 100 : 10;
            return XcalarFetchData(curResultSetId, 0, numEntries, numEntries,
                                    null, null, maxPerCall);
        })
        .then(function(results) {
            if ($.isEmptyObject(results)) {
                deferred.reject(AlertTStr.FilePathError);
                return deferred.promise();
            }

            var files = [];
            for (var i = 0; i < results.length; i++) {
                files.push(JSON.parse(results[i]).fullPath);
            }
            deferred.resolve(files);
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return deferred.promise();
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        FileListModal.__testOnly__ = {};
        FileListModal.__testOnly__.getList = getList;
        FileListModal.__testOnly__.constructTree = constructTree;
        FileListModal.__testOnly__.resizeModal = resizeModal;
        FileListModal.__testOnly__.getInfo = function() {
            return {
                nodesMap: nodesMap,
                roots: roots,
                curResultSetId: curResultSetId,
                modalId: modalId
            };
        };
    }
    /* End Of Unit Test Only */

    return FileListModal;
}({}, jQuery));


