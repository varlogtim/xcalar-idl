describe("Schedule related Test", function() {
    before(function() {
        // go to the tab;
        $("#dataflowTab").click();
    });

    describe("Time related function Test", timeRelatedFunctionTest);
    describe("View related function Test", viewRelatedFunctionTest);
    describe("Form Submit Test", formSubmitTest);
});


function timeRelatedFunctionTest() {
    var $timeInput;
    var $timePicker;
    var $scheduleDetail;

    before(function() {
        $scheduleDetail = $("#scheduleDetail");
        $timeInput = $scheduleDetail.find(".timeSection .time");
        $timePicker = $("#modScheduler-timePicker");
    });

    it("getNextRunTime should work", function() {
        var futureTime = new Date();
        var previousTime = new Date();

        previousTime.setDate(previousTime.getDate() - 1);
        futureTime.setDate(futureTime.getDate() + 1);

        var futureDateText = (futureTime.getMonth() + 1) + "/"
                            + futureTime.getDate() + "/"
                            + futureTime.getFullYear();

        var options = {
            "startTime": futureTime, // The time to start the next run
            "dateText": futureDateText,
            "timeText": "11 : 13 PM",
            "repeat": "hourly",
            "freq": 5
        };

        // StartTime at the future, nothing has been changed
        var schedule = new SchedObj(options);
        Scheduler.__testOnly__.getNextRunTime(schedule);
        expect(schedule.startTime).to.equal(futureTime);

        // StartTime at previous, need to figure out the start time for
        // next running
        options.startTime = previousTime.getTime();
        options.repeat = "minute";
        schedule = new SchedObj(options);
        var currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        var d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(60*1000)).to.within(0, 1);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "hourly";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*1000)).to.within(0, 1);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "daily";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*24*1000)).to.within(0, 1);
        expect(d.getHours() - previousTime.getHours()).to.equal(0);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "weekly";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*24*1000)).to.within(0, 7);
        expect(((d.getTime() - previousTime)/(3600*24*1000)) % 7).to.equal(0);
        expect(d.getHours() - previousTime.getHours()).to.equal(0);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "biweekly";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*24*1000)).to.within(0, 14);
        expect(((d.getTime() - previousTime)/(3600*24*1000)) % 14).to.equal(0);
        expect(d.getHours() - previousTime.getHours()).to.equal(0);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "***";
        schedule = new SchedObj(options);
        currentTime = new Date();
        try {
            Scheduler.__testOnly__.getNextRunTime(schedule);
        } catch (error) {
            expect(error.message).to.equal("Invalid option!");
        }
    });

    it("showTimeHelper should work", function() {
        var showTimeHelper = Scheduler.__testOnly__.showTimeHelper;
        var $timePickerInput = $timePicker.find(".inputSection");
        var date = new Date();

        date.setUTCHours(0);
        date.setUTCMinutes(0);
        $timePicker.data("date", date);
        $timeInput.val("00 : 00 AM");

        date.setUTCHours(0);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("12");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("AM");
        expect($timeInput.val()).to.equal("12 : 00 AM");

        date.setUTCHours(11);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("11");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("AM");
        expect($timeInput.val()).to.equal("11 : 00 AM");

        date.setUTCHours(12);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("12");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("12 : 00 PM");

        date.setUTCHours(13);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 00 PM");

        date.setUTCMinutes(0);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 00 PM");

        date.setUTCMinutes(9);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("09");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 09 PM");

        date.setUTCMinutes(10);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("10");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 10 PM");

        date.setUTCMinutes(11);
        showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("11");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 11 PM");

        date.setUTCMinutes(12);
        showTimeHelper(date, true, true);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("11");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 12 PM");

        date.setUTCMinutes(12);
        showTimeHelper(date, true, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("12");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 12 PM");

        date.setUTCHours(14);
        date.setUTCMinutes(13);
        showTimeHelper(date, false, true);
        expect($timePickerInput.find(".hour").val()).to.equal("02");
        expect($timePickerInput.find(".minute").val()).to.equal("12");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("02 : 13 PM");
    });

    it("inputTime should work", function() {
        var date = $timePicker.data("date");
        date.setUTCHours(23);
        date.setUTCMinutes(11);
        $timeInput.val("11 : 11 PM");

        var inputTime = Scheduler.__testOnly__.inputTime;
        var tests = [{
            "type": "minute",
            "val": -1,
            "expect": "11 : 11 PM"
        }, {
            "type": "minute",
            "val": "fdsajfldsa;jfdl;sa",
            "expect": "11 : 11 PM"
        }, {
            "type": "minute",
            "val": 0,
            "expect": "11 : 00 PM"
        }, {
            "type": "minute",
            "val": 1,
            "expect": "11 : 01 PM"
        }, {
            "type": "minute",
            "val": 59,
            "expect": "11 : 59 PM"
        }, {
            "type": "hour",
            "val": 60,
            "expect": "11 : 59 PM"
        }, {
            "type": "hour",
            "val": -1,
            "expect": "11 : 59 PM"
        }, {
            "type": "hour",
            "val": "fdsajfldsa;jfdl;sa",
            "expect": "11 : 59 PM"
        }, {
            "type": "hour",
            "val": 0,
            "expect": "11 : 59 PM"
        }, {
            "type": "hour",
            "val": 1,
            "expect": "01 : 59 PM"
        }, {
            "type": "hour",
            "val": 12,
            "expect": "12 : 59 PM"
        }, {
            "type": "hour",
            "val": 13,
            "expect": "12 : 59 PM"
        }, {
            "type": "hour",
            "val": 6.5,
            "expect": "12 : 59 PM"
        }, {
            "type": "hour",
            "val": null,
            "expect": "12 : 59 PM"
        }, {
            "type": "hour",
            "val": "",
            "expect": "12 : 59 PM"
        }];

        tests.forEach(function(test) {
            inputTime(test.type, test.val);
            expect($timeInput.val()).to.equal(test.expect);
        });

        type = "hour";
        val = 12;
        $scheduleDetail.find(".inputSection .ampm").text("AM");
        inputTime(type, val);
        expect($timeInput.val()).to.equal("12 : 59 AM");

        type = "day";
        try {
            inputTime(type, val);
        } catch (error) {
            throw "error case";
        }
        expect($timeInput.val()).to.equal("12 : 59 AM");
    });

    it("changeTime should work", function() {
        var date = $timePicker.data("date");
        date.setUTCHours(23);
        date.setUTCMinutes(11);
        $timeInput.val("11 : 11 PM");

        var tests = [{
            "type": "ampm",
            "isIncrease": true,
            "expect": "11 : 11 AM"
        }, {
            "type": "ampm",
            "isIncrease": true,
            "expect": "11 : 11 PM"
        }, {
            "type": "ampm",
            "isIncrease": true,
            "expect": "11 : 11 AM"
        }, {
            "type": "ampm",
            "isIncrease": true,
            "expect": "11 : 11 PM"
        }, {
            "type": "minute",
            "isIncrease": true,
            "expect": "11 : 12 PM"
        }, {
            "type": "minute",
            "isIncrease": false,
            "expect": "11 : 11 PM"
        }, {
            "type": "hour",
            "isIncrease": true,
            "expect": "12 : 11 PM"
        }, {
            "type": "hour",
            "isIncrease": false,
            "expect": "11 : 11 PM"
        }, {
            "type": "***",
            "isIncrease": false,
            "expect": "11 : 11 PM"
        }];

        tests.forEach(function(test) {
            Scheduler.__testOnly__.changeTime(test.type, test.isIncrease);
            expect($timeInput.val()).to.equal(test.expect);
        });
    });

    it("Should click time picker to change time", function() {
        var date = $timePicker.data("date");
        var $ampm = $timePicker.find(".btn.increase.ampm");

        date.setUTCHours(23);
        date.setUTCMinutes(11);
        $timeInput.val("11 : 11 PM");

        $ampm.click();
        expect($timeInput.val()).to.equal("11 : 11 AM");

        $ampm.click();
        expect($timeInput.val()).to.equal("11 : 11 PM");

        $ampm.click();
        expect($timeInput.val()).to.equal("11 : 11 AM");

        $ampm.click();
        expect($timeInput.val()).to.equal("11 : 11 PM");

        $timePicker.find(".btn.increase.minute").click();
        expect($timeInput.val()).to.equal("11 : 12 PM");

        $timePicker.find(".btn.decrease.minute").click();
        expect($timeInput.val()).to.equal("11 : 11 PM");

        $timePicker.find(".btn.increase.hour").click();
        expect($timeInput.val()).to.equal("12 : 11 PM");

        $timePicker.find(".btn.decrease.hour").click();
        expect($timeInput.val()).to.equal("11 : 11 PM");
    });

    it("Should input on time picker", function() {
        var date = $timePicker.data("date");
        var $minute = $timePicker.find("input.minute");
        var $hour = $timePicker.find("input.hour");

        date.setUTCHours(23);
        date.setUTCMinutes(11);
        $timeInput.val("11 : 11 PM");

        triggerInput($minute, -1);
        expect($timeInput.val()).to.equal("11 : 11 PM");

        triggerInput($minute, "fdsajfldsa;jfdl;sa");
        expect($timeInput.val()).to.equal("11 : 11 PM");

        triggerInput($minute, 0);
        expect($timeInput.val()).to.equal("11 : 00 PM");

        triggerInput($minute, 1);
        expect($timeInput.val()).to.equal("11 : 01 PM");

        triggerInput($minute, 59);
        expect($timeInput.val()).to.equal("11 : 59 PM");

        triggerInput($hour, 60);
        expect($timeInput.val()).to.equal("11 : 59 PM");

        triggerInput($hour, -1);
        expect($timeInput.val()).to.equal("11 : 59 PM");

        triggerInput($hour, "fdsajfldsa;jfdl;sa");
        expect($timeInput.val()).to.equal("11 : 59 PM");

        triggerInput($hour, 0);
        expect($timeInput.val()).to.equal("11 : 59 PM");

        triggerInput($hour, 1);
        expect($timeInput.val()).to.equal("01 : 59 PM");

        triggerInput($hour, 12);
        expect($timeInput.val()).to.equal("12 : 59 PM");

        triggerInput($hour, 13);
        expect($timeInput.val()).to.equal("12 : 59 PM");

        triggerInput($hour, 6.5);
        expect($timeInput.val()).to.equal("12 : 59 PM");

        triggerInput($hour, null);
        expect($timeInput.val()).to.equal("12 : 59 PM");

        triggerInput($hour, "");
        expect($timeInput.val()).to.equal("12 : 59 PM");

        $scheduleDetail.find(".inputSection .ampm").text("AM");
        triggerInput($hour, 12);
        expect($timeInput.val()).to.equal("12 : 59 AM");
    });

    function triggerInput($input, val) {
        $input.val(val).focus().trigger("input");
    }
}

