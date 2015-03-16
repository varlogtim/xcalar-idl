/*  
    extends jQuery for a little bit.
    so we can bind event like:

    $(document).on(eventname, {
        selector1: handler1,
        selector2: handler2,
        ......
    });

    which should be more convenient and easier to read.
*/
(function() {
    "use strict";
    if (typeof jQuery === "undefined")
        return;

    jQuery.fn.extend({
        onEach: function(types, selector, data, fn) {
            if (typeof selector === "object") {
                for (var sel in selector) {
                    this.on(types, sel, data, selector[sel]);
                }
                return this;
            } else {
                return this.on(types, selector, data, fn);
            }
        }
    });
})();

/*
    expose Widget and some variables to global(window).
*/
var gParameters = {};
var gRetName = "";
var currStep = 1;

// for step 2
var gSelectedParamIndex = 0;

// for step 3
var gInstructions = "";

// for step 4
var stepFourCurr  = 1;
var stepFourTotal = 1;
var gOptionsForParam = {};

// for step 6
var gSelectedRadio = 0;

var Widget = (function() {

    function widget() {}

    widget.prototype.init = function() {
        this.display();
        populateParaCheckList();
        this.attachListeners();
    };

    widget.prototype.display = function() {
        (function setHeader() {
            var info = "";
            switch (currStep) {
            case (1) :
                info = "Select your widget type.";
                break;
            case (2) :
                info = "Select your parameters.";
                break;
            case (3) :
                info = "Set options.";
                break;
            case (4) :
                info = "Set options for " + gParameters[stepFourCurr - 1].param +
                       ". (" + stepFourCurr + "/" + stepFourTotal + ")";
                break;
            case (5) :
                info = "Confirm and publish.";
                break;
            case (6) :
                info = "Publish.";
                break;
            default:
                break;
            }
            $("#viewHeader > #stepNumber").html(currStep);
            $("#viewHeader > #stepInfo").html(info);
        })();

        (function setContent() {
            $("#viewContent").empty();

            var html = "";
            switch (currStep) {
            case (1) :
                html += 
                    "<div class='radio'>" +
                        "<span>Dropdown</span>" +
                    "</div>" +
                    "<div class='radio'>" +
                        "<span>Checkbox</span>" +
                    "</div>" +
                    "<div class='radio activeRadio'>" +
                        "<span>Radio</span>" +
                    "</div>" +
                    "<div class='radio'>" +
                        "<span>Textfield</span>" +
                    "</div>" +
                    "<div class='radio'>" +
                        "<span>On/Off</span>" +
                    "</div>";
                break;
            case (2) :
                for (var i = 0; i < gParameters.length; i ++) {
                    html += 
                        "<div class='check'>" + 
                            "<span>" + 
                                gParameters[i].param + ":" + 
                                gParameters[i].defaultVal +
                            "</span>" + 
                        "</div>";
                }
                break;
            case (3) :
                html += 
                    "<div id='instructionTitle'>Instructions:</div>" +
                    "<textarea id='instructionField'></textarea>";
                break;
            case (4) :
                html += 
                    "<div id='inputArea'>" + 
                        "<span>Number of options: </span>" + 
                        "<input type='text' id='optionNumberInput'></input>" + 
                    "</div>" +
                    "<div id='paramField'></div>";
                break;
            case (5) :
                html += 
                    "<div id='confirmView'>" + 
                        "<div id='widgetType'>" + 
                            "<div class='icon'>1</div>" +
                            "<div class='label'>Widget:</div>" + 
                            "<div class='value'>Radio</div>" + 
                        "</div>" + 
                        "<div id='parameter'>" + 
                            "<div class='icon'>2</div>" +
                            "<div class='label'>Parameter:</div>" + 
                            "<div class='value'>" + 
                                gParameters[gSelectedParamIndex].param +
                            "</div>" + 
                        "</div>" +
                        "<div id='instruction'>" + 
                            "<div class='icon'>3</div>" +
                            "<div class='label'>Instructions:</div>" + 
                            "<div class='value'>" + gInstructions + "</div>" + 
                        "</div>" +
                    "</div>";
                break;
            case (6) :
                html += 
                    "<div id='pubInstruction'>" + 
                        gInstructions +
                    "</div>";
                var arr = gOptionsForParam[gSelectedParamIndex];
                for (var i in arr) {
                    html += 
                        "<div class='radio'>" + 
                            "<span>" + arr[i].displayAs + "</span>" +
                        "</div>";
                }
                break;
            default :
                break;
            }

            $("#viewContent").html(html);
        })();

        (function setFooter() {
            if (currStep === 1) {
                $("#viewFooter > #btnBack").hide();
            } else {
                $("#viewFooter > #btnBack").show();
            }

            if (currStep === 5) {
                $("#viewFooter > #btnNext").css({
                    background: "url('img/publish.png')"
                });
            } else if (currStep === 6) {
                $("#viewFooter > #btnNext").css({
                    background: "url('img/apply.png')"
                });
            } else {
                $("#viewFooter > #btnNext").css({
                    background: "url('img/next.png')"
                });
            }
        })();
    };

    widget.prototype.attachListeners = function() {
        var self = this;
        // event handlers
        var handlers = {
            btnBack: function() {
                if (currStep === 4 && stepFourCurr > 1) {
                    stepFourCurr --;
                } else {
                    currStep = currStep > 1 ? currStep - 1 : 1;
                }
                self.display();
            },
            btnNext: function() {
                if (currStep === 6) {
                    return (function apply() {
                        var $radios = $(".radio");
                        for (var i = 0; i < $radios.length; i ++) {
                            if ($($radios[i]).hasClass("activeRadio")) {
                                gSelectedRadio = i;
                                break;
                            }
                        }
                        var sub = $(".activeRadio").text();
                        // to get selected value:
                        // gOptionsForParam[gSelectedParamIndex][gSelectedRadio].value;

                        // XXX insert spinny here
                        // The following function is fake!!! Just a placeholder
                        XcalarExecuteRetina(gRetName, "param:sub")
                        .done(function() {
                            console.log("Your dashboard should have refreshed");
                        });
                    })();
                }

                (function saveParameters() {
                    if (currStep === 2) {
                        var $checkboxes = $(".check");
                        for (var i = 0; i < $checkboxes.length; i ++) {
                            if ($($(".check")[i]).hasClass("activeCheck")) {
                                gSelectedParamIndex = i;
                                break;
                            }
                        }
                    } else if (currStep === 3) {
                        var value = $("#instructionField").val();
                        gInstructions = value.substring(0, 15) + 
                                        ((value.length > 15) ? "..." : "");
                    } else if (currStep === 4) {
                        var options = gOptionsForParam[stepFourCurr - 1] = [];
                        var $optionFields = $(".optionField");
                        for (var i = 0; i < $optionFields.length; i ++) {
                            var $optionField = $($optionFields[i]);
                            options.push({
                                value: $optionField.children(".valueInput").val(),
                                displayAs: $optionField.children(".displayAsInput").val()
                            }); 
                        }
                    }
                })();

                if (currStep === 4 && stepFourCurr < stepFourTotal) {
                    stepFourCurr ++;
                } else {
                    currStep = currStep < 6 ? currStep + 1 : 6;
                }
                self.display();
            },
            radio: function() {
                $(".radio").removeClass("activeRadio");
                $(this).addClass("activeRadio");
            },
            check: function() {
                $(this).toggleClass("activeCheck");
            },
            optionNumberInput: function() {
                var numOptions = $("#optionNumberInput").val();
                var $paramField = $("#viewContent #paramField");

                $paramField.empty();

                if (/^[1-3]$/.exec(numOptions) ===  null) {
                    return;
                }
                
                var html = "<div>" +
                                "<span class='label' id='valueSpan'>" +
                                    "Value" + 
                                "</span>" +
                                "<span class='label' id='displayAsSpan'>" +
                                    "Display As" +
                                "</span>" + 
                           "</div>";
                var defaultValue = gParameters[stepFourCurr - 1].defaultVal;
                for (var i = 0; i < numOptions; i ++) {
                    html += "<div class='optionField'>" + 
                                "<span>" + (i + 1) + "</span>" + 
                                "<input type='text' class='valueInput' value=" + defaultValue + ">" +
                                "</input>" + 
                                "<input type='text' class='displayAsInput'>" +
                                "</input>" + 
                            "</div>";
                }
                $paramField.append(html);
            }
        };

        // bind events
        $(document).onEach("click", {
            "#btnBack": handlers.btnBack,
            "#btnNext": handlers.btnNext,
            ".radio": handlers.radio,
            ".check": handlers.check
        });
        $(document).on("input", "#optionNumberInput", handlers.optionNumberInput);
    };

        

    function populateParaCheckList() {
        function getParameterByName(name) {
            var match = RegExp('[?&]' + name +
                               '=([^&]*)').exec(window.location.search);
            return (match && decodeURIComponent(match[1].replace(/\+/g, ' ')));
        }
        gRetName = getParameterByName("retname");
        XcalarListParametersInRetina(gRetName)
        .done(function(varList) {
            // mock data 
            varList = [
                {
                    param: "param1",
                    defaultVal: 1
                },
                {
                    param: "param2",
                    defaultVal: 2
                },
                {
                    param: "param3",
                    defaultVal: 3
                }
            ];

            stepFourTotal = varList.length;
            gParameters = varList;
        })
        .fail(function(status) {
            console.log("Failed to get list of params from retname with status", 
                status);
            // XXX: Add preprogrammed params
        });
    }

    return (new widget());
})();