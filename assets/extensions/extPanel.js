window.ExtensionPanel = (function(ExtensionPanel, $) {
    var $panel = $("#extensionInstallPanel");
    var $extLists = $("#extensionLists");

    ExtensionPanel.setup = function() {
        // XXX test use
        test();

        // default is gridView, later will add usersettings
        $panel.removeClass("listView").addClass("gridView");

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
    };

    function test() {
        // XXX test use
        var n = 30;
        var html = "";
        for (var i = 0; i < n; i++) {
            items = [];
            for (var j = 0; j < 5; j++) {
                items[j] =  "Extension Name";
            }
            html += getExtensionListHTML("Category" + (i + 1), items);
        }

        $extLists.html(html);

        n = 5;
        html = "";
        for (var i = 0; i < n; i ++) {
            var category = "Popular Extensions" + (i + 1);
            var items = [];
            for (var j = 0; j < 5; j++) {
                items[j] =  "Extension Name";
            }

            html += getExtensionCatrgoryHTML(category, items);
        }

        $panel.html(html);
    }

    function getExtensionListHTML(name, items) {
        var html = '<li class="clearfix extensionList">' +
                        '<div class="listBox">' +
                            '<div class="iconWrap">' +
                              '<span class="icon"></span>' +
                            '</div>' +
                            '<div class="name">' +
                              name +
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

    function getExtensionCatrgoryHTML(category, items) {
        var html = '<div class="category">' +
                    '<div class="title textOverflowOneLine">' +
                        category +
                    '</div>' +
                    '<div class="items">';

        for (var i = 0, len = items.length; i < len; i++) {
            var logoClass;
            if (i % 3 === 0) {
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