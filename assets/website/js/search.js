$(document).ready(function() {
    var keyword;
  var readyCheck;
  var isReady = {
    "youtube": false,
    "xu": false,
    "document":false,
    "forum": false
  }
  var items = {
    "youtube": [],
    "xu": [],
    "document":[],
    "forum": []
  }

  $(window).bind("pageshow", function() {
    $("#searchbox").val("");
    $("#no_result_wrapper").hide();
  });

  $("#searchbox").on("keydown", function(event) {
    if (event.key === "Enter") {
      searchItem();
      return false;
    }
  });

  $("#submitsearch").on("click", function() {
    var $el = $(this);
    if($el.data('isClicked')){
      e.preventDefault();
      e.stopPropagation();
    } else {
      $el.data('isClicked', true);
      searchItem();
      window.setTimeout(function(){
        $el.removeData('isClicked');
      }, 1000)
    }
  });

  $("#allResultLinks").on("click", ".pageLink span",  function() {
    var pageNum = $(this).text();
    goToPage(Number(pageNum));
    return false;
  });

  function searchItem() {
    var item = $("#searchbox").val().trim();
    if (item !== "" && item !== keyword) {
      keyword = item;
    } else {
      return false;
    }
    isReady["youtube"] = false;
    isReady["xu"] = false;
    isReady["document"] = false;
    isReady["forum"] = false;

    items["youtube"] = [];
    items["xu"] = [];
    items["document"] = [];
    items["forum"] = [];

    $("#pleasewait").show();
    $('html,body').animate({scrollTop: $("#pleasewait").offset().top}, 1000);
    $("#no_result_wrapper").hide();
    $("#results").hide();
    displayYoutube();
    // displayGoogle(keyword, "xu");
    displayGoogle(keyword, "document");
    displayGoogle(keyword, "forum");
    readyCheck = setInterval(function(){
      if (isReady["youtube"] && isReady["xu"] && isReady["forum"] && isReady["document"]) {
        clearInterval(readyCheck);
        $("#pleasewait").hide();
        if ((items["youtube"].length === 0) && (items["xu"].length === 0) && (items["document"].length === 0) && (items["forum"].length === 0)) {
          $("#no_result_wrapper").show();
        } else {
          appendPages();
          goToPage(1);
          $("#results").show();
          $('html,body').animate({scrollTop: $("#results").offset().top}, 1000);
        }
      }
    }, 3000);
  }

  function appendPages() {
    var allResultsArr = $.merge($.merge(items["youtube"], items["xu"]), $.merge(items["document"], items["forum"]));
    var totalLength = allResultsArr.length;
    var count = 0;
    var content = "";
    var currContent = "";
    var links = "";
    var currPage = 0;
    for (var i = 0; i < totalLength; i++) {
      if (count == 15) {
        currPage = parseInt(i / 15);
        content += '<div class="pageWrapper" id="page_' + currPage + '">' + currContent + "</div>";
        links += '<div class="pageLink"><span>' + currPage + '</span></div>';
        count = 0;
        currContent = "";
      } else {
        currContent += allResultsArr[i];
        count++;
      }
    }
    if (count != 0 && currContent != "") {
      currPage = currPage + 1;
      content += '<div class="pageWrapper" id="page_' + currPage + '">' + currContent + "</div>";
      links += '<div class="pageLink"><span>' + currPage + '</span></div>';
    }
    $("#allResultContent").html(content);
    $("#allResultLinks").html(links);
  }

  function goToPage(pageID) {
    $(".pageWrapper").hide();
    $("#page_" + pageID).show();
    $(".pageLink").removeClass("focus");
    $(".pageLink").eq(pageID - 1).addClass("focus");
  }

  function displayGoogle(keyword, type) {
    var html = "";
    var siteUrl;
    var label;
    // var baseUrl = "https://www.googleapis.com/customsearch/v1?key=" + apiKey + "&cx=" + searchEngine + "&q=" + keyword;
    var baseUrl;
    var searchword = keyword;
    var realword = keyword;
    if (keyword.charAt(0) == '"' && keyword.charAt(keyword.length - 1) == '"' && keyword.length > 2) {
      searchword = "%20" + keyword.substring(1, keyword.length - 1) + "%20";
      realword = keyword.substring(1, keyword.length - 1);
    }
    if (type == "document") {
      baseUrl = "https://muq38rhxfk.execute-api.us-west-2.amazonaws.com/prod/searchDoc?&keyword=" + searchword;
      siteUrl = "http://xcalar.com/document";
      label = "doc";
    } else {
      baseUrl = "https://vb9f4rq45f.execute-api.us-west-2.amazonaws.com/prod/searchForum?&keyword=" + searchword;
      siteUrl = "https://discourse.xcalar.com";
      label = "forum";
    }
    isReady[type] = false;
    items[type] = [];
    getDataFromApi(1);

    function getDataFromApi(startNum) {
      var url = baseUrl + "&startNum=" + startNum;
      var deferred = $.Deferred();
      $.ajax({
        method: 'GET',
          url: url,
          success: function(data) {
            if (data && data.items && data.items.length !== 0) {
              for (var i = 0; i < data.items.length; i++) {
                var item = data.items[i];
                if (label == "doc" || label == "article") {
                  if (item.link.indexOf("articles") != -1) {
                    type = "xu";
                    label = "article";
                    siteUrl = "http://university.xcalar.com";
                  } else {
                    type = "document";
                    label = "doc";
                    siteUrl = "http://xcalar.com/document";
                  }
                }
                items[type].push(
                  '<div class="result">' +
                    '<div class="title-row">' +
                      '<div class="label" url="' + siteUrl + '">' +
                        '<a class="label-link target="_blank">'+ label +'</a>' +
                      '</div>'+
                      '<div class="title">' +
                        '<a class="title-link" target="_blank" href="'+ item.link + '">'+ item.htmlTitle +'</a>' +
                      '</div>' +
                    '</div>' +
                    '<div class="description">' +
                      mark(item.snippet, realword) +
                    '</div>' +
                  '</div>'
                );
              }
              getDataFromApi(startNum + 10);
            } else {
              if (type == "document" || type == "xu") {
                isReady["document"] = true;
                isReady["xu"] = true;
              } else {
                isReady[type] = true;
              }
              deferred.resolve();
            }
          },
          error: function(error) {
            isReady[type] = true;
            deferred.resolve();
          }
      });
      return deferred.promise();
    }
  }

  function displayYoutube() {
    isReady["youtube"] = false;
    items["youtube"] = [];
    var searchword = keyword;
    var realword = keyword;
    if (keyword.charAt(0) == '"' && keyword.charAt(keyword.length - 1) == '"' && keyword.length > 2) {
      searchword = "%20" + keyword.substring(1, keyword.length - 1) + "%20";
      realword = keyword.substring(1, keyword.length - 1);
    }
    $.ajax({
      method: 'GET',
      url: 'https://znyidq6ap2.execute-api.us-west-2.amazonaws.com/prod/searchYoutube?keyword=' + searchword,
      success: function(data) {
        var html = "";
        var returnItems = data.items;
        if (returnItems) {
          for (var i = 0; i < returnItems.length; i++) {
            if (returnItems[i] && returnItems[i].id && returnItems[i].id.kind == "youtube#video") {
              var url = "https://www.youtube.com/embed/" + returnItems[i].id.videoId;
              var description = mark(returnItems[i].snippet.description, realword);
              var title = mark(returnItems[i].snippet.title, realword);
              items["youtube"].push(
                '<div class="result">' +
                    '<div class="title-row">' +
                      '<div class="label" url="https://www.youtube.com/channel/UCS-x8wOBSeqJ2hg2HYNk70w">' +
                        '<a class="label-link" target="_blank">video</a>' +
                      '</div>'+
                      '<div class="title">' +
                        '<a class="title-link" target="_blank" href="'+ url + '">'+ title +'</a>' +
                      '</div>' +
                    '</div>' +
                    '<div class="description">' +
                      description +
                    '</div>' +
                '</div>'
              );
            }
          }
        }
        isReady["youtube"] = true;
      },
      error: function() {
        isReady["youtube"] = true;
      }
    });
  }

  function mark(text, keyword) {
    var lowerCaseText = text.toLowerCase();
    var lowerCaseKeyword = keyword.toLowerCase();
    var subs = lowerCaseText.split(lowerCaseKeyword);
    var res = text.substring(0, subs[0].length);
    var count = subs[0].length + keyword.length;
    for (var i = 1; i < subs.length; i++) {
      res += '<b>' + keyword + '</b>' + text.substring(count, count + subs[i].length);
      count += keyword.length + subs[i].length;
    }
    return res;
  }
});