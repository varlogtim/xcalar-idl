describe('Time related function Test', function() {
        $dfgView = $("#dataflowView");
        $scheduleDetail = $("#scheduleDetail");
        $newScheduleForm = $("#newScheduleForm");
        $modScheduleForm = $('#modifyScheduleForm');
        $newTimePicker = $("#newScheduler-timePicker");
        $modTimePicker = $("#modScheduler-timePicker");

        $newStartdate = $newScheduleForm.find('.date');
        $newStartTime = $newScheduleForm.find('.time');

        it('Should get next Run time', function() {
            var futureTime = new Date();
            var previousTime = new Date();

            previousTime.setDate(previousTime.getDate() - 1);
            futureTime.setDate(futureTime.getDate() + 1);

            var options = {
                "startTime": futureTime, // The time to start the next run
                "dateText": "11/08/2016",
                "timeText": "11 : 13 PM",
                "repeat": "hourly",
                "freq": 5,
                "recur": 10
            }

            // StartTime at the future, nothing has been changed
            var schedule = new SchedObj(options);
            Scheduler.__testOnly__.getNextRunTime(schedule);
            expect(schedule.startTime).to.equal(futureTime);

            // StartTime at previous, need to figure out the start time for
            // next running
            options.startTime = previousTime.getTime();
            options.repeat = "minute";
            var schedule = new SchedObj(options);
            var currentTime = new Date();
            Scheduler.__testOnly__.getNextRunTime(schedule);
            var d = new Date(schedule.startTime);
            expect(d.getMinutes() - currentTime.getMinutes()).to.within(0, 1);
            expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

            options.startTime = previousTime.getTime();
            options.repeat = "hourly";
            var schedule = new SchedObj(options);
            var currentTime = new Date();
            Scheduler.__testOnly__.getNextRunTime(schedule);
            var d = new Date(schedule.startTime);
            expect(d.getHours() - currentTime.getHours()).to.within(0, 1);
            expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
            expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

            options.startTime = previousTime.getTime();
            options.repeat = "daily";
            var schedule = new SchedObj(options);
            var currentTime = new Date();
            Scheduler.__testOnly__.getNextRunTime(schedule);
            var d = new Date(schedule.startTime);
            expect(d.getDate() - currentTime.getDate()).to.within(0, 1);
            expect(d.getHours() - previousTime.getHours()).to.equal(0);
            expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
            expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

            options.startTime = previousTime.getTime();
            options.repeat = "weekly";
            var schedule = new SchedObj(options);
            var currentTime = new Date();
            Scheduler.__testOnly__.getNextRunTime(schedule);
            var d = new Date(schedule.startTime);
            expect(d.getDate() - currentTime.getDate()).to.within(0, 7);
            expect((d.getDate() - previousTime.getDate()) % 7).to.equal(0);
            expect(d.getHours() - previousTime.getHours()).to.equal(0);
            expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
            expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

            options.startTime = previousTime.getTime();
            options.repeat = "biweekly";
            var schedule = new SchedObj(options);
            var currentTime = new Date();
            Scheduler.__testOnly__.getNextRunTime(schedule);
            var d = new Date(schedule.startTime);
            expect(d.getDate() - currentTime.getDate()).to.within(0, 14);
            expect((d.getDate() - previousTime.getDate()) % 14).to.equal(0);
            expect(d.getHours() - previousTime.getHours()).to.equal(0);
            expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
            expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

            options.startTime = previousTime.getTime();
            options.repeat = "monthly";
            var schedule = new SchedObj(options);
            var currentTime = new Date();
            Scheduler.__testOnly__.getNextRunTime(schedule);
            var d = new Date(schedule.startTime);
            expect(d.getMonth() - currentTime.getMonth()).to.within(0, 1);
            expect(d.getDate() - previousTime.getDate()).to.equal(0);
            expect(d.getHours() - previousTime.getHours()).to.equal(0);
            expect(d.getMinutes() - previousTime.getMinutes()).to.equal(0);
            expect(d.getSeconds() - previousTime.getSeconds()).to.equal(0);

        });

        it('Should get repeat period', function() {
            var date = new Date();
            var options = {
                "startTime": date.getTime(),
                "dateText": "11/08/2016",
                "timeText": "11 : 13 PM",
                "repeat": "minute",
                "freq": 5,
                "recur": 10
            }

            // StartTime at the future, nothing has been changed
            var schedule = new SchedObj(options);
            var period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
            expect(period).to.equal(60);

            options.repeat = "hourly";
            var schedule = new SchedObj(options);
            var period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
            expect(period).to.equal(3600);

            options.repeat = "daily";
            var schedule = new SchedObj(options);
            var period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
            expect(period).to.equal(24 * 3600);

            options.repeat = "weekly";
            var schedule = new SchedObj(options);
            var period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
            expect(period).to.equal(7 * 24 * 3600);

            options.repeat = "biweekly";
            var schedule = new SchedObj(options);
            var period = Scheduler.__testOnly__.getRepeatPeriod(schedule);
            expect(period).to.equal(14 * 24 * 3600);

        });

        it('Should show Time Helper', function() {
            $newScheduleTime = $newScheduleForm.find(".timeSection .time");
            $inputSection = $newScheduleForm.find(".timePicker .inputSection");
            var date = new Date();
            date.setHours(0);
            date.setMinutes(0);
            $newScheduleTime.data("date", date);
            $newScheduleTime.val("00 : 00 AM");

            date.setHours(0);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("12");
            expect($inputSection.find(".minute").val()).to.equal("00");
            expect($inputSection.find(".ampm").text()).to.equal("AM");
            expect($newScheduleTime.val()).to.equal("12 : 00 AM");

            date.setHours(11);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("11");
            expect($inputSection.find(".minute").val()).to.equal("00");
            expect($inputSection.find(".ampm").text()).to.equal("AM");
            expect($newScheduleTime.val()).to.equal("11 : 00 AM");

            date.setHours(12);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("12");
            expect($inputSection.find(".minute").val()).to.equal("00");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("12 : 00 PM");

            date.setHours(13);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("01");
            expect($inputSection.find(".minute").val()).to.equal("00");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("01 : 00 PM");

            date.setMinutes(0);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("01");
            expect($inputSection.find(".minute").val()).to.equal("00");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("01 : 00 PM");

            date.setMinutes(9);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("01");
            expect($inputSection.find(".minute").val()).to.equal("09");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("01 : 09 PM");

            date.setMinutes(10);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("01");
            expect($inputSection.find(".minute").val()).to.equal("10");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("01 : 10 PM");

            date.setMinutes(11);
            Scheduler.__testOnly__.showTimeHelper(date, false, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("01");
            expect($inputSection.find(".minute").val()).to.equal("11");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("01 : 11 PM");

            date.setMinutes(12);
            Scheduler.__testOnly__.showTimeHelper(date, true, true, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("01");
            expect($inputSection.find(".minute").val()).to.equal("11");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("01 : 12 PM");

            date.setMinutes(12);
            Scheduler.__testOnly__.showTimeHelper(date, true, false, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("01");
            expect($inputSection.find(".minute").val()).to.equal("12");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("01 : 12 PM");

            date.setHours(14);
            date.setMinutes(13);
            Scheduler.__testOnly__.showTimeHelper(date, false, true, $newScheduleForm);
            expect($inputSection.find(".hour").val()).to.equal("02");
            expect($inputSection.find(".minute").val()).to.equal("12");
            expect($inputSection.find(".ampm").text()).to.equal("PM");
            expect($newScheduleTime.val()).to.equal("02 : 13 PM");
        });

        it('Should be able to input time', function() {
            $newScheduleTime = $newScheduleForm.find(".timeSection .time");
            var date = $newScheduleTime.data("date");
            date.setHours(23);
            date.setMinutes(11);
            $newScheduleTime.val("11 : 11 PM");

            var type = "minute";
            var val = -1;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 11 PM");

            var type = "minute";
            var val = "fdsajfldsa;jfdl;sa";
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 11 PM");

            var type = "minute";
            var val = 0;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 00 PM");

            var type = "minute";
            var val = 1;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 01 PM");

            var type = "minute";
            var val = 59;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 59 PM");

            var type = "hour";
            var val = 60;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 59 PM");

            var type = "hour";
            var val = -1;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 59 PM");

            var type = "hour";
            var val = "fdsajfldsa;jfdl;sa";
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 59 PM");

            var type = "hour";
            var val = 0;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 59 PM");

            var type = "hour";
            var val = 1;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("01 : 59 PM");

            var type = "hour";
            var val = 12;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("12 : 59 PM");

            var type = "hour";
            var val = 13;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("12 : 59 PM");

            var type = "hour";
            var val = 6.5;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("12 : 59 PM");

            var type = "hour";
            var val = null;
            Scheduler.__testOnly__.inputTime(type, val, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("12 : 59 PM");
        });

        it('Should be able to change time', function() {
            $newScheduleTime = $newScheduleForm.find(".timeSection .time");
            var date = $newScheduleTime.data("date");
            date.setHours(23);
            date.setMinutes(11);
            $newScheduleTime.val("11 : 11 PM");

            var type = "ampm";
            Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 11 AM");

            var type = "ampm";
            Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 11 PM");

            var type = "minute";
            Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 12 PM");

            var type = "minute";
            Scheduler.__testOnly__.changeTime(type, false, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 11 PM");

            var type = "hour";
            Scheduler.__testOnly__.changeTime(type, true, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("12 : 11 PM");

            var type = "hour";
            Scheduler.__testOnly__.changeTime(type, false, $newScheduleForm);
            expect($newScheduleTime.val()).to.equal("11 : 11 PM");
        });

});

describe('View related function Test', function() {
    $dfgView = $("#dataflowView");
    $scheduleDetail = $("#scheduleDetail");
    $newScheduleForm = $("#newScheduleForm");
    $modScheduleForm = $('#modifyScheduleForm');
    $tab = $('#dataflowTab');


    it('Should show new schedule form correctly', function() {
        $tab.click();
        $newScheduleForm.show();
        Scheduler.showNewScheduleFormView();
        assert.isTrue($newScheduleForm.is(":visible"));
    });

    it('Should show schedule detail view correctly', function() {
        $newScheduleTime = $newScheduleForm.find(".timeSection .time");
        $inputSection = $newScheduleForm.find(".timePicker .inputSection");
        var date = new Date("11/11/2016");
        date.setHours(23);
        date.setMinutes(13);
        var options = {
            "startTime": date.getTime(), // The time to start the next run
            "dateText": "11/11/2016",
            "timeText": "11 : 13 PM",
            "repeat": "hourly",
            "recur": 10,
            "modified": date.getTime(),
            "created": date.getTime()
        }
        DF.addDataflow("df1", new Dataflow("df1"),
                       {"isUpload": true,
                        "noClick" : true});
        DF.addScheduleToDataflow("df1", options);
        Scheduler.setDataFlowName("df1");
        Scheduler.showScheduleDetailView();
        assert.isTrue($scheduleDetail.is(":visible"));
        assert.isTrue($modScheduleForm.is(":visible"));

        var $scheduleInfos = $("#scheduleInfos");
        assert.equal($scheduleInfos.find(".created .text").text(), "11/11/2016 11:13 PM");
        assert.equal($scheduleInfos.find(".modified .text").text(), "11/11/2016 11:13 PM");
        assert.equal($scheduleInfos.find(".frequency .text").text(), "hourly");
        assert.equal($scheduleInfos.find(".recur .text").text(), "10");
        assert.equal($scheduleInfos.find(".lastRunInfo .text").text(), "N/A");

    });

    it('Should hide Schedule Detail View correctly', function() {
        Scheduler.hideScheduleDetailView();
        assert.isFalse($scheduleDetail.is(":visible"));
    });

    it('Should hide New Schedule Form', function() {
        Scheduler.hideNewScheduleFormView();
        assert.isFalse($newScheduleForm.is(":visible"));
    });

    it('Should reset create New Schedule Form', function() {
        Scheduler.__testOnly__.resetCreateNewScheduleForm();
        assert.isFalse($newScheduleForm.is(":visible"));
        var $timeSection = $newScheduleForm.find(".timeSection");
        var $freqSection = $newScheduleForm.find(".frequencySection");
        var $checkBox = $newScheduleForm.find(".radioButton").eq(0);
        var $recurInput = $newScheduleForm.find(".recurSection input");

        assert.equal($timeSection.find(".date").val(), "");
        assert.equal($timeSection.find(".time").val(), "");
        assert.equal($recurInput.val(), "");
    });

    it('Should reset Modified Schedule Form', function() {
        $modScheduleTime = $modScheduleForm.find(".timeSection .time");
        $inputSection = $modScheduleForm.find(".timePicker .inputSection");
        var date = new Date("11/11/2016");
        date.setHours(23);
        date.setMinutes(13);
        var options = {
            "startTime": date.getTime(), // The time to start the next run
            "dateText": "11/11/2016",
            "timeText": "11 : 13 PM",
            "repeat": "hourly",
            "recur": 10,
            "modified": date.getTime(),
            "created": date.getTime()
        }
        DF.addDataflow("df1", new Dataflow("df1"),
                       {"isUpload": true,
                        "noClick" : true});
        DF.addScheduleToDataflow("df1", options);
        Scheduler.setDataFlowName("df1");

        var $timeSection = $modScheduleForm.find(".timeSection");
        var $freqSection = $modScheduleForm.find(".frequencySection");
        var $recurInput = $modScheduleForm.find(".recurSection input");

        assert.equal($timeSection.find(".date").val(),"11/11/2016");
        assert.equal($timeSection.find(".time").val(),"11 : 13 PM");
        assert.equal($recurInput.val(), 10);

        date = new Date("14/11/2016");
        date.setHours(2);
        date.setMinutes(22);
        var options2 = {
            "startTime": date.getTime(), // The time to start the next run
            "dateText": "11/14/2016",
            "timeText": "02 : 22 PM",
            "repeat": "hourly",
            "recur": 4,
            "modified": date.getTime(),
            "created": date.getTime()
        }
        var schedule = new SchedObj(options2);
        Scheduler.__testOnly__.resetModifiedScheduleForm(schedule);

        assert.equal($timeSection.find(".date").val(),"11/14/2016");
        assert.equal($timeSection.find(".time").val(),"02 : 22 PM");
        assert.equal($recurInput.val(), 4);
    });

    it('Should save schedule form', function() {
        var $scheduleDate  = $newScheduleForm.find(".timeSection .date");
        var $scheduleTime  = $newScheduleForm.find(".timeSection .time");
        var $freqSection = $newScheduleForm.find(".frequencySection");
        var $scheduleRecur = $newScheduleForm.find(".recurSection input");

        var date = new Date("12/12/2016");
        date.setHours(12);
        date.setMinutes(12);
        $scheduleRecur.val(13);
        $scheduleDate.val("12/12/2016");
        $scheduleTime.val("12 : 12 PM");
        $scheduleTime.data("date", date);
        $freqSection.find('.radioButton[data-option=biweekly]').click();
        DF.addDataflow("df2", new Dataflow("df2"),
                       {"isUpload": true,
                        "noClick" : true});
        Scheduler.__testOnly__.saveScheduleForm($newScheduleForm, "df2");
        var dataflow = DF.getDataflow("df2");
        expect(dataflow.schedule.startTime).to.equal(date.getTime());
        expect(dataflow.schedule.dateText).to.equal("12/12/2016");
        expect(dataflow.schedule.timeText).to.equal("12 : 12 PM");
        expect(dataflow.schedule.repeat).to.equal("biweekly");
        expect(dataflow.schedule.recur).to.equal(13);
    });

    it('Should fill in schedule detail', function() {
        var date = new Date("1/23/2017");
        date.setHours(20);
        date.setMinutes(30);
        var options = {
            "startTime": date.getTime(), // The time to start the next run
            "dateText": "1/23/2017",
            "timeText": "08 : 30 PM",
            "repeat": "monthly",
            "recur": 7,
            "modified": date.getTime(),
            "created": date.getTime()
        }
        var schedule = new SchedObj(options);
        Scheduler.__testOnly__.fillInScheduleDetail(schedule);
        var $scheduleInfos = $("#scheduleInfos");
        assert.equal($scheduleInfos.find(".created .text").text(), "1/23/2017 8:30 PM");
        assert.equal($scheduleInfos.find(".modified .text").text(), "1/23/2017 8:30 PM");
        assert.equal($scheduleInfos.find(".frequency .text").text(), "monthly");
        assert.equal($scheduleInfos.find(".recur .text").text(), "7");
        assert.equal($scheduleInfos.find(".lastRunInfo .text").text(), "N/A");
    });

    it('Should toggle schedule detail Tabs', function() {
        var $scheduleInfos = $('#scheduleInfos');
        var $defaultTab = $scheduleInfos.find('.default');
        var $dfgTab = $scheduleInfos.find('.dfg');
        Scheduler.showScheduleDetailView();
        Scheduler.__testOnly__.schedDetailTabs();
        $defaultTab.click();
        assert.isTrue($scheduleDetail.is(":visible"));
        assert.isTrue($modScheduleForm.is(":visible"));
        $dfgTab.click();
        assert.isTrue($scheduleDetail.is(":visible"));
        assert.isFalse($modScheduleForm.is(":visible"));
    });

    it('Should close new schedule form correctly', function() {
        $newScheduleForm.removeClass("xc-hidden");
        $newScheduleForm.show();
        assert.isTrue($newScheduleForm.is(":visible"));
        $newScheduleForm.find('.close').click();
        assert.isFalse($newScheduleForm.is(":visible"));
    });

    it('Should close schedule detail form correctly', function() {
        $scheduleDetail.removeClass("xc-hidden");
        $scheduleDetail.show();
        assert.isTrue($scheduleDetail.is(":visible"));
        $scheduleDetail.find('.close').click();
        assert.isFalse($scheduleDetail.is(":visible"));
    });

    it('Should save new schedule form by button', function() {
        var $scheduleDate  = $newScheduleForm.find(".timeSection .date");
        var $scheduleTime  = $newScheduleForm.find(".timeSection .time");
        var $freqSection = $newScheduleForm.find(".frequencySection");
        var $scheduleRecur = $newScheduleForm.find(".recurSection input");

        var date = new Date("12/25/2016");
        date.setHours(4);
        date.setMinutes(5);
        $scheduleRecur.val(6);
        $scheduleDate.val("12/25/2016");
        $scheduleTime.val("04 : 05 AM");
        $scheduleTime.data("date", date);
        $freqSection.find('.radioButton[data-option=biweekly]').click();
        DF.addDataflow("df3", new Dataflow("df3"),
                       {"isUpload": true,
                        "noClick" : true});
        Scheduler.setDataFlowName("df3");
        $("#newScheduleForm-save").click();
        assert.isFalse($newScheduleForm.is(":visible"));
        assert.isTrue($modScheduleForm.is(":visible"));
        assert.isTrue($scheduleDetail.is(":visible"));
        var dataflow = DF.getDataflow("df3");
        expect(dataflow.schedule.startTime).to.equal(date.getTime());
        expect(dataflow.schedule.dateText).to.equal("12/25/2016");
        expect(dataflow.schedule.timeText).to.equal("04 : 05 AM");
        expect(dataflow.schedule.repeat).to.equal("biweekly");
        expect(dataflow.schedule.recur).to.equal(6);
    });

    it('Should save mod schedule form by button', function() {
        Scheduler.setDataFlowName("df3");
        $modScheduleForm.find(".frequencySection").find('.radioButton[data-option=hourly]').click();
        $("#modScheduleForm-save").click();
        var dataflow = DF.getDataflow("df3");
        expect(dataflow.schedule.repeat).to.equal("hourly");
    });

    it('Should cancel new schedule form by button', function() {
        $("#newScheduleForm-cancel").click();
        assert.isFalse($newScheduleForm.is(":visible"));
        assert.isFalse($modScheduleForm.is(":visible"));
        assert.isFalse($scheduleDetail.is(":visible"));
    });

    it('Should cancel mod schedule form by button', function() {
        Scheduler.setDataFlowName("df3");
        $modScheduleForm.find(".frequencySection").find('.radioButton[data-option=minute]').click();
        $("#modScheduleForm-cancel").click();
        var dataflow = DF.getDataflow("df3");
        expect(dataflow.schedule.repeat).to.equal("hourly");
    });


});
