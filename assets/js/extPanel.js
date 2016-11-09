window.ExtensionPanel = (function(ExtensionPanel, $) {
    var $panel;    // $("#extensionInstallPanel");
    var $extLists; // $("#extension-lists");
    var extSet;
    var isFirstTouch = true;

    ExtensionPanel.setup = function() {
        $panel = $("#extensionInstallPanel");
        $extLists = $("#extension-lists");

        $panel.on("click", ".item .more", function() {
            $(this).closest(".item").toggleClass("fullSize");
        });

        $panel.on("click", ".item .install", function() {
            var ext = getExtensionFromEle($(this).closest(".item"));
            installExtension(ext);
        });

        $extLists.on("click", ".listInfo", function() {
            $(this).closest(".listWrap").toggleClass("active");
        });

        $extLists.on("click", ".switch", function() {
            $(this).toggleClass("on");
        });

        $extLists.on("mousedown", ".item", function(event) {
            if (event.which !== 1) {
                return;
            }

            var $item = $(this);
            if ($item.hasClass("active")) {
                return;
            }

            $extLists.find(".item.active").removeClass("active");
            $item.addClass("active");
        });

        $panel.on("click", ".item .url", function() {
            var url = $(this).data("url");
            if (url == null) {
                return;
            } else {
                if (!url.startsWith("http:")) {
                    url = "http://" + url;
                }
                window.open(url);
            }
        });

        $("#extension-search").on("input", "input", function() {
            var searchKey = $(this).val().trim();
            refreshExtension(searchKey);
        });

        var $uploadSection = $("#extension-upload");
        $("#uploadExtension").click(function() {
            $uploadSection.removeClass("xc-hidden");
        });

        $uploadSection.on("click", ".close", function() {
            $uploadSection.addClass("xc-hidden");
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
        var imgSrc = paths.XCExt;
        ele.src = imgSrc;
        var ext = getExtensionFromEle($(ele).closest(".item"));
        ext.setImage(imgSrc);
    };

    function fetchData() {
        $panel.addClass("wait");

        $.ajax({
            "type"       : "POST",
            "contentType": "application/json",
            "url"        : hostname + "/app/listPackages",
            "success"    : function(data) {
                $panel.removeClass("wait");
                try {
                    var d = JSON.parse(data);
                    initializeExtCategory(d);
                } catch (error) {
                    handleError(error);
                }
            },
            "error": function(error) {
                handleError(error);
            }
        });
    }

    function handleError(error) {
        console.error("get extension error", error);
        $panel.removeClass("wait").removeClass("hint").addClass("error");
    }

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
        var categoryList = extSet.getList();
        generateInstalledExtList(categoryList);
        generateExtView(categoryList, searchKey);
    }

    function installExtension(ext) {
        // XXX placeholder
        console.log("install", ext.getName(), ext.getUrl());
    }

    function getExtensionFromEle($ext) {
        var extName = $ext.find(".extensionName").text();
        var category = $ext.closest(".category").find(".categoryName").text();
        var ext = extSet.getExtension(category, extName);
        return ext;
    }

    function generateInstalledExtList(categoryList) {
        var html = "";

        for (var i = 0, len = categoryList.length; i < len; i++) {
            html += getInstalledExtListHTML(categoryList[i]);
        }

        $extLists.html(html);
    }

    function generateExtView(categoryList, searchKey) {
        var html = "";

        for (var i = 0, len = categoryList.length; i < len; i++) {
            html += getExtViewHTML(categoryList[i], searchKey);
        }

        if (html === "") {
            $panel.addClass("hint");
        } else {
            $panel.removeClass("hint").find(".category").remove()
                .end()
                .append(html);
        }
    }

    function getInstalledExtListHTML(category) {
        var extensions = category.getInstalledExtensionList();
        var extLen = extensions.length;
        if (extLen === 0) {
            return "";
        }

        var html = '<div class="listWrap xc-expand-list active">' +
                        '<div class="listInfo no-selection">' +
                            '<span class="expand">' +
                                '<i class="icon xi-arrow-down fa-7"></i>' +
                            '</span>' +
                            '<span class="text">' +
                              category.getName() +
                              " (" + extLen + ")" +
                            '</span>' +
                        '</div>' +
                        '<ul class="itemList">';

        for (var i = 0, len = extLen; i < len; i++) {
            var status = (i === 0) ? "on" : "";

            html += '<li class="item no-selection">' +
                        '<i class="icon xi-menu-extension fa-15"></i>' +
                        '<span class="name textOverflowOneLine">' +
                            category.getExtensionList()[i].getName() +
                        '</span>' +
                        '<i class="delete icon xi-trash fa-15 xc-action"></i>' +
                        '<div class="xc-switch switch ' + status + '">' +
                            '<div class="slider"></div>' +
                        '</div>';
        }

        html += '</ul></div>';
        return html;
    }

    function getExtViewHTML(category, searchKey) {
        var extensions = category.getExtensionList(searchKey);
        var extLen = extensions.length;
        if (extLen === 0) {
            // no qualified category
            return "";
        }

        var html = '<div class="category cardContainer">' +
                    '<header class="cardHeader">' +
                        '<div class="title textOverflowOneLine categoryName">' +
                            category.getName() +
                        '</div>' +
                    '</header>' +
                    '<div class="cardMain items">';
        var imgEvent = 'onerror="ExtensionPanel.imageError(this)"';

        for (var i = 0; i < extLen; i++) {
            var ext = extensions[i];
            var btnText;

            if (ext.isInstalled()) {
                btnClass = "installed";
                btnText = ExtTStr.Installed;
            } else {
                btnClass = "";
                btnText = ExtTStr.Install;
            }

            var image = ext.getImage();
            if (ext.getName().toLowerCase().indexOf("tableau") !== -1) {
                image = paths.tableauExt;
            }

            html += '<div class="item">' +
                        '<section class="mainSection">' +
                        '<div class="logoArea">' +
                            '<img src="' + image + '" ' + imgEvent + '>' +
                        '</div>' +
                        '<div class="instruction">' +
                            '<div class="extensionName textOverflowOneLine">' +
                                ext.getName() +
                            '</div>' +
                            '<div class="author textOverflowOneLine">' +
                                'By ' + ext.getAuthor() +
                            '</div>' +
                            '<div class="detail textOverflow">' +
                                ext.getDescription() +
                            '</div>' +
                        '</div>' +
                        '<div class="buttonArea">' +
                            '<button class="btn install ' + btnClass + '">' +
                                btnText +
                            '</button>' +
                            '<button class="btn btn-cancel more">' +
                                '<span class="moreText">' +
                                    ExtTStr.More +
                                '</span>' +
                                '<span class="lessText">' +
                                    ExtTStr.Less +
                                '</span>' +
                            '</button>' +
                        '</div>' +
                        '</section>' +
                        '<section class="bottomSection clearfix">' +
                            '<div class="leftPart">' +
                                '<div class="detail">' +
                                    ext.getDescription() +
                                '</div>' +
                                '<div class="basicInfo">' +
                                    ExtTStr.Version + ': ' + ext.getVersion() +
                                    ' | ' + ExtTStr.Lang + ': English' +
                                    ' | ' + ExtTStr.extName + ': ' + ext.getName() +
                                    ' | ' + ExtTStr.categoryName + ': ' + category.getName() +
                                '</div>' +
                            '</div>' +
                            '<div class="rightPart">' +
                                '<div class="url" data-url="' + ext.getWebsite() + '">' +
                                    ExtTStr.Website +
                                '</div>' +
                                '<div class="url">' +
                                    ExtTStr.Report +
                                '</div>' +
                            '</div>' +
                        '</section>' +
                    '</div>';
        }

        html += '</div></div>';

        return html;
    }

    return (ExtensionPanel);
}({}, jQuery));
