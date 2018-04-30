// options:resetTime, pickerBlurCallback, isUTC

function XcTimePicker($timePickerWrap, options) {
    var self = this;
    this.$timePicker = $timePickerWrap.find(".timePicker");
    this.$timeInput = $timePickerWrap.find(".time");
    this.options = options || {};

    this.$timeInput.on({
        "focus": function() {
            self.toggleTimePicker(true);
            $(this).closest(".timePickerArea").addClass("active");
        },
        "blur": function() {
            $(this).closest(".timePickerArea").removeClass("active");
        },
        "keydown": function() {
            // no input event
            return false;
        }

    });

    this.$timePicker.on("click", ".btn", function() {
        var $btn = $(this).blur();
        var isIncrease = $btn.hasClass("increase");
        var type;
        if ($btn.hasClass("hour")) {
            type = "hour";
        } else if ($btn.hasClass("minute")) {
            type = "minute";
        } else {
            type = "ampm";
        }
        self.changeTime(type, isIncrease);
    });

    this.$timePicker.on("input", "input", function() {
        var $input = $(this);
        var type;
        if ($input.hasClass("hour")) {
            type = "hour";
        } else if ($input.hasClass("minute")) {
            type = "minute";
        } else {
            // invalid case
            return;
        }
        self.inputTime(type, $input.val());
    });
}

