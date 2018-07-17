describe("Dag Drag Test", function() {
    var $dagView;
    var $dfWrap;
    var dragObj;
    var $operator;
    var onDragEnd;

    before (function() {
        MainMenu.openPanel("workspacePanel", "dagButton");
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");
        $operator = $('<div class="testOperator" ' +
        'style="position:fixed;top: 50px; left:50px">Test</div>');
        $("body").append($operator);
        onDragEnd = function($newNode, event, data) {

        };
    });

    describe("start drag", function() {
        it("checkDrag without mousemove should do nothing", function() {
            var e = $.Event('mousedown', {pageX: 100, pageY: 100});
          
            dragObj = new DragHelper({
                event: e,
                $element: $operator,
                $container: $dagView,
                $dropTarget: $dfWrap.find(".dataflowArea").eq(0),
                onDragEnd: function($newNode, _event, data) {
                    onDragEnd($newNode, _event, data);
                },
                onDragFail: function() {
    
                },
                copy: true
            });

            expect(dragObj.isDragging).to.be.false;
            expect(dragObj.mouseDownCoors.x).to.equal(100);
            expect(dragObj.mouseDownCoors.y).to.equal(100);
        });

        it("mousemove of 1 should not trigger drag start", function() {
            var e = $.Event('mousemove', {pageX: 101, pageY: 101});
            $(document).trigger(e);
            expect(dragObj.isDragging).to.be.false;
        });

        it("mousemove of 2 should trigger drag start", function() {
            expect($(".testOperator").length).to.equal(1);
            expect($(".dragContainer").length).to.equal(0);
            var e = $.Event('mousemove', {pageX: 102, pageY: 101});
            $(document).trigger(e);
            expect(dragObj.isDragging).to.be.true;
            expect($(".testOperator").length).to.equal(2);
            expect($(".dragContainer").length).to.equal(1);
        });
        
    });

    describe("dragging", function() {
        it("on drag should position clone", function() {
            var e = $.Event('mousemove', {pageX: 103, pageY: 101});
            $(document).trigger(e);
            expect(dragObj.isDragging).to.be.true;
            expect($(".testOperator").length).to.equal(2);
            var rect = $(".dragContainer")[0].getBoundingClientRect();
            
            expect(rect.left).to.equal(53);
            expect(rect.top).to.equal(51 - $(window).scrollTop());
        });
    });

    describe("endDrag", function() {
        it("end Drag should call onDragEnd callback", function() {
            var called = false;
            onDragEnd = function($newNode, event, data) {
                var rect = $dfWrap[0].getBoundingClientRect();
                expect(data.coors.length).to.equal(1);
                expect(data.coors[0].x).to.equal(150 - rect.left);
                expect(data.coors[0].y).to.equal(250 - rect.top - $(window).scrollTop());
                called = true;
            };
            var e = $.Event('mousemove', {pageX: 200, pageY: 300});
            $(document).trigger(e);
            var e = $.Event('mouseup', {pageX: 200, pageY: 300});
            $(document).trigger(e);
            expect(called).to.be.true;
            expect($(".testOperator").length).to.equal(1);
        });
    });
});