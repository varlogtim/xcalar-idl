// describe('JoinView', function() {
//     // xx currently depends on table with the name "unitTestFakeYelp" to exist
//     var testDs;
//     var tableName;
//     var prefix;

//     before(function(done) {
//         var testDSObj = testDatasets.fakeYelp;
//         UnitTest.addAll(testDSObj, "unitTestFakeYelp")
//         .always(function(ds, tName, tPrefix) {
//             testDs = ds;
//             tableName = tName;
//             prefix = tPrefix;
//             done();
//         });
//     });
    
//     // to be continued
//     describe('check join initial state', function() {
//         var $aggForm;
//         var $functionsInput;
//         before(function(done) {
//             $operationsView = $('#operationsView');
//             $strPreview = $operationsView.find('.strPreview');
//             $('.xcTableWrap').each(function() {
//                 if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
//                     tableId = $(this).find('.hashName').text().slice(1);
//                     return false;
//                 }
//             });


//             OperationsView.show(tableId, 1, 'aggregate')
//             .then(function() {
//                 $aggForm = $operationsView.find('.aggregate:visible');
//                 $functionsInput = $aggForm.find('.functionsInput:visible')
//                 done();
//             });
//         }); 

//         describe('check aggregate form initial state', function() {
//             it('agg form elements should be visible', function() {
//                 expect($aggForm).to.have.length(1);
//                 expect($aggForm.find('.tableList .text:visible')).to.have.length(1);
//                 expect($aggForm.find('.tableList .text').text()).to.startsWith('unitTestFakeYelp');
//                 expect($functionsInput).to.have.length(1);
//                 expect($functionsInput.val()).to.equal("");
//                 expect($functionsInput.attr('placeholder')).to.equal("avg");
//             });

//             it('functions menu should be filled', function() {
//                 var $menu = $aggForm.find('.genFunctionsMenu:hidden');
//                 expect($menu).to.have.length(1);
//                 // expect($menu.text())
//             });
//         });
        
//         after(function(done) {
//             OperationsView.close();
//             var tableId;
//             $('.xcTableWrap').each(function() {
//                 if ($(this).find('.tableName').val().indexOf(testDs) > -1) {
//                     tableId = $(this).find('.hashName').text().slice(1);
//                     return false;
//                 }
//             });

//             // allow time for operations view to close
//             setTimeout(function() {
//                done(); 
//             }, 300);
//         });
//     });

//     after(function(done) {
//         UnitTest.deleteAll(tableName, testDs)
//         // UnitTest.deleteTable(tableName)
//         .always(function() {
//            done();
//         });
//     });
// });