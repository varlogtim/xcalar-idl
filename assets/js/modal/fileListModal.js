window.FileListModal = (function(FileListModal, $) {
    var $modal;    // $("#fileListModal")
    var modalHelper;
    var nodesMap;
    var roots;

    FileListModal.setup = function() {
        $modal = $("#fileListModal");
        $textArea = $modal.find(".xc-textArea");

        modalHelper = new ModalHelper($modal, {
            noEnter: true
        });
        $modal.on("click", ".close, .cancel", closeModal);

        $modal.on("click", ".label.folder", function() {
            $(this).parent().toggleClass("collapsed");
        });

        setupSearch();
    };

    FileListModal.show = function(info) {
        if ($modal.is(":visible")) {
            return;
        }

        modalHelper.setup();
        $modal.addClass("load");
        $modal.find(".loadingSection .text").text(StatusMessageTStr.Loading);

        getList()
        .then(function(list) {
            constructTree(list);
            drawAllTrees();
        })
        .always(function() {
            $modal.removeClass("load");
        });
    };

    function constructTree(list) {
        nodesMap = {};
        roots = {};
        for (var i = 0; i < list.length; i++) {
            var heirarchy = list[i].split("/");
            var prev = null;

            for (var j = heirarchy.length - 1; j >= 0; j--) {
                var name = heirarchy[j];
                var fullPath = heirarchy.slice(0, j + 1).join("/");
                if (nodesMap.hasOwnProperty(fullPath)) {
                    // stop searching because we already stored this directory
                    // as well as it's parents directories
                    if (prev) {
                        nodesMap[fullPath].children.push(prev);
                    }
                    break;
                }
                var type;
                if (j === heirarchy.length - 1) {
                    type = "file";
                } else {
                    type = "folder";
                }
                var node = {
                    type: type,
                    name: name,
                    fullPath: name,
                    children: []
                };
                nodesMap[fullPath] = node;
                if (j === 0) {
                    roots[fullPath] = node;
                }
                if (prev) {
                    node.children.push(prev);
                }
                prev = node;
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
        var icon = node.type === "folder" ? '<i class="icon folderIcon xi-folder"></i>' +
                                '<i class="icon folderIcon xi-folder-opened"></i>' : '';
        var html = '<li class="' + collapsed + '">' +
                    '<div class="label ' + node.type + '">' +
                        icon +
                        '<div class="name">' + node.name + '</div>' +
                    '</div>';
        if (node.children.length) {
            html += '<ul>';
        }
        node.children.sort(function(a, b) {
            if (a.type !== b.type) {
                return a.type < b.type;
            } else {
                return a.name > b.name;
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

    function closeModal() {
        $modal.find(".treeWrap").empty();
        modalHelper.clear();
        searchHelper.clearSearch();
        $modal.find(".searchbarArea").addClass("closed");
        nodesMap = null;
        roots = null;
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

    // XXX placeholder function
    function getList() {
        var deferred = jQuery.Deferred();
        var list = [
            "a/file1.txt",
            "a/b/c/h/blah.txt",
            "a/b/c/x.txt",
            "a/b/c/a.txt",
            "a/b/c/c.txt",
            "a/b/c/b.txt",
            "a/b/c/g/blah.txt",
            "a/b/d/file4.txt",
            "b/c/f.txt"
        ];

        deferred.resolve(list);

        return deferred.promise();
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        FileListModal.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return FileListModal;
}({}, jQuery));


