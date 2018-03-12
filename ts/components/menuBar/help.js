window.Help = (function($, Help) {
    var searchURL;
    var curHelpHashTags;
    var helpContentPath;

    Help.setup = function() {
        searchURL = paths.helpUserSearch;
        curHelpHashTags = helpHashTags;
        helpContentPath = paths.helpUserContent;

        // Toggling helper tooltips
        setupHelpSearch();
    };

    function setupHelpSearch() {
        var $searchInput = $("#helpSearch");
        var $categoryArea = $("#helpResults").find(".categoryArea");
        var $resultsArea = $("#helpResults").find(".resultsArea");

        $("#helpSubmit").click(function() {
            $("#helpResults").find(".noResults").hide();
            $searchInput.trigger({type: "keyup", which: keyCode.Enter});
        });

        $("#helpSearchArea").submit(function() {
            $("#helpResults").find(".noResults").hide();
            return false;
        });

        $("#helpCategories").click(function() {
            $categoryArea.show();
            $("#helpCategories").hide();
            $resultsArea.hide();
            $searchInput.val("");
        });

        $("#discourseButton").click(function() {
            var searchText = $searchInput.val();
            window.open("https://discourse.xcalar.com/search?q=" + searchText,
                        "xcalar");
        });

        $searchInput.on("keyup", function(event) {
            if (event.which === keyCode.Enter) {
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
                    var $iframe = $("#mcfResults");
                    $iframe.remove();
                    $resultsArea.append('<iframe id="mcfResults"></iframe>');
                    $iframe = $("#mcfResults");
                    $iframe.attr("src", searchURL + $searchInput.val());
                    $iframe.load(function() {
                        $resultsArea.show();
                    });
                }
            }
        });
        $searchInput.on("change", function() {
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
        var maxToDisplay = 100;
        var html = "";
        var subTopic;

        categorizeTopics(categoriesObj);

        // need to make into array in order to sort topics by titles
        var categories = [];
        // Sort categories in order of the names of topics
        for (var category in categoriesObj) {
            categories.push(categoriesObj[category]);
        }

        categories.sort(function(elem1, elem2) {
            if (elem1.fullName < elem2.fullName) {
                return -1;
            } else if (elem1.fullName > elem2.fullName) {
                return 1;
            }
            return 0;
        });

        for (var i = 0; i < categories.length; i++) {

            html += '<div class="categoryBlock">' +
                        '<div class="categoryWrap">' +
                            '<div class="subHeading">';
            if (categories[i].more) {
                html += '<a href="' + helpContentPath +
                        getFormattedUrl(categories[i].more.url) +
                        '" target="xchelp">' +
                        categories[i].title +
                        '</a>';
            } else {
                html += categories[i].title;
            }
            html += '</div>';
            subTopic = categories[i].subTopics;

            sortByTitles(subTopic);

            var numToDisplay = subTopic.length;

            if (categories[i].more) {
                numToDisplay = Math.min(numToDisplay, maxToDisplay);
            }

            for (var j = 0; j < numToDisplay; j++) {
                // create new row for every 2 links
                if (j % 2 === 0) {
                    html += '<div class="row clearfix">';
                }
                url = getFormattedUrl(subTopic[j].url);
                html += '<div class="linkWrap"><a href="' + helpContentPath +
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

            html += '</div></div>';
        }
        $('#helpResults').find('.categoryArea .mainHeading').after(html);
    }

    function categorizeTopics(categories) {
        var page;
        var topic;
        var topicIndex;
        var url;
        var fullName;
        for (var i = 0; i < curHelpHashTags.length; i++) {
            page = curHelpHashTags[i];
            topic = page.url;
            topicIndex = topic.indexOf('Content/');
            url = topic.slice(topicIndex + 'Content/'.length);
            fullName = url.split('/')[0];
            topic = fullName.slice(2);
            topic = xcHelper.camelCaseToRegular(topic);
            if (topic === "" || topic.indexOf('.htm') > -1 ||
                topic === "Feature Topics") {
                continue;
            }
            if (!categories[topic]) {
                categories[topic] = {
                    "title": topic,
                    "subTopics": [],
                    "fullName": fullName
                };
            }
            // If topic and page.title are the same, then it's the link
            if (topic.toLowerCase() === page.title.toLowerCase()) {
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
            a = a.url;
            b = b.url;
            a = a.substring(a.lastIndexOf("/"));
            a = a.substring(0, a.indexOf("_"));
            b = b.substring(b.lastIndexOf("/"));
            b = b.substring(0, b.indexOf("_"));
            if (a < b) {
                return -1;
            } else if (a > b) {
                return 1;
            } else {
                return 0;
            }
        });
    }


    return (Help);

}(jQuery, {}));
