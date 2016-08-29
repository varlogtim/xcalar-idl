window.Help = (function($, Help) {
    Help.setup = function() {
        // Toggleing helper tooltips
        setupHelpSearch();

        $('#helpOnOff').click(function() {
            toggleRefresh($(this));
        });

        function toggleRefresh($target) {
            if ($target.hasClass('on')) {
                $('#helpOnOff').removeClass('on');
                Tips.destroy();
            } else {
                $('#helpOnOff').addClass('on');
                Tips.display();
            }
        }

    };

    Help.tooltipOff = function() {
        $('body').addClass('tooltipOff');
        $('#helpOnOff').addClass('off');
    };

    Help.tooltipOn = function() {
        $('body').removeClass('tooltipOff');
        $('#helpOnOff').removeClass('off');
    };

    Help.isTooltipOff = function() {
        return ($('body').hasClass('tooltipOff'));
    };

    function setupHelpSearch() {
        var $searchInput = $('#helpSearch');
        var $categoryArea = $('#helpResults').find('.categoryArea');
        var $resultsArea = $('#helpResults').find('.resultsArea');

        $('#helpSubmit').click(function() {
            $('#helpResults').find('.noResults').hide();
            $searchInput.trigger({"type": "keyup", "keyCode": keyCode.Enter});
        });

        $('#helpSearchArea').submit(function() {
            $('#helpResults').find('.noResults').hide();
            return false;
        });

        $('#helpCategories').click(function() {
            $categoryArea.show();
            $("#helpCategories").hide();
            $resultsArea.hide();
            $searchInput.val("");
        });

        $searchInput.on('keyup', function(e) {
            if (e.keyCode === keyCode.Enter) {
                if ($searchInput.val().trim() === "") {
                    $categoryArea.show();
                    $("#helpCategories").hide();
                    $resultsArea.hide();
                } else {
                    $categoryArea.hide();
                    $("#helpCategories").show();
                    $resultsArea.hide();
                    // Must remove and reattach. Else the .load trick doesn't
                    // work
                    var $iframe = $('#mcfResults');
                    $iframe.remove();
                    $(".resultsArea").append(
                                           '<iframe id="mcfResults"></iframe>');
                    $iframe = $("#mcfResults");
                    $iframe.attr('src','assets/help/Content/SearchInsight.htm#search-'+
                                 $searchInput.val());
                    $iframe.load(function() {
                        $resultsArea.show();
                    });
                }
            }
        });
        $searchInput.on('change', function() {
            if ($searchInput.val().trim() === "") {
                $categoryArea.show();
                $("#helpCategories").hide();
                $resultsArea.hide();
            }
        });

        generateHelpTopics();
    }

    function generateHelpTopics() {
        var categoriesObj = {};
        var url;
        var maxToDisplay = 6;
        var html = "";
        var subTopic;

        categorizeTopics(categoriesObj);

        // need to make into array in order to sort topics by titles
        var categories = [];
        for (var topic in categoriesObj) {
            categories.push(categoriesObj[topic]);
        }
        sortByTitles(categories);

        for (var i = 0; i < categories.length; i++) {

            html += '<div class="categoryBlock">' +
                        '<div class="categoryWrap">' +
                            '<div class="subHeading">' +
                                categories[i].title + '</div>';
            subTopic = categories[i].subTopics;

            sortByTitles(subTopic);

            var numToDisplay = subTopic.length;

            if (categories[i].more) {
                numToDisplay = Math.min(numToDisplay, maxToDisplay);
            }

            for (var j = 0; j < numToDisplay; j++) {
                // create new row for every 2 linkss
                if (j % 2 === 0) {
                    html += '<div class="row clearfix">';
                }
                url = getFormattedUrl(subTopic[j].url);
                html += '<div class="linkWrap"><a href="' + paths.helpContent +
                         url + '" ' + 'target="xchelp">' + subTopic[j].title +
                         '</a></div>';
                if (j % 2 !== 0) {
                    html += '</div>';
                }
            }
            // close row tag if not closed
            if (j % 2 !== 0) {
                html += '</div>';
            }
            if (categories[i].more) {
                url = getFormattedUrl(categories[i].more.url);
                var moreText = categories[i].title.toLowerCase();
                if (moreText.indexOf('topics') !==
                    categories[i].title.length - 6) {
                    moreText += " topics";
                }
                html += '<div class="moreLink"><a href="' + paths.helpContent +
                         url + '" target="xchelp">All ' +
                         moreText + '</a></div>';
            }

            html += '</div></div>';
        }
        $('#helpResults').find('.categoryArea .mainHeading').after(html);
    }

    function categorizeTopics(categories) {
        var page;
        var topic;
        var topicIndex;
        var url;
        for (var i = 0; i < helpHashTags.pages.length; i++) {
            page = helpHashTags.pages[i];
            topic = page.url;
            topicIndex = topic.indexOf('Content/');
            url = topic.slice(topicIndex).slice(8);
            topic = url.split('/')[0].slice(2);
            topic = xcHelper.camelCaseToRegular(topic);
            if (topic === "" || topic.indexOf('.htm') > -1 ||
                topic === "Feature Topics") {
                continue;
            }
            if (!categories[topic]) {
                categories[topic] = {title: topic, subTopics: []};
            }
            if ((topic === "Ref Information" &&
                page.title === "Reference information") ||
                (topic === "Common Tasks" &&
                page.title === "Common tasks") ||
                (topic === "Introduction Topics" &&
                page.title === "Getting started")) {
                categories[topic].more = page;
            } else {
                categories[topic].subTopics.push(page);
            }
        }
    }

    function getFormattedUrl(url) {
        var index = url.indexOf('Content/');
        return (url.slice(index).slice(8));
    }

    function sortByTitles(list) {
        list.sort(function(a, b) {
            if (a.title < b.title) {
                return -1;
            } else if (a.title > b.title) {
                return 1;
            } else {
                return 0;
            }
        });
    }


    return (Help);

}(jQuery, {}));
