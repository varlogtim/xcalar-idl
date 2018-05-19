describe("Schedule related Test", function() {
    var oldRefresh;

    before(function(done) {
        // go to the tab;
        $("#dataflowTab").click();
        UnitTest.testFinish(function() {
            return $("#dfViz .cardMain").children().length !== 0;
        })
        .then(function() {
            oldRefresh = DF.refresh;
            // prevent others refresh it
            DF.refresh = function() {};
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    describe("Time related function Test", timeRelatedFunctionTest);
    describe("Schedule Event Test", scheduleEventTest);
    describe("View related function Test", viewRelatedFunctionTest);
    after(function() {
        DF.refresh = oldRefresh;
    });
});


function timeRelatedFunctionTest() {
    var $timeInput;
    var $timePicker;
    var $scheduleDetail;

    before(function() {
        $scheduleDetail = $("#scheduleDetail");
        $timeInput = $scheduleDetail.find(".timeSection .time");
        $timePicker = $scheduleDetail.find(".timePicker");
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
        // XXX comment it out because daylight time change affect the hours
        // expect(d.getHours() - previousTime.getHours()).to.equal(0);
        expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
        expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        options.startTime = previousTime.getTime();
        options.repeat = "biweekly";
        schedule = new SchedObj(options);
        currentTime = new Date();
        Scheduler.__testOnly__.getNextRunTime(schedule);
        d = new Date(schedule.startTime);
        expect((d.getTime() - currentTime)/(3600*24*1000)).to.within(0, 14);
        // XXX comment it out because daylight time change affect the hours
        // expect(((d.getTime() - previousTime)/(3600*24*1000)) % 14).to.equal(0);
        expect(d.getUTCHours() - previousTime.getUTCHours()).to.equal(0);
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

    // XXX TODO: move test to XcTimerPicker
    it("showTimeHelper should work", function() {
        var timePicker = Scheduler.getTimePicker();
        var $timePickerInput = $timePicker.find(".inputSection");
        var date = new Date();

        date.setUTCHours(0);
        date.setUTCMinutes(0);
        $timePicker.data("date", date);
        $timeInput.val("00 : 00 AM");

        date.setUTCHours(0);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("12");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("AM");
        expect($timeInput.val()).to.equal("12 : 00 AM");

        date.setUTCHours(11);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("11");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("AM");
        expect($timeInput.val()).to.equal("11 : 00 AM");

        date.setUTCHours(12);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("12");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("12 : 00 PM");

        date.setUTCHours(13);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 00 PM");

        date.setUTCMinutes(0);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("00");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 00 PM");

        date.setUTCMinutes(9);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("09");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 09 PM");

        date.setUTCMinutes(10);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("10");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 10 PM");

        date.setUTCMinutes(11);
        timePicker.showTimeHelper(date, false, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("11");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 11 PM");

        date.setUTCMinutes(12);
        timePicker.showTimeHelper(date, true, true);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("11");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 12 PM");

        date.setUTCMinutes(12);
        timePicker.showTimeHelper(date, true, false);
        expect($timePickerInput.find(".hour").val()).to.equal("01");
        expect($timePickerInput.find(".minute").val()).to.equal("12");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("01 : 12 PM");

        date.setUTCHours(14);
        date.setUTCMinutes(13);
        timePicker.showTimeHelper(date, false, true);
        expect($timePickerInput.find(".hour").val()).to.equal("02");
        expect($timePickerInput.find(".minute").val()).to.equal("12");
        expect($timePickerInput.find(".ampm").text()).to.equal("PM");
        expect($timeInput.val()).to.equal("02 : 13 PM");
    });

    // XXX TODO: move test to XcTimerPicker
    it("inputTime should work", function() {
        var date = $timePicker.data("date");
        date.setUTCHours(23);
        date.setUTCMinutes(11);
        $timeInput.val("11 : 11 PM");

        var timePicker = Scheduler.getTimePicker();
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
            timePicker.inputTime(test.type, test.val);
            expect($timeInput.val()).to.equal(test.expect);
        });

        type = "hour";
        val = 12;
        $scheduleDetail.find(".inputSection .ampm").text("AM");
        timePicker.inputTime(type, val);
        expect($timeInput.val()).to.equal("12 : 59 AM");

        type = "day";
        try {
            timePicker.inputTime(type, val);
        } catch (error) {
            throw "error case";
        }
        expect($timeInput.val()).to.equal("12 : 59 AM");
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

    it("Should test Date", function() {
        expect(Scheduler.__testOnly__.testDate("05/20/2017")).to.equal(true);
        expect(Scheduler.__testOnly__.testDate("02/29/2017")).to.equal(false);
        expect(Scheduler.__testOnly__.testDate("02/30/2017")).to.equal(false);
        expect(Scheduler.__testOnly__.testDate("22/29/2017")).to.equal(false);
        expect(Scheduler.__testOnly__.testDate("06/31/2017")).to.equal(false);
        expect(Scheduler.__testOnly__.testDate("")).to.equal(false);
        expect(Scheduler.__testOnly__.testDate("&&***/@")).to.equal(false);
    });

    it("Should simulate Cron String", function() {
        var res = Scheduler.__testOnly__.simulateCron("* * */1 * *");
        expect(res.isValid).to.equal(true);
        res = Scheduler.__testOnly__.simulateCron("A B C D E");
        expect(res.isValid).to.equal(false);
    });

    it("Should get parameter string", function() {
        var param1 = {};
        param1.paramName = "name1";
        param1.paramValue = "value1";
        var param2 = {};
        param2.paramName = "name2";
        param2.paramValue = "value2";
        var paramArray = [param1, param2];

        var res = Scheduler.__testOnly__.getParameterStr(paramArray);
        var expectedStr =
            '<div class="paramRow">' +
                '<span>name1</span>' +
                '<span>: </span>' +
                '<span>value1</span>' +
            '</div>' +
            '<div class="paramRow">' +
                '<span>name2</span>' +
                '<span>: </span>' +
                '<span>value2</span>' +
            '</div>';
        expect(res).to.be.an("object");
        expect(res.systemParameterStr).to.equal(SchedTStr.noParam);
        expect(res.customizedParameterStr).to.equal(expectedStr);
    });

    function triggerInput($input, val) {
        $input.val(val).focus().trigger("input");
    }
}

function scheduleEventTest() {
    var $scheduleDetail;
    var $historySection;
    var $detailsSection;
    var dfName;

    before(function() {
        $scheduleDetail = $("#scheduleDetail");
        $historySection = $("#scheduleTable .historySection");
        $detailsSection = $("#scheduleTable .detailsSection");
        dfName = xcHelper.randName("testSchedule");
        Scheduler.show(dfName);
    });

    it("should cancel form", function() {
        $scheduleDetail.removeClass("withoutSchedule")
                           .addClass("withSchedule");
        $("#modScheduleForm-cancel").click();
        expect($scheduleDetail.hasClass("withSchedule")).to.be.false;
        expect($scheduleDetail.hasClass("withoutSchedule")).to.be.true;
    });

    it("should refresh loading scheulde should have not result", function() {
        var $scheduleResults = $("#scheduleResults");
        $scheduleResults.addClass("loading");
        $scheduleResults.data("df", dfName);
        $("#modScheduleForm-refresh").click();
        expect($historySection.html()).to.contains(SchedTStr.Notrun);
        $scheduleResults.removeClass("loading");
        $scheduleResults.removeData("df");
    });

    it("should click to pause schedule", function(done) {
        var oldGet = DF.getSchedule;
        var oldList = XcalarListSchedules;
        var oldResume = XcalarResumeSched;
        var oldSuccess = xcHelper.showSuccess;
        var test = false;

        xcHelper.showSuccess = function() {
            test = true;
        };

        DF.getSchedule = function() {
            return {"isPaused": true};
        };

        XcalarListSchedules = function() {
            return PromiseHelper.resolve([{
                "scheduleMain": {
                    "options": {
                        "isPaused": true
                    },
                    "timingInfo": {
                        "startTime": 123
                    }
                }
            }]);
        };

        XcalarPauseSched = function() {
            return PromiseHelper.resolve();
        };

        $("#modScheduleForm-pause").click();

        UnitTest.testFinish(function() { return test === true; })
        .then(function() {
            expect($scheduleDetail.hasClass("pauseState")).to.be.true;
            $scheduleDetail.removeClass("pauseState");
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            xcHelper.showSuccess = oldSuccess;
            XcalarPauseSched = oldResume;
            XcalarListSchedules = oldList;
            DF.getSchedule = oldGet;
        });
    });

    it("should click to resume schedule", function(done) {
        var oldGet = DF.getSchedule;
        var oldList = XcalarListSchedules;
        var oldResume = XcalarResumeSched;
        var oldSuccess = xcHelper.showSuccess;
        var test = false;

        xcHelper.showSuccess = function() {
            test = true;
        };

        DF.getSchedule = function() {
            return {};
        };

        XcalarListSchedules = function() {
            return PromiseHelper.resolve([{
                "scheduleMain": {
                    "options": {
                        "isPaused": true
                    },
                    "timingInfo": {
                        "startTime": 123
                    }
                }
            }]);
        };

        XcalarResumeSched = function() {
            return PromiseHelper.resolve();
        };

        $scheduleDetail.addClass("pauseState");
        $("#modScheduleForm-resume").click();

        UnitTest.testFinish(function() { return test === true; })
        .then(function() {
            expect($scheduleDetail.hasClass("pauseState")).to.be.false;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            xcHelper.showSuccess = oldSuccess;
            XcalarResumeSched = oldResume;
            XcalarListSchedules = oldList;
            DF.getSchedule = oldGet;
        });
    });

    it("should click to switch tab", function() {
        var $tab = $scheduleDetail.find(".tab.default");
        $tab.removeClass("active");
        $tab.click();
        expect($tab.hasClass("active")).to.be.true;
        // click again has no use
        $tab.click();
        expect($tab.hasClass("active")).to.be.true;
    });

    it("should click historySection to view detail", function() {
        $historySection.html('<div class="row"></div>');
        $detailsSection.html('<div class="record"></div>');
        var $row = $historySection.find(".row").eq(0);
        $row.click();
        expect($row.hasClass("chosen")).to.be.true;
        expect($detailsSection.find(".record").eq(0).hasClass("chosen"))
        .to.be.true;
    });

    after(function() {
        $historySection.html("");
        $detailsSection.html("");
        Scheduler.hide();
    });
}

function viewRelatedFunctionTest() {
    var oldGetRetinaFunc;
    var oldDeleteRetinaFunc;
    var dfName;
    var $scheduleDetail;
    var dateText;

    before(function(done) {
        $scheduleDetail = $("#scheduleDetail");
        dfName = "df1";
        Scheduler.hide();
        oldGetRetinaFunc = XcalarGetRetina;
        oldGetRetinaFunc2 = XcalarGetRetinaJson;
        oldDeleteRetinaFunc = XcalarDeleteRetina;
        UnitTest.onMinMode();

        XcalarGetRetina = function() {
            var fakeRetInfo = {
                "retina": {
                    "retinaDag": {
                        "numNodes": 3,
                        "node": [
                            {
                                "api": 33,
                                "comment": "",
                                "dagNodeId": "428",
                                "input": {
                                    "exportInput": {
                                        "dest": ".XcalarLRQExport.test2",
                                        "source": "test2"
                                    }
                                },
                                "name": {name: "export-test2.csv"},
                                "numNodes": 1,
                                "numParent": 1
                            },
                            {
                                "api": 3,
                                "comment": "",
                                "dagNodeId": "427",
                                "input": {
                                    "indexInput": {
                                        "dest": "test2",
                                        "source": "test1",
                                        "key": [{
                                            "keyFieldName": "test2-xcalarRecordNum",
                                            "name": "xcalarRecordNum",
                                            "ordering": "Unordered",
                                            "type": "DfInt64"
                                        }]
                                    }
                                },
                                "name": {name: "test2"},
                                "numNodes": 1,
                                "numParent": 1
                            },
                            {
                                "api": 2,
                                "comment": "",
                                "dagNodeId": "426",
                                "input": {
                                    "loadInput": {
                                        "dagNodeId": "418",
                                        "dest": "test1",
                                        "loadArgs": {
                                            "sourceArgs": {
                                                "fileNamePattern": "",
                                                "path": "/netstore/datasets/unittest/test_yelp.json",
                                                "recursive": false,
                                                "targetName": "Default Shared Root"
                                            },
                                            "parseArgs": {
                                                "parserArgJson": "{}",
                                                "parserFnName": "default:parseJson"
                                            }
                                        }
                                    }
                                },
                                "name": {name: "test1"},
                                "numNodes": 1,
                                "numParent": 0
                            }
                        ],
                    },
                    "retinaDesc": {
                        "retinaName": dfName
                    }
                }
            }
            return PromiseHelper.resolve(fakeRetInfo);
        };

         XcalarGetRetinaJson = function() {
            var fakeRetInfo = {
                "query": [
                            {
                                "operation":"XcalarApiExport",
                                "comment": "",
                                "dagNodeId": "428",
                                "args": {
                                    "dest": ".XcalarLRQExport.test2",
                                    "source": "test2"
                                }
                            },
                            {
                                "operation":"XcalarApiIndex",
                                "comment": "",
                                "dagNodeId": "427",
                                "args": {
                                    "dest": "test2",
                                    "source": "test1",
                                    "key": [{
                                        "keyFieldName": "test2-xcalarRecordNum",
                                        "name": "xcalarRecordNum",
                                        "ordering": "Unordered",
                                        "type": "DfInt64"
                                    }]
                                }
                            },
                            {
                                "operation":"XcalarApiBulkLoad",
                                "comment": "",
                                "dagNodeId": "426",
                                "args": {
                                        "dagNodeId": "418",
                                        "dest": "test1",
                                        "loadArgs": {
                                            "sourceArgs": {
                                                "fileNamePattern": "",
                                                "path": "/netstore/datasets/unittest/test_yelp.json",
                                                "recursive": false,
                                                "targetName": "Default Shared Root"
                                            },
                                            "parseArgs": {
                                                "parserArgJson": "{}",
                                                "parserFnName": "default:parseJson"
                                            }
                                        }
                                    }
                            }
                        ]
            }
            return PromiseHelper.resolve(fakeRetInfo);
        };

        XcalarDeleteRetina = function() {
            return PromiseHelper.resolve();
        };

        DF.addDataflow(dfName, new Dataflow(dfName), null, [], {
            "isUpload": true,
            "noClick": true
        })
        .then(function() {
            var date = new Date();
            date.setUTCDate(date.getUTCDate() + 1);
            date.setUTCHours(23);
            date.setUTCMinutes(13);

            dateText = (date.getUTCMonth() + 1) + "/" +
                        date.getUTCDate() + "/" + date.getUTCFullYear();
            var timeText = "11 : 13 PM";
            return DF.addScheduleToDataflow(dfName, {
                "startTime": date.getTime(), // The time to start the next run
                "dateText": dateText,
                "timeText": timeText,
                "repeat": "hourly",
                "modified": date.getTime(),
                "created": date.getTime()
            });
        })
        .then(function() {
            done();
        })
        .fail(function() {
            done("fail");
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

    it("should show schedule detail view correctly", function() {
        Scheduler.show(dfName);
        var $scheduleInfos = $("#scheduleInfos");
        assert.isTrue($scheduleInfos.is(":visible"));
        expect($("#scheduleDetail .tab.detail").hasClass("active"))
        .to.be.true;
        $("#scheduleDetail .tab.default").click();
        if (!isBrowserMicrosoft) {
            assert.equal($scheduleInfos.find(".created .text").text(),
                    dateText + " 11:13 PM UTC");
            assert.equal($scheduleInfos.find(".modified .text").text(),
                    dateText + " 11:13 PM UTC");
        }
    });

    it("unparamaterized export file name should show alert", function() {
        var dfObj = DF.getDataflow("df1");
        dfObj.retinaNodes[".XcalarLRQExport.test2"].type = "XcalarApiExport";
        dfObj.retinaNodes[".XcalarLRQExport.test2"].args = {
                fileName: "fakeFileName",
                targetName: "Default"
        };
        $("#modScheduleForm-save").click();
        UnitTest.hasAlertWithText(SchedTStr.NoExportParam);
        $("#alertModal .confirm").click();
    });

    it("should show schedule result if scheulde is loading", function(done) {
        var $scheduleResults = $("#scheduleResults");
        $scheduleResults.addClass("loading");
        $scheduleResults.data("df", dfName);
        $("#scheduleTable .historySection").html("");

        Scheduler.__testOnly__.showScheduleResult()
        .then(function() {
            var html = $("#scheduleTable .historySection").html();
            expect(html).to.be.empty;
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            $scheduleResults.removeClass("loading");
            $scheduleResults.removeData("df");
        });
    });

    it("should show fail case for schedule result", function(done) {
        var oldList = XcalarListSchedules;
        XcalarListSchedules = function() {
            return PromiseHelper.reject("test");
        };

        Scheduler.__testOnly__.showScheduleResult()
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            var html = $("#scheduleTable .historySection").html();
            expect(html).contains(SchedTStr.ListSchedFail);
            expect(error).to.equal("test");
            done();
        })
        .always(function() {
            XcalarListSchedules = oldList;
        });
    });

    it("should show schedule result correctly", function(done) {
        var oldList = XcalarListSchedules;
        XcalarListSchedules = function() {
            return PromiseHelper.resolve([null]);
        };

        Scheduler.__testOnly__.showScheduleResult()
        .then(function() {
            var html = $("#scheduleTable .historySection").html();
            expect(html).contains(SchedTStr.Notrun);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarListSchedules = oldList;
        });
    });

    it("should handle remove fail case", function(done) {
        var oldRemove = DF.removeScheduleFromDataflow;
        DF.removeScheduleFromDataflow = function() {
            return PromiseHelper.reject("test");
        };

        $scheduleDetail.addClass("locked");
        Scheduler.__testOnly__.removeSchedule(dfName)
        .then(function() {
            done("fail");
        })
        .fail(function(error) {
            expect(error).to.equal("test");
            expect($scheduleDetail.hasClass("locked")).to.be.false;
            done();
        })
        .always(function() {
            DF.removeScheduleFromDataflow = oldRemove;
        });
    });

    it("should delete schedule correctly", function(done) {
        expect(DF.getSchedule(dfName)).to.not.equal(null);
        expect($("#alertModal:visible").length).to.equal(0);
        $("#modScheduleForm-delete").click();
        expect($("#alertModal:visible").length).to.not.equal(0);
        $("#alertModal .cancel").click();
        Scheduler.__testOnly__.removeSchedule(dfName)
        .then(function() {
            expect(DF.getSchedule(dfName)).to.equal(null);
            done();
        })
        .fail(function() {
            done("fail");
        });
    });

    it("should show correct date", function() {
        Scheduler.show(dfName);
        $dateInput = $('#modifyScheduleForm').find(".timeSection .date");
        expect($dateInput.val()).to.equal("");
        $('#modifyScheduleForm').find(".datePickerPart").datepicker('show');
        var date = new Date();
        var str = (date.getUTCMonth() + 1) + "/" + date.getUTCDate()
                  + "/" + date.getUTCFullYear();
        expect($dateInput.val()).to.equal(str);
    });

    it("should check incorrect date", function(done) {
        Scheduler.show(dfName);
        $dateInput = $('#modifyScheduleForm').find(".timeSection .date");
        expect($dateInput.val()).to.equal("");
        $('#modifyScheduleForm').find(".datePickerPart").datepicker('show');
        $dateInput.val("88/88/8888");
        $dateInput.focusout();
        expect($("#statusBox:visible").length).to.not.equal(0);
        $('#scheduleDetail .advancedModeTab').click();
        setTimeout(function(){
            // expect($("#statusBox:visible").length).to.equal(0);
            $dateInput.val("");
            $dateInput.focusout();
            done();
        }, 1000);
    });

    it("should show correct time", function() {
        Scheduler.show(dfName);
        $timeInput = $('#modifyScheduleForm').find(".timeSection .time");
        expect($timeInput.val()).to.equal("");
        $timeInput.focus();
        var date = new Date();
        date.setMinutes(date.getMinutes() + 1);
        var hours = date.getUTCHours();
        var minutes = date.getUTCMinutes();
        var ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        var timeStr = hours + " : " + minutes + " " + ampm;
        expect($timeInput.focus().val()).to.equal(timeStr);
        // expect($("#statusBox:visible").length).to.equal(0);
        $('#modifyScheduleForm input.hour').val(12345);
        $('#modifyScheduleForm input.hour').focusout();
        // expect($("#statusBox:visible").length).to.not.equal(0);
        $('#modifyScheduleForm input.hour').val(05);
        $('#modifyScheduleForm input.minute').val(12345);
        $('#modifyScheduleForm input.minute').focusout();
        // expect($("#statusBox:visible").length).to.not.equal(0);
        $('#modifyScheduleForm input.hour').val("01");
        $('#modifyScheduleForm input.minute').val("01");
        $('#statusBox').click();
        $timeInput.focus();
        $timeInput.focusout();
        $(document).trigger("mousedown");
    });

    it("should close schedule detail", function() {
        Scheduler.show(dfName);
        expect($("#modifyScheduleForm:visible").length).to.not.equal(0);
        $scheduleDetail.find(".close").click();
        expect($("#modifyScheduleForm:visible").length).to.equal(0);
    });

    it("should validate cron", function() {
        Scheduler.show(dfName);
        $("#scheduleDetail .advancedModeTab").click();
        $("#cronScheduler").val("* * * * *");
        var res = Scheduler.__testOnly__.validateCron(false);
        expect(res).equal("* * * * *");
        $("#cronScheduler").val("ABCDE");
        res = Scheduler.__testOnly__.validateCron(false);
        expect(res).equal(null);
        expect($("#statusBox:visible").length).to.equal(0);
        res = Scheduler.__testOnly__.validateCron(true);
        expect($("#statusBox:visible").length).to.not.equal(0);
        $("#cronScheduler").val("");
        Scheduler.__testOnly__.validateCron(false);
    });

    it("should update schedule", function(done) {
        var fakeSchedule = {};
        var oldGet = DF.getSchedule;
        var oldList = XcalarListSchedules;

        DF.getSchedule = function() {
            return fakeSchedule;
        };
        XcalarListSchedules = function() {
            return PromiseHelper.resolve([{
                "scheduleMain": {
                    "options": {
                        "isPaused": true
                    },
                    "timingInfo": {
                        "startTime": 123
                    }
                }
            }]);
        };

        Scheduler.__testOnly__.updateSchedule()
        .then(function() {
            expect(fakeSchedule.isPaused).to.be.true;
            expect(fakeSchedule.startTime).to.equal(123);
            done();
        })
        .fail(function() {
            done("fail");
        })
        .always(function() {
            XcalarListSchedules = oldList;
            DF.getSchedule = oldGet;
        });
    });

    it("should check invalid name in saving schedule", function() {
        expect(DF.getSchedule(dfName)).to.equal(null);
        $("#modScheduleForm-save").click();
        UnitTest.hasStatusBoxWithError(ErrTStr.NoEmpty);
    });

    it("should get one record html", function() {
        var res = Scheduler.__testOnly__.getOneRecordHtml({
            startTime: Date.now() ,
            endTime: Date.now() + 10000,
            exportTarget: "target",
            exportLocation: "location"
        });
        expect(res.info.indexOf(">target")).to.be.gt(-1);
    });

    it("should get icon", function() {
        var cache = DFCard.getDFListItem;
        var called = false;
        DFCard.getDFListItem = function() {
            called = true;
            return $();
        }
        Scheduler.__testOnly__.existScheduleIcon("test");
        expect(called).to.be.true;
        DFCard.getDFListItem = cache;
    });

    it ("dataPickerUTCDisplay", function() {
        var date = new Date("1/1/2000");
        Scheduler.__testOnly__.dataPickerUTCDisplay(date);
        expect($(".ui-datepicker-today").prev().hasClass("ui-state-disabled")).to.be.true;
    });

    it("getparamstring", function() {
        var res = Scheduler.__testOnly__.getParameterStr([{
            paramName: "N",
            paramValue: "testVal"
        }]);
        expect(res.systemParameterStr.indexOf(">N")).to.be.gt(-1);
    });

    after(function(done) {
        XcalarGetRetina = oldGetRetinaFunc;
        XcalarGetRetinaJson = oldGetRetinaFunc2;
        XcalarDeleteRetina = oldDeleteRetinaFunc;
        UnitTest.offMinMode();
        StatusBox.forceHide();
        DF.removeDataflow("df1")
        .always(function() {
            Scheduler.hide();
            done();
        });
    });
}
