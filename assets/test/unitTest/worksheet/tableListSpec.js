describe('TableList Test', function() {
    describe('TableList.updatePendingState', function() {
        it('updatePendingState() should work', function() {
            // initial state
            var $listWrap = $("#activeTableList");
            expect($listWrap.hasClass('pending')).to.be.false;

            // increment
            TableList.updatePendingState(true);
            expect($listWrap.hasClass('pending')).to.be.true;

            //increment again
            TableList.updatePendingState(true);
            expect($listWrap.hasClass('pending')).to.be.true;

            // decrement
            TableList.updatePendingState(false);
            expect($listWrap.hasClass('pending')).to.be.true;

            //decrement again
            TableList.updatePendingState(false);
            expect($listWrap.hasClass('pending')).to.be.false;
        }); 
    });
});