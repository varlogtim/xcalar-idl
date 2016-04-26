window.ExtensionPanel = (function(ExtensionPanel, $) {
    var $extView;  // $("#extensionView");
    var $panel;    // $("#extensionInstallPanel");
    var $extLists; // $("#extension-installedLists");
    var extSet;
    var isFirstTouch = true;

    ExtensionPanel.setup = function() {
        $extView = $("#extensionView");
        $panel = $("#extensionInstallPanel");
        $extLists = $("#extension-installedLists");

        // default is gridView, later will add usersettings
        $panel.removeClass("listView").addClass("gridView");

        $panel.on("click", ".item .more", function() {
            var ext = getExtensionFromEle($(this).closest(".item"));
            viewExtensionDetail(ext);
        });

        $panel.on("click", ".item .install", function() {
            var ext = getExtensionFromEle($(this).closest(".item"));
            installExtension(ext);
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

        $extLists.on("click", ".extensionList .listBox", function() {
            var $li = $(this).closest(".extensionList");

            if ($li.hasClass("active")) {
                $li.removeClass("active")
                    .find(".itemList").slideUp(200);
            } else {
                $li.addClass("active")
                    .find(".itemList").slideDown(200);
            }
        });

        var $xcExtBtn = $("#xcExtensionButton");
        var $customExtBtn = $("#customExtensionButton");

        $xcExtBtn.click(function() {
            var $btn = $(this);
            if ($btn.hasClass("active")) {
                return;
            }

            $extView.removeClass("custom");
            $customExtBtn.removeClass("active");
            $btn.addClass("active");
            refreshExtension();
        });

        $customExtBtn.click(function() {
            var $btn = $(this);
            if ($btn.hasClass("active")) {
                return;
            }

            $extView.addClass("custom");
            $xcExtBtn.removeClass("active");
            $btn.addClass("active");
            refreshExtension();
        });

        $("#extension-search").on("input", "input", function() {
            var searchKey = $(this).val().trim();
            refreshExtension(searchKey);
        });
    };

    ExtensionPanel.active = function() {
        if (isFirstTouch) {
            isFirstTouch = false;
            fetchData();
        }
    };

    ExtensionPanel.install = function(ext) {
        if (ext == null || !(ext instanceof ExtItem)) {
            return;
        }

        installExtension(ext);
    };

    ExtensionPanel.imageError = function(ele) {
        var imgSrc = $extView.hasClass("custom") ? paths.CustomExt : paths.XCExt;
        ele.src = imgSrc;
        var ext = getExtensionFromEle($(ele).closest(".item"));
        ext.setImage(imgSrc);
    };

    function fetchData() {
        // hide all div first
        $panel.find("> div").hide();
        var timer = setTimeout(function() {
            $panel.find(".wait-hidden").hide()
                .end()
                .find(".waitSection").fadeIn(100);
        }, 500);

        $.ajax({
            "type"       : "POST",
            "data"       : JSON.stringify({"api": "listPackages"}),
            "contentType": "application/json",
            "url"        : "http://104.197.165.32:12123",
            "success"    : function(data) {
                clearTimeout(timer);
                try {
                    var d = JSON.parse(data);
                    initializeExtCategory(d);
                } catch(error) {
                    handleError(error);
                }
            },
            "error": function(error) {
                clearTimeout(timer);
                handleError(error);
            }
        });
    }

    function handleError(error) {
        console.error("get extension error", error);
        $panel.find(".error-hidden").hide()
            .end()
            .find(".errorSection").fadeIn(100).html(error);
    }

    // function test() {
    //     // XXX will removed it after no need to test
    //     var sample =  {
    //         "name"       : "Halting Problem Solution",
    //         "version"    : "1.0.1",
    //         "description": "This package contains the solution to the halting problem. It will let you know whether or not your program will terminate on any arbitrary input.",
    //         "main"       : "halting.ext.js",
    //         "repository" : {
    //             "type": "market",
    //             "url" : "www.xcalar.com/marketplace/halting.tar.gz"
    //         },
    //         "author"         : "Smart Person",
    //         "devDependencies": {
    //             "aaa": "^0.1.0"
    //         },
    //         "category": "Utilities",
    //         "imageUrl": "wetwet.jpg",
    //         "website" : "www.wetwet.com"
    //     };

    //     var list = [];
    //     var n1 = 30, n2 = 5;
    //     for (var i = 0; i < n1; i++) {
    //         for (var j = 0; j < n2; j++) {
    //             var ext = xcHelper.deepCopy(sample);
    //             if (i > 0) {
    //                 ext.category = "ZZ Test Extension" + "_" + i;
    //             }

    //             if (j > 0) {
    //                 ext.name = "ZZ Test Category" + "_" + j;
    //             }

    //             if (j % 5 === 0) {
    //                 ext.installed = true;
    //             }

    //             list.push(ext);
    //         }
    //     }

    //     n1 = 10;
    //     for (var i = 0; i < n1; i++) {
    //         for (var j = 0; j < n2; j++) {
    //             var ext = xcHelper.deepCopy(sample);
    //             ext.repository.type = "custom";
    //             if (i > 0) {
    //                 ext.category = "ZZ Custom Extension" + "_" + i;
    //             }

    //             if (j > 0) {
    //                 ext.name = "ZZ Custom Category" + "_" + j;
    //             }

    //             if (j % 5 === 0) {
    //                 ext.installed = true;
    //             }

    //             list.push(ext);
    //         }
    //     }

    //     initializeExtCategory(list);
    // }

    function initializeExtCategory(extensions) {
        extSet = new ExtCategorySet();

        extensions = extensions || [];
        for (var i = 0, len = extensions.length; i < len; i++) {
            // XXX TEMP!!
            extensions[i].installed = true;
            extSet.addExtension(extensions[i]);
        }

        refreshExtension();
    }

    function refreshExtension(searchKey) {
        var isCustom = $extView.hasClass("custom");
        var categoryList = extSet.getList(isCustom);
        generateInstalledExtList(categoryList);
        generateExtView(categoryList, searchKey);
    }

    function installExtension(ext) {
        // XXX placeholder
        console.log("install", ext.getName(), ext.getUrl());
    }

    function viewExtensionDetail(ext) {
        if (ext == null) {
            // error case, should never go here
            Alert.error(AlertTStr.Error, AlertTStr.NoExt);
            console.error("Error Case");
        } else {
            ExtensionModal.show(ext);
        }
    }

    function getExtensionFromEle($ext) {
        var extName = $ext.find(".extensionName").text();
        var category = $ext.closest(".category").find("> .title").text();
        var isCustom = $extView.hasClass("custom");
        var ext = extSet.getExtension(category, extName, isCustom);
        return ext;
    }

    function generateInstalledExtList(categoryList) {
        var html = "";

        for (var i = 0, len = categoryList.length; i < len; i++) {
            html += getInstalledExtListHTML(categoryList[i]);
        }

        $extLists.html(html);
        var num = $extLists.find(".extensionList").length;
        $extView.find(".leftContent .headingArea .num").text(num);
    }

    function generateExtView(categoryList, searchKey) {
        var html = "";

        for (var i = 0, len = categoryList.length; i < len; i++) {
            html += getExtViewHTML(categoryList[i], searchKey);
        }

        if (html === "") {
            $panel.find(".hintSection").show()
                .siblings().hide();
        } else {
            $panel.find(".default-hidden").hide()
                .end()
                .find(".categorySection").html(html).fadeIn(100);
        }
    }

    function getInstalledExtListHTML(category) {
        var extensions = category.getInstalledExtensionList();
        var extLen = extensions.length;
        if (extLen === 0) {
            return "";
        }

        var html = '<li class="clearfix extensionList">' +
                        '<div class="listBox">' +
                            '<div class="iconWrap">' +
                              '<span class="icon"></span>' +
                            '</div>' +
                            '<div class="name">' +
                              category.getName() +
                            '</div>' +
                            '<div class="count">' +
                                extLen +
                            '</div>' +
                        '</div>' +
                        '<ul class="itemList">';

        for (var i = 0, len = extLen; i < len; i++) {
            var extClass = (i === 0) ? "active" : "";
            var status = (i === 0) ? "enabled" : "disabled";

            html += '<li class="item ' + extClass + '">' +
                        '<div class="info">' +
                            '<span class="name textOverflowOneLine">' +
                                category.getExtensionList()[i].getName() +
                            '</span>' +
                            '<span class="status">' +
                                status +
                            '</span>' +
                            '<span class="check"></span>' +
                        '</div>' +
                        '<div class="delete"></div>';
        }

        html += '</ul></li>';
        return html;
    }

    function getExtViewHTML(category, searchKey) {
        var extensions = category.getExtensionList(searchKey);
        var extLen = extensions.length;
        if (extLen === 0) {
            // no qualified category
            return "";
        }

        var html = '<div class="category">' +
                    '<div class="title textOverflowOneLine">' +
                        category.getName() +
                    '</div>' +
                    '<div class="items">';
        var imgEvent = 'onerror="ExtensionPanel.imageError(this)"';

        for (var i = 0; i < extLen; i++) {
            var ext = extensions[i];
            var btnClass = ext.isInstalled() ? "disabled" : "";
            var image = ext.getImage();
            if (ext.getName().toLowerCase().indexOf("tableau") !== -1) {
                image = paths.tableauExt;
            }

            html += '<div class="item">' +
                        '<div class="logoArea">' +
                            '<img src="' + image + '" ' + imgEvent + '>' +
                        '</div>' +
                        '<div class="instruction">' +
                            '<div class="extensionName textOverflowOneLine">' +
                                ext.getName() +
                            '</div>' +
                            '<div class="author textOverflowOneLine">' +
                                'by <span class="text">' + ext.getAuthor() + '</span>' +
                            '</div>' +
                            '<div class="detail textOverflow">' +
                                ext.getDesription() +
                            '</div>' +
                        '</div>' +
                        '<div class="buttonArea">' +
                            '<button class="btn btnMid install ' + btnClass + '">' +
                                'INSTALLED' +
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
