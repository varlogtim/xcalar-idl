window.Help = (function($, Help) {

    Help.setup = function() {
        // Toggleing helper tooltips
        HelpSearch.setup();

        $('#helpOnOff').click(function() {
            toggleRefresh($(this));
        });

        Intro.setOptions({
            onComplete: function() {
                $('.intro-emptybox').remove();
                $('#demoScreen [data-introstep]').removeClass('hover');
                $('#demoScreen').remove();
                $('#container').show();
            },
            onNextStep: function(el) {
                $('#demoScreen [data-introstep]').removeClass('hover');
                el.addClass('hover');
            }
        });

        $('#workbookWT').click(function() {
            var options = {};

            // XX set options for video

            // var options = {
            //     video: '#xcalarVid',
            //     videoBreakpoints: [2, 4, 6, 8, 10, 12, 14, 16, 18],
            //     actionsRequired: [
            //         (function (steps, actions) {
            //             $('[data-introstep]').click(function() {
            //                 var step = parseInt($(this).data('introstep')) - 1;
            //                 if (step === steps.currentStep) {
            //                     actions.nextStep();
            //                 }
            //             });
            //         })
            //     ],
            //     preventSelection: false,
            //     onNextStep: "",
            //     onComplete: function() {
            //         //reset options
            //         $('.intro-emptybox').remove();
            //         $('#demoScreen').remove();
            //         $('#container').show();
            //         Intro.setOptions({
            //             onComplete: function() {
            //                 $('.intro-emptybox').remove();
            //                 $('#demoScreen [data-introstep]').removeClass('hover');
            //                 $('#demoScreen').remove();
            //                 $('#container').show();
            //             },
            //             preventSelection: true,
            //             actionsRequired: "",
            //             video: false,
            //             videoBreakpoints: [],
            //             onNextStep: function(el) {
            //                 $('#demoScreen [data-introstep]').removeClass('hover');
            //                 el.addClass('hover');
            //             }
            //         });
            //     }
            // };

            introHelper('workbookDemo', WalkThroughtTStr.w1, options);
        });

        $('#datastoreWT1').click(function() {
            var options = {
                onStart: function() {
                    var emptyBox = '<div class="intro-emptybox" style="' +
                                        'position:absolute;height: 40px;' +
                                        'margin-top:-5px; margin-left: 15px;' +
                                        'width: 100px;' +
                                    '" data-introstep="6"></div>';
                    $('#demoScreen #fileNameSelector').append(emptyBox);
                }
            };

            introHelper('datastoreDemo1', WalkThroughtTStr.w2, options);
        });

        $('#datastoreWT2').click(function() {
            introHelper('datastoreDemo2', WalkThroughtTStr.w3);
        });

        function toggleRefresh($target) {
            if ($target.hasClass('off')) {
                $('#helpOnOff').removeClass('off');
                Tips.display();
            } else {
                $('#helpOnOff').addClass('off');
                Tips.destroy();
            }
        }
    };

    Help.tooltipOff = function() {
        $('body').addClass('tooltipOff');
        $('#helpOnOff').addClass('off');
    };

    Help.tooltipOn = function() {
        $('body').removeClass('tooltipOff');
        $('#helpOnOff').removeClass('off');
    };

    Help.isTooltipOff = function() {
        return ($('body').hasClass('tooltipOff'));
    };

    function introHelper(demoType, textArray, options) {
        var userOptions = {popoverText: textArray};
        if (options && typeof options === "object") {
            $.extend(userOptions, options);
        }

        Intro.setOptions(userOptions);

        $('body').append('<div id="demoScreen"></div>');

        $('#demoScreen').load(paths[demoType],
            function(response, status) {
                if (status === 'success') {
                    $('#container:not(.demoContainer)').hide();
                    Intro.start();
                } else {
                    Alert.error(AlertTStr.Error, SideBarTStr.WalkThroughUA);
                }
            }
        );
    }

    return (Help);

}(jQuery, {}));