function viewRelatedFunctionTest() {
    var oldGetRetinaFunc;
    var oldDeleteRetinaFunc;
    var dfName;
    var $scheduleDetail;
    var dateText;

    before(function() {
        $scheduleDetail = $("#scheduleDetail");
        dfName = "df1";
        Scheduler.hide();
        oldGetRetinaFunc = XcalarGetRetina;
        oldDeleteRetinaFunc = XcalarDeleteRetina;
        UnitTest.onMinMode();

        XcalarGetRetina = function() {
            var fakeRetInfo = {
                "retina": {
                    "retinaDag": {
                        "numNodes": 1,
                        "node": [{
                            "name": {"name": "test"},
                            "dagNodeId": "104399",
                            "api": 2,
                            "input": {
                                "loadInput": {
                                    "dataset": {
                                        "url": "test",
                                        "formatType": 0,
                                        "name": "test"
                                    }
                                }
                            }
                        }],
                    },
                    "retinaDesc": {
                        "retinaName": dfName
                    }
                }
            };
            return PromiseHelper.resolve(fakeRetInfo);
        };

        XcalarDeleteRetina = function() {
            return PromiseHelper.resolve();
        };

        DF.addDataflow(dfName, new Dataflow(dfName), null, {
            "isUpload": true,
            "noClick": true
        });

        var date = new Date();
        date.setUTCDate(date.getUTCDate() + 1);
        date.setUTCHours(23);
        date.setUTCMinutes(13);

        dateText = (date.getUTCMonth() + 1) + "/" +
                    date.getUTCDate() + "/" + date.getUTCFullYear();
        var timeText = "11 : 13 PM";
        DF.addScheduleToDataflow(dfName, {
            "startTime": date.getTime(), // The time to start the next run
            "dateText": dateText,
            "timeText": timeText,
            "repeat": "hourly",
            "modified": date.getTime(),
            "created": date.getTime()
        });
    });

    it("should show schedule form correctly", function() {
        Scheduler.show(dfName);
        assert.isTrue($scheduleDetail.is(":visible"));
    });

    it("should hide Schedule Form", function() {
        Scheduler.hide();
        assert.isFalse($scheduleDetail.is(":visible"));
    });

    it("Should show schedule detail view correctly", function() {
        Scheduler.show(dfName);
        var $scheduleInfos = $("#scheduleInfos");
        assert.isTrue($scheduleInfos.is(":visible"));

        if (!isBrowserMicrosoft) {
            assert.equal($scheduleInfos.find(".created .text").text(),
                    dateText + " 11:13 PM UTC");
            assert.equal($scheduleInfos.find(".modified .text").text(),
                    dateText + " 11:13 PM UTC");
        }
    });

    // it("Should toggle schedule detail Tabs", function() {
    //     var $tabArea = $("#scheduleDetail .tabArea");
    //     var $defaultTab = $tabArea.find(".default");
    //     var $dfgTab = $tabArea.find(".dfg");

    //     expect($defaultTab.hasClass("active")).to.be.true;
    //     assert.isTrue($("#scheduleSettings").is(":visible"));
    //     assert.isFalse($("#scheduleResults").is(":visible"));

    //     $dfgTab.click();
    //     expect($dfgTab.hasClass("active")).to.be.true;
    //     expect($defaultTab.hasClass("active")).to.be.false;
    //     assert.isFalse($("#scheduleSettings").is(":visible"));
    //     assert.isTrue($("#scheduleResults").is(":visible"));

    //     $defaultTab.click();

    // });

    // it("should delete schedule", function() {
    //     $("#modScheduleForm-delete").click();
    //     UnitTest.hasAlertWithTitle(SchedTStr.DelSched, {"confirm": true});
    //     assert.isFalse($scheduleDetail.is(":visible"));
    // });

    after(function() {

        XcalarGetRetina = oldGetRetinaFunc;
        XcalarDeleteRetina = oldDeleteRetinaFunc;
        UnitTest.offMinMode();
    });
}

function formSubmitTest() {
    // TODO need to test for valid parameterized export name
    it("unparamaterized export file name should show alert", function() {
        var dfObj = DF.getDataflow("df1");
        dfObj.retinaNodes[0].api = XcalarApisT.XcalarApiExport;
        dfObj.retinaNodes[0].input = {
            "exportInput": {meta: {
                specificInput: {
                    sfInput: {
                        fileName: "fakeFileName"
                    }
                }
            }}
        };
        $("#modScheduleForm-save").click();
        UnitTest.hasAlertWithText(SchedTStr.NoExportParam);
    });

    after(function() {
        DF.removeDataflow("df1");
    });
}