describe('AlertModal', function() {
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

    it('Should show alert', function() {
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

    it('Should close alert', function() {
        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it('Should show alert with checkbox', function() {
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


    it('Should show error', function() {
        var title = "Error Alert Test";
        var error = "test error";
        Alert.error(title, error);

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(error);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it('Should show error with error object', function() {
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

    it('Should show alert with dropdownlist', function() {
        var title = "Dropdown alert test";
        var testLabel = "test label";
        var testLi = '<li>Test 1</li>' +
                     '<li>Test 2</li>';

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

    it('Should show alert with buttons', function() {
        var title = "buttons test";
        var msg = "buttons";

        Alert.show({
            "title": title,
            "msg": msg,
            "buttons": [
                {
                    "name": "button1",
                    "className": "button1"
                },
                {
                    "name": "button2",
                    "className": "button2"
                }
            ]
        });

        assert.isTrue($alertModal.is(":visible"));
        expect($alertTitle.text()).to.equal(title);
        expect($alertMsg.text()).to.equal(msg);
        expect($alertModal.find(".button1").length).to.equal(1);
        expect($alertModal.find(".button1").length).to.equal(1);

        $alertModal.find(".close").click();
        assert.isFalse($alertModal.is(":visible"));
    });

    it('Should show alert with lock screen', function() {
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

        // close modal
        $alertModal.find(".logout, .copySql, .genSub").remove();
        $modalBg.removeClass("locked");
        $alertModal.removeClass("locked");
        $alertModal.find(".close").click();
        $("#container").removeClass('locked');
        assert.isFalse($alertModal.is(":visible"));
    });


    after(function() {
        gMinModeOn = minModeCache;
    });
});