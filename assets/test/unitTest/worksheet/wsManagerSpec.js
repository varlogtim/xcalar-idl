describe('Worksheet Interactivity', function() {
    var $tabs;
    var minModeCache;

    before(function() {
        minModeCache = gMinModeOn;
        gMinModeOn = true;
    });

    describe('Worksheet existence', function() {
       
        it('should have at least one worksheet', function() {
            $tabs = $('#worksheetTabs').find('.worksheetTab');
            expect($tabs).to.have.length.above(0);
        });

        it('addworksheet should create worksheet', function() {
            var numTabsBefore = $tabs.length;
            $('#addWorksheet').click();
            $tabs = $('#worksheetTabs').find('.worksheetTab');
            expect($tabs).to.have.length(numTabsBefore + 1);
        });

        it('new worksheet should be active', function() {
            var $lastTab = $('#worksheetTabs').find('.worksheetTab').last();
            expect($lastTab.hasClass('inActive')).to.equal(false);
        });
    });

    describe('Worksheet deletion', function() {
        it ('should remove worksheet', function() {
            var minModeCache = gMinModeOn;
            gMinModeOn = true;
            var numTabsBefore = $tabs.length;
            var wsId = $tabs.last().data('ws');
            WSManager.delWS(wsId, DelWSType.Empty);
            $tabs = $('#worksheetTabs').find('.worksheetTab');
            expect($tabs).to.have.length(numTabsBefore - 1);
            expect($('#worksheetTabs').find('[data-ws=' + wsId +']'))
                    .to.have.length(0);
            gMinModeOn = minModeCache;
        });
    });

    describe('Worksheet Scrolling', function() {
        before(function(done) {
            ensureWorksheetsExist(2);
            ensureTableExists(1)
            .then(function() {
                // switch to second to last worksheet
                var $tab = $('#worksheetTabs').find('.worksheetTab')
                                              .last().prev();
                $tab.trigger(fakeEvent.mousedown);
                return (ensureTableExists(1));
            })
            .then(function() {
                done();
            });
        });
        

        it('should center on table when moving worksheet', function() {
            var $lastTab = $('#worksheetTabs').find('.worksheetTab')
                                              .last();
            $lastTab.trigger(fakeEvent.mousedown);
            var wsId = $lastTab.data('ws');
            var lastWSScrollPos = $('#mainFrame').scrollLeft(0); // set to 0;
            var $prevTab = $('#worksheetTabs').find('.worksheetTab')
                                              .last().prev();

            $prevTab.trigger(fakeEvent.mousedown);
            var tableId = $('.xcTableWrap:visible').eq(0).data('id');
            WSManager.moveTable(tableId, wsId);
            var $tableWrap = $('#xcTableWrap-' + tableId + '.worksheet-' +
                                wsId);
            expect($lastTab.is('.inActive')).to.equal(false);
            expect($('#worksheetTabs').find('.worksheetTab:not(.inActive)'))
                                      .to.have.length.of(1);
            expect($tableWrap).to.have.length.of(1);
            expect($tableWrap.find('.tblTitleSelected')).to.have.length.of(1);
            
            var winTop = $(window).scrollTop();
            var mainFrameTop = $('#mainFrame').offset().top;
            $(window).scrollTop(mainFrameTop);

            var windowCenter = $(window).width() / 2;
            var yCoor = mainFrameTop - $(window).scrollTop() + 15; 
            var el = document.elementFromPoint(windowCenter, yCoor);
            $(window).scrollTop(winTop);
            var correctTable = $(el).closest('#xcTableWrap-' + tableId).length >
                                0;
            var scrolledToEnd = ($('#mainFrame').width() +
                                 $('#mainFrame').scrollLeft()) ===
                                 $('#mainFrame')[0].scrollWidth;

            expect(scrolledToEnd || correctTable).to.equal(true);
        });
    });

    after(function() {
        gMinModeOn = minModeCache;
    });
});

function ensureTableExists(minNumTables) {
    var deferred = jQuery.Deferred();
    var reqNumTables = minNumTables || 1;
    var numTables = $('.xcTableWrap:not(.inActive)').length;
    var numTablesNeeded = Math.max(0, reqNumTables - numTables);
    var promises = [];
    if (numTablesNeeded > 0) {
        for (var i = 0; i < numTablesNeeded; i++) {
            promises.push(autoAddTable);
        }
        chain(promises).
        then(deferred.resolve);
    } else {
        deferred.resolve();
    }
    return deferred.promise();
}

function ensureWorksheetsExist(minNumWS) {
    var reqNumWS = minNumWS || 1;
    var numWS = $('#worksheetTabs').find('.worksheetTab').length;
    var numWSNeeded = Math.max(0, reqNumWS - numWS);
    if (numWSNeeded > 0) {
        for (var i = 0; i < numWSNeeded; i++) {
            $('#addWorksheet').click();
        }
    }
}

function autoAddTable() {
    var deferred = jQuery.Deferred();
    var dsIcon;
    var dsName;
    var datasetExists = doesDatasetExist("testsuiteschedule");
    // $('#dataStoresTab').click();
    if (datasetExists) {
        dsIcon = '#exploreView .gridItems ' +
                 '.grid-unit:contains(testsuiteschedule):eq(0)';
        var $dsIcon = $(dsIcon);
        dsName = $dsIcon.text();
    } else {
        dsName = "testsuiteschedule" + Math.floor(Math.random() * 10000);
        var $formatDropdown = $("#fileFormatMenu");
        $("#importDataButton").click();
        $("#fileBrowserModal .close").click();
        $("#filePath").val('file:///var/tmp/qa/indexJoin/schedule');
        $formatDropdown.find('li[name="JSON"]').click();
        $('#fileName').val(dsName);
        $("#importDataSubmit").click();
        dsIcon = '#exploreView .grid-unit[data-dsname="' +
                  dsName + '"]:not(.inactive)';
    }
    
    
    TestSuite.__testOnly__.checkExists(dsIcon)
    .then(function() {
        var $grid = $(dsIcon).click();
        var dsId = $grid.data("dsid");
        TestSuite.__testOnly__.checkExists('#worksheetTable[data-dsid="' +
                                            dsId + '"]')
        .then(function() {
            $("#selectDSCols .icon").click();
            // wait for datacart name to change
            setTimeout(function() {
                
                dsName = DataCart.getCartById(dsId).find('input').val();
                $("#submitDSTablesBtn").click();
                TestSuite.__testOnly__.checkExists('.xcTableWrap' +
                                                   ' .tableName[value=' +
                                                    dsName+ ']')
                .then(function() {
                    deferred.resolve();
                });
            }, 1000);
            
        });
    });
    return deferred.promise();
}

function doesDatasetExist(dsName) {
    var numDS = $('#exploreView .gridItems')
                    .find('.grid-unit:contains(' + dsName + ')').length;
    return (numDS > 0);
}