XcTimePicker.prototype = {
    toggleTimePicker: function(display) {
        var self = this;
        var $timePicker = this.$timePicker;
        if (!display) {
            $(document).off(".timePicker");
            $timePicker.find(".inputSection input").off("blur");
            $timePicker.fadeOut(200);
            if (this.options.onClose) {
                this.options.onClose();
            }
            return;
        }

        var date = new Date();
        date.setMinutes(date.getMinutes() + 1);

        $timePicker.fadeIn(200);
        if (this.options.resetTime || !this.$timeInput.val()) {
            this.showTimeHelper(date, false, false);
        }

        // mouse down outside the timePicker, and the input is legal,
        // hide time picker
        $(document).on("mousedown.timePicker", function(event) {
            var $el = $(event.target);
            if ($el.is(self.$timeInput) ||
                $el.closest(self.$timePicker).length > 0) {
                return;
            }
            var $hourInput = $timePicker.filter(':visible').find('input.hour');
            var $minInput = $timePicker.filter(':visible').find('input.minute');
            if ($hourInput.val() <= 12 && $hourInput.val() >= 1
                && $minInput.val() <= 59 && $minInput.val() >= 0) {
                self.toggleTimePicker(false);
            }
        });

        // focus out from inside he timePicker
        $timePicker.find(".inputSection input").on("blur", function() {
            var $hourInput = $timePicker.filter(':visible').find('input.hour');
            var $minInput = $timePicker.filter(':visible').find('input.minute');
            if ($hourInput.length || $minInput.length) {
                if ($hourInput.val() > 12 || $hourInput.val() < 1) {
                    StatusBox.show(ErrTStr.SchedHourWrong, $hourInput, false,
                                   {"side": "left"});
                } else if ($minInput.val() > 59 || $minInput.val() < 0) {
                    StatusBox.show(ErrTStr.SchedMinWrong, $minInput, false,
                                    {"side": "right"});
                }
            } else {
                if (this.options.pickerBlurCallback) {
                    this.options.pickerBlurCallback();
                }

                StatusBox.forceHide();
                self.toggleTimePicker(false);
            }
        });
    },

    showTimeHelper: function(date, noHourReset, noMinReset) {
        var $timePicker = this.$timePicker;
        var hours;
        var minutes;
        var ampm;
        if (this.options.isUTC) {
            hours = this.addPrefixZero(this.getHourIndex(date.getUTCHours()));
            minutes = this.addPrefixZero(date.getUTCMinutes());
            ampm = this.getAMPM(date.getUTCHours());
        } else {
            hours = this.addPrefixZero(this.getHourIndex(date.getHours()));
            minutes = this.addPrefixZero(date.getMinutes());
            ampm = this.getAMPM(date.getHours());
        }

        if (!noHourReset) {
            $timePicker.find(".inputSection .hour").val(hours);
        }
        if (!noMinReset) {
            $timePicker.find(".inputSection .minute").val(minutes);
        }
        $timePicker.find(".inputSection .ampm").text(ampm);
        $timePicker.data("date", date);

        var timeStr = hours + " : " + minutes + " " + ampm;
        this.$timeInput.val(timeStr);
    },

    changeTime: function(type, isIncrease) {
        var ampm = this.$timePicker.find(".inputSection .ampm").text();
        var date = this.$timePicker.data("date");
        var hour;
        if (this.options.isUTC) {
            hour = date.getUTCHours();
        } else {
            hour = date.getHours();
        }
        var diff;

        switch (type) {
            case "ampm":
                if (ampm === "AM") {
                    // toggle to PM, add 12 hours
                    if (this.options.isUTC) {
                        date.setUTCHours(hour + 12);
                    } else {
                        date.setHours(hour + 12);
                    }
                } else {
                    if (this.options.isUTC) {
                        date.setUTCHours(hour - 12);
                    } else {
                        date.setHours(hour - 12);
                    }
                }
                break;
            case "minute":
                diff = isIncrease ? 1 : -1;
                if (this.options.isUTC) {
                    date.setUTCMinutes(date.getUTCMinutes() + diff);
                    // keep the same hour
                    date.setUTCHours(hour);
                } else {
                    date.setMinutes(date.getUTCMinutes() + diff);
                    // keep the same hour
                    date.setHours(hour);
                }
                break;
            case "hour":
                diff = isIncrease ? 1 : -1;
                if (isIncrease && (hour + diff) % 12 === 0 ||
                    !isIncrease && hour % 12 === 0) {
                    // when there is am/pm change, keep the old am/pm
                    if (this.options.isUTC) {
                        date.setUTCHours((hour + diff + 12) % 24);
                    } else {
                        date.setHours((hour + diff + 12) % 24);
                    }
                } else {
                    if (this.options.isUTC) {
                        date.setUTCHours(hour + diff);
                    } else {
                        date.setHours(hour + diff);
                    }
                }
                break;
            default:
                // error case
                break;
        }
        this.showTimeHelper(date, false, false);
    },

    inputTime: function(type, val) {
        var self = this;
        var $timePicker = this.$timePicker;
        if (val === "") {
            return;
        }
        val = Number(val);
        if (isNaN(val) || !Number.isInteger(val)) {
            return;
        }

        var date = $timePicker.data("date");
        switch (type) {
            case "minute":
                if (val < 0 || val > 59) {
                    return;
                }
                if (self.options.isUTC) {
                    date.setUTCMinutes(val);
                } else {
                    date.setMinutes(val);
                }

                self.showTimeHelper(date, false, true);
                break;
            case "hour":
                if (val < 1 || val > 12) {
                    return;
                }

                var ampm = $timePicker.find(".inputSection .ampm").text();

                if (val === 12 && ampm === "AM") {
                    val = 0;
                } else if (ampm === "PM" && val !== 12) {
                    val += 12;
                }
                if (self.options.isUTC) {
                    date.setUTCHours(val);
                } else {
                    date.setHours(val);
                }
                self.showTimeHelper(date, true, false);
                break;
            default:
                // error case
                break;
        }
    },

    addPrefixZero: function(input) {
        if (input < 10) {
            return "0" + input;
        }
        return input;
    },

    getAMPM: function(hour) {
        if (hour >= 12) {
            return "PM";
        }
        return "AM";
    },

    getHourIndex: function(hour) {
        if (hour > 12) {
            hour = hour - 12;
        }
        if (hour === 0) {
            hour = 12;
        }
        return hour;
    }
}