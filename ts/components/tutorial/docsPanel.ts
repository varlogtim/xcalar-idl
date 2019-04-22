class DocsPanel {
    private static _instance = null;

    public static get Instance(): DocsPanel {
        return this._instance || (this._instance = new this());
    }
    public searchURL: string;
    public curHelpHashTags;
    public helpContentPath: string ;

    public setup(): void {
        this.searchURL = paths.helpUserSearch;
        this.curHelpHashTags = helpHashTags;
        this.helpContentPath = paths.helpUserContent;

        // Toggling helper tooltips
        this.setupHelpSearch();
    };

    public setupHelpSearch(): void {
        const self = this;
        let $searchInput = $("#helpSearch");
        let $categoryArea = $("#helpResults").find(".categoryArea");
        let $resultsArea = $("#helpResults").find(".resultsArea");

        $("#helpSubmit").click(function() {
            $("#helpResults").find(".noResults").hide();
            $searchInput.trigger("keyup", {which: keyCode.Enter});
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
            let searchText = $searchInput.val();
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
                    let $iframe = $("#mcfResults");
                    $iframe.remove();
                    $resultsArea.append('<iframe id="mcfResults"></iframe>');
                    $iframe = $("#mcfResults");
                    $iframe.attr("src", self.searchURL + $searchInput.val());
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

        this.generateHelpTopics();
    }

    public generateHelpTopics(): void {
        let categoriesObj = {};
        let url;
        let maxToDisplay = 100;
        let html = "";
        let subTopic;

        this.categorizeTopics(categoriesObj);

        // need to make into array in order to sort topics by titles
        let categories = [];
        // Sort categories in order of the names of topics
        for (let category in categoriesObj) {
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

        for (let i = 0; i < categories.length; i++) {

            html += '<div class="categoryBlock">' +
                        '<div class="categoryWrap">' +
                            '<div class="subHeading">';
            if (categories[i].more) {
                html += '<a href="' + this.helpContentPath +
                        this.getFormattedUrl(categories[i].more.url) +
                        '" target="xchelp">' +
                        categories[i].title +
                        '</a>';
            } else {
                html += categories[i].title;
            }
            html += '</div>';
            subTopic = categories[i].subTopics;

            this.sortByTitles(subTopic);

            let numToDisplay = subTopic.length;

            if (categories[i].more) {
                numToDisplay = Math.min(numToDisplay, maxToDisplay);
            }
            let j = 0;

            for (j = 0; j < numToDisplay; j++) {
                // create new row for every 2 links
                if (j % 2 === 0) {
                    html += '<div class="row clearfix">';
                }
                url = this.getFormattedUrl(subTopic[j].url);
                html += '<div class="linkWrap"><a href="' + this.helpContentPath +
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

    public categorizeTopics(categories): void {
        let page;
        let topic;
        let topicIndex;
        let url;
        let fullName;
        for (let i = 0; i < this.curHelpHashTags.length; i++) {
            page = this.curHelpHashTags[i];
            topic = page.url;
            topicIndex = topic.indexOf('Content/ContentXDHelp/');
            url = topic.slice(topicIndex + 'Content/ContentXDHelp/'.length);
            fullName = url.split('/')[0];
            topic = fullName.slice(2);
            topic = topic.replace("SQL", "Sql"); // To avoid SQL being treated as
                                               // camel case
            topic = xcStringHelper.camelCaseToRegular(topic);
            topic = topic.replace("Sql", "SQL")
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

    public getFormattedUrl(url): string {
        let index = url.indexOf('Content/ContentXDHelp/');
        return (url.slice(index).slice(8));
    }

    public sortByTitles(list): void {
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
}
