describe("Alert Modal Test", function() {
    var minModeCache;
    var $alertModal;
    var $alertTitle;
    var $alertMsg;
    var $alertInstr;
    var $modalBg;

    before(function(){
        // turn off min mode, as it affectes DOM test
        minModeCache = gMinModeOn;
        gMinModeOn = true;

        $alertModal = $("#alertModal");
        $alertTitle = $("#alertHeader").find(".text");
        $alertMsg = $("#alertContent").find(".text");
        $alertInstr = $("#alertInstruction").find(".text");
        $modalBg = $("#modalBackground");
    });

    it("Should show alert", function() {
        var title = "Alert Test";
        var instr = "test instruction";
        var msg = "test message";

        Alert.show({
            "title": title,
            "instr": instr,
            "msg": msg,
            "isAlert": true
        });

        assert.isTrue($alertModal.is(":visible"));
        assert.isFalse($("#alertCheckBox").is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertInstr.text()).to.equal(instr);
        expect($alertMsg.text()).to.equal(msg);
    });

    it("should hide alert", function() {
        Alert.tempHide();
        expect($alertModal.hasClass("xc-hidden"));
    });

    it("should unhide alert", function() {
        Alert.unhide();
        expect($alertModal.hasClass("xc-hidden"));
    });

    it("Should close alert", function() {
        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should update message", function() {
        var id = Alert.show({
            "title": "test",
            "msg": "test",
            "isAlert": true
        });
        var $text = $("#alertContent .text");
        // error case
        Alert.updateMsg(null, "update");
        expect($text.text()).to.equal("test");

        Alert.updateMsg(id, "update");
        expect($text.text()).to.equal("update");
    });

    it("should force close alert", function() {
        $modalBg.addClass("locked");
        $alertModal.addClass("locked");

        Alert.forceClose();

        expect($modalBg.hasClass("locked")).to.be.false;
        expect($alertModal.hasClass("locked")).to.be.false;
    });

    it("Should show alert with checkbox", function() {
        var title = "Alert with checkbox test";
        var msg = "test message2";

        Alert.show({
            "title": title,
            "msg": msg,
            "isCheckBox": true
        });

        assert.isTrue($alertModal.is(":visible"));
        assert.isTrue($("#alertCheckBox").is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(msg);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show error", function() {
        var title = "Error Alert Test";
        var error = "test error";
        Alert.error(title, error);

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(error);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show error with error object", function() {
        var title = "Error Alert Test2";
        var error = {
            "error": "test error"
        };
        Alert.error(title, error);

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(error.error);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show alert with dropdownlist", function() {
        var title = "Dropdown alert test";
        var testLabel = "test label";
        var testLi = "<li>Test 1</li>" +
                     "<li>Test 2</li>";

        Alert.show({
            "title": title,
            "optList": {
                "label": testLabel,
                "list": testLi
            }
        });

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($("#alertOptionLabel").text()).to.equal(testLabel + ":");
        expect($("#alertlist").find("li").length).to.equal(2);

        // select an option
        $("#alertlist").find("li").eq(0).trigger(fakeEvent.mouseup);
        var val = Alert.getOptionVal();
        expect(val).to.equal("Test 1");

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show alert with buttons", function() {
        var title = "buttons test";
        var msg = "buttons";
        var test = false;

        Alert.show({
            "title": title,
            "msg": msg,
            "buttons": [{
                "name": "button1",
                "className": "button1",
                "func": function() { test = true; }
            }, {
                "name": "button2",
                "className": "button2"
            }]
        });

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(msg);
        expect($alertModal.find(".button1").length).to.equal(1);
        expect($alertModal.find(".button2").length).to.equal(1);

        $alertModal.find(".button1").click();
        expect(test).to.be.true;
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should show with user input", function() {
        var $inputArea = $("#alertUserInputArea");

        Alert.show({
            "title": "test",
            "msg": "test",
            "userInput": {
                "label": "testLabel",
                "autofill": "testVal"
            }
        });

        assert.isTrue($alertModal.is(":visible"));
        expect($inputArea.hasClass("xc-hidden")).to.be.false;
        expect($inputArea.find(".label").text()).to.equal("testLabel");
        expect($("#alertUserInput").val()).to.equal("testVal");

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should hide buttons", function() {
        Alert.show({
            "title": "test",
            "msg": "test",
            "hideButtons": ["cancel"]
        });

        assert.isTrue($alertModal.is(":visible"));
        assert.isFalse($alertModal.find(".cancel").is(":visible"));

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should go to noCancel modal", function() {
        Alert.show({
            "title": "test",
            "msg": "test",
            "noCancel": true
        });

        assert.isTrue($alertModal.is(":visible"));
        assert.isFalse($alertModal.find(".cancel").is(":visible"));
        assert.isFalse($alertModal.find(".close").is(":visible"));

        $alertModal.find(".confirm").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should cancel", function() {
        var test = false;
        Alert.show({
            "title": "test",
            "msg": "test",
            "onCancel": function() {
                test = true;
            }
        });

        assert.isTrue($alertModal.is(":visible"));
        $alertModal.find(".cancel").click();
        expect(test).to.be.true;
        assert.isFalse($alertModal.is(":visible"));
    });

    it("should confirm", function() {
        var test = false;
        Alert.show({
            "title": "test",
            "msg": "test",
            "onConfirm": function() {
                test = true;
            }
        });

        assert.isTrue($alertModal.is(":visible"));
        $alertModal.find(".confirm").click();
        expect(test).to.be.true;
        assert.isFalse($alertModal.is(":visible"));
    });

    it("Should show alert with lock screen", function() {
        var title = "lock screen test";
        var msg = "lock screen";

        Alert.show({
            "title": title,
            "msg": msg,
            "lockScreen": true,
            "logout": true
        });

        assert.isTrue($alertModal.is(":visible"));
        // lock modal and background
        assert.isTrue($alertModal.hasClass("locked"));
        assert.isTrue($modalBg.hasClass("locked"));
        // has right button
        assert.isTrue($alertModal.find(".logout").length > 0);
        assert.isTrue($alertModal.find(".copySql").length > 0);
        assert.isTrue($alertModal.find(".genSub").length > 0);
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(msg);


        // trigger another show still lock it
        Alert.show({
            "title": title,
            "msg": msg,
            "noLogout": true,
            "logout": false
        });
        assert.isTrue($alertModal.hasClass("locked"));
        assert.isTrue($modalBg.hasClass("locked"));
        assert.isFalse($alertModal.find(".logout").length > 0);

        // close modal
        $alertModal.find(".logout, .copySql, .genSub").remove();
        $modalBg.removeClass("locked");
        $alertModal.removeClass("locked");
        $alertModal.find(".close").click();
        $("#container").removeClass("locked");
        assert.isFalse($alertModal.is(":visible"));
    });

    after(function() {
        gMinModeOn = minModeCache;
    });
});