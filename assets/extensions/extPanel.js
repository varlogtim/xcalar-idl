window.ExtensionPanel = (function(ExtensionPanel, $) {
    var $extView = $("#extensionView");
    var $panel = $("#extensionInstallPanel");
    var $extLists = $("#extensionLists");
    var curXcExts = [];
    var allXcExts = [];
    var curCustomExts = [];
    var allCustomExts = [];

    ExtensionPanel.setup = function() {
        // XXX test use
        test();

        switchExtension(false);

        ExtensionModal.setup();
        // default is gridView, later will add usersettings
        $panel.removeClass("listView").addClass("gridView");

        $panel.on("click", ".item .more", function() {
            ExtensionModal.show();
        });

        var $btns = $("#extensionViewButtons").find(".btn");
        $btns.click(function() {
            var $btn = $(this);
            if ($btn.hasClass("active")) {
                return;
            }

            if ($btn.hasClass("listView")) {
                // go to list View
                $panel.removeClass("gridView").addClass("listView");
            } else {
                $panel.removeClass("listView").addClass("gridView");
            }

            $btns.removeClass("active");
            $btn.addClass("active");
        });

        $extLists.on("click", ".extensionList", function() {
            var $li = $(this);

            if ($li.hasClass("active")) {
                $li.removeClass("active")
                    .find(".itemList").slideUp(200);
            } else {
                $li.addClass("active")
                    .find(".itemList").slideDown(200);
            }
        });

        var $xcExtBtn = $("#xcExtensionButton");
        var $customExtBtn = $("#customeExtensionButton");

        $xcExtBtn.click(function() {
            var $btn = $(this);
            if ($btn.hasClass("active")) {
                return;
            }

            $customExtBtn.removeClass("active");
            $btn.addClass("active");
            switchExtension(false);
        });

        $customExtBtn.click(function() {
            var $btn = $(this);
            if ($btn.hasClass("active")) {
                return;
            }

            $xcExtBtn.removeClass("active");
            $btn.addClass("active");
            switchExtension(true);
        });
    };

    function test() {
        // XXX test use only
        var n1 = 30, n2 = 5;
        for (var i = 0; i < n1; i++) {
            var items = [];
            for (var j = 0; j < n2; j++) {
                items.push("Extension Name");
            }

            curXcExts.push( {
                "name" : "Category" + (i + 1),
                "items": items
            });

            allXcExts.push( {
                "name" : "Popular Extension " + (i + 1),
                "items": items
            });
        }

        n1 = 10;
        for (var i = 0; i < n1; i++) {
            var items = [];
            for (var j = 0; j < n2; j++) {
                items.push("Extension Name");
            }

            curCustomExts.push( {
                "name" : "Category" + (i + 1),
                "items": items
            });

            allCustomExts.push( {
                "name" : "Custom Extension" + (i + 1),
                "items": items
            });
        }
    }

    function switchExtension(toCustom) {
        if (toCustom) {
            $extView.addClass("custom");
            generateExtList(curCustomExts);
            generateExtView(allCustomExts);
        } else {
            $extView.removeClass("custom");
            generateExtList(curXcExts);
            generateExtView(allXcExts);
        }
    }

    function generateExtList(categories) {
        var html = "";
        for (var i = 0, len = categories.length; i < len; i++) {
            html += getExtListHTML(categories[i]);
        }

        $extLists.html(html);
    }

    function generateExtView(categories) {
        var html = "";
        for (var i = 0, len = categories.length; i < len; i++) {
            html += getExtViewHTML(categories[i]);
        }

        $panel.html(html);
    }

    function getExtListHTML(category) {
        var items = category.items;
        var html = '<li class="clearfix extensionList">' +
                        '<div class="listBox">' +
                            '<div class="iconWrap">' +
                              '<span class="icon"></span>' +
                            '</div>' +
                            '<div class="name">' +
                              category.name +
                            '</div>' +
                            '<div class="count">' +
                                '0' +
                            '</div>' +
                        '</div>' +
                        '<ul class="itemList">';

        for (var i = 0, len = items.length; i < len; i++) {
            var itemClass = (i === 0) ? "active" : "";
            var status = (i === 0) ? "enabled" : "disabled";

            html += '<li class="item ' + itemClass + '">' +
                        '<div class="info">' +
                            '<span class="name textOverflowOneLine">' +
                                'Extension ' + (i + 1) +
                            '</span>' +
                            '<span class="status">' +
                                status +
                            '</span>' +
                            '<span class="check"></span>' +
                        '</div>' +
                        '<div class="delete"></div>'
        }

        html += '</ul></li>';
        return html;
    }

    function getExtViewHTML(category) {
        var items = category.items;
        var html = '<div class="category">' +
                    '<div class="title textOverflowOneLine">' +
                        category.name +
                    '</div>' +
                    '<div class="items">';

        for (var i = 0, len = items.length; i < len; i++) {
            var logoClass;
            if ($extView.hasClass("custom")) {
                logoClass = "custom";
            } else if (i % 3 === 0) {
                logoClass = "default1";
            } else if (i % 3 === 1) {
                logoClass = "tableau";
            } else {
                logoClass = "default2"
            }

            html += '<div class="item">' +
                        '<div class="logoArea ' + logoClass + '"></div>' +
                        '<div class="instruction">' +
                            '<div class="extensionName textOverflowOneLine">' +
                                'Extension Name' +
                            '</div>' +
                            '<div class="author textOverflowOneLine">' +
                                'by <span class="text">Author</span>' +
                            '</div>' +
                            '<div class="detail textOverflow">' +
                                'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod' +
                                'tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,' +
                                'quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo' +
                                'consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse' +
                                'cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non' +
                                'proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' +
                            '</div>' +
                        '</div>' +
                        '<div class="buttonArea">' +
                            '<button class="btn btnMid install">' +
                                'INSTALL' +
                            '</button>' +
                            '<button class="btn btnMid btn-cancel more">' +
                                'VIEW MORE' +
                            '</button>' +
                        '</div>' +
                    '</div>';
        }

        html += '</div></div>';

        return html;
    }

    return (ExtensionPanel);
}({}, jQuery));

window.ExtensionModal = (function(ExtensionModal, $) {
    var $modalBg = $("#modalBackground");
    var $extModal = $("#extensionModal");

    var minHeight = 400;
    var minWidth = 700;
    var modalHelper = new xcHelper.Modal($extModal, {
        "minHeight": minHeight,
        "minWidth" : minWidth
    });

    ExtensionModal.setup = function() {
        $extModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": 'window'
        });

        $extModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $extModal.on("click", ".close, .cancel", function() {
            closeExtModal();
        });
    };

    ExtensionModal.show = function() {
        modalHelper.setup();

        if (gMinModeOn) {
            $modalBg.show();
            $extModal.show();
            Tips.refresh();
        } else {
            $modalBg.fadeIn(300, function() {
                $extModal.fadeIn(180);
                Tips.refresh();
            });
        }
    };

    function closeExtModal() {
        modalHelper.clear();

        var fadeOutTime = gMinModeOn ? 0 : 300;

        $extModal.hide();
        $modalBg.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });
    }

    return ExtensionModal;
}({}, jQuery));
