window.Help = (function($, Help) {

    Help.setup = function() {
        // Toggleing helper tooltips
        HelpSearch.setup();

        $('#helpOnOff').click(function() {
            toggleRefresh($(this));
        });

        // Intro.setOptions({
        //     onComplete: function() {
        //         $('.intro-emptybox').remove();
        //         // $('#demoScreen [data-introstep]').removeClass('hover');
        //         $('#demoScreen').remove();
        //         $('#container').show();
        //     },
        //     onNextStep: function(el) {
        //         // $('#demoScreen [data-introstep]').removeClass('hover');
        //         // el.addClass('hover');
        //     }
        // });

        // $('#workbookWT').click(function() {
        //     // reset options set by datastorepreview1
        //     var options = {
        //         ignoreHidden: true,
        //         onStart: "",
        //         onNextStep: "",
        //         onPrevStep: "",
        //         onSkipToEnd: "",
        //         onSkipToStart: ""
        //     };

        //     // XX set options for video

        //     // var options = {
        //     //     video: '#xcalarVid',
        //     //     videoBreakpoints: [2, 4, 6, 8, 10, 12, 14, 16, 18],
        //     //     actionsRequired: [
        //     //         (function (steps, actions) {
        //     //             $('[data-introstep]').click(function() {
        //     //                 var step = parseInt($(this).data('introstep')) - 1;
        //     //                 if (step === steps.currentStep) {
        //     //                     actions.nextStep();
        //     //                 }
        //     //             });
        //     //         })
        //     //     ],
        //     //     preventSelection: false,
        //     //     onNextStep: "",
        //     //     onComplete: function() {
        //     //         //reset options
        //     //         $('.intro-emptybox').remove();
        //     //         $('#demoScreen').remove();
        //     //         $('#container').show();
        //     //         Intro.setOptions({
        //     //             onComplete: function() {
        //     //                 $('.intro-emptybox').remove();
        //     //                 $('#demoScreen [data-introstep]').removeClass('hover');
        //     //                 $('#demoScreen').remove();
        //     //                 $('#container').show();
        //     //             },
        //     //             preventSelection: true,
        //     //             actionsRequired: "",
        //     //             video: false,
        //     //             videoBreakpoints: [],
        //     //             onNextStep: function(el) {
        //     //                 $('#demoScreen [data-introstep]').removeClass('hover');
        //     //                 el.addClass('hover');
        //     //             }
        //     //         });
        //     //     }
        //     // };

        //     introHelper('workbookDemo', WalkThroughTStr.w1, options);
        // });

        // $('#datastoreWT1').click(function() {
        //     var options = {
        //         ignoreHidden: false,
        //         onStart: function() {
        //             // var emptyBox = '<div class="intro-emptybox" style="' +
        //             //                     'position:absolute;height: 40px;' +
        //             //                     'margin-top:-5px; margin-left: 15px;' +
        //             //                     'width: 100px;' +
        //             //                 '" data-introstep="6"></div>';
        //             // $('#demoScreen #fileNameSelector').append(emptyBox);
        //         },
        //         onNextStep: function(introObj) {
        //             if (introObj.currentStep === 4) {
        //                dsDemo1ToggleForm(true);
        //             }
        //         },
        //         onPrevStep: function(introObj) {
        //             if (introObj.currentStep === 3) {
        //                 dsDemo1ToggleForm(false);
        //             }
        //         },
        //         onSkipToEnd: function(introObj) {
        //             dsDemo1ToggleForm(true);
        //         },
        //         onSkipToStart: function(introObj) {
        //             dsDemo1ToggleForm(false);
        //         }
        //     };

        //     introHelper('datastoreDemo1', WalkThroughTStr.w2, options);
        // });

        // $('#datastoreWT2').click(function() {
        //     var options = {
        //         ignoreHidden: true,
        //         onStart: "",
        //         onNextStep: "",
        //         onPrevStep: "",
        //         onSkipToEnd: "",
        //         onSkipToStart: ""
        //     };
        //     introHelper('datastoreDemo2', WalkThroughTStr.w3, options);
        // });

        function toggleRefresh($target) {
            if ($target.hasClass('on')) {
                $('#helpOnOff').removeClass('on');
                Tips.destroy();
            } else {
                $('#helpOnOff').addClass('on');
                Tips.display();
            }
        }

        // function dsDemo1ToggleForm(showPreview) {
        //     if (showPreview) {
        //         $('#demoScreen').find('#dsForm-preview')
        //                         .removeClass('xc-hidden');
        //         $('#demoScreen').find('#dsForm-path')
        //                         .addClass('xc-hidden');
        //     } else {
        //         $('#demoScreen').find('#dsForm-preview')
        //                         .addClass('xc-hidden');
        //         $('#demoScreen').find('#dsForm-path')
        //                         .removeClass('xc-hidden');
        //     }
        // }
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

    // function introHelper(demoType, textArray, options) {
    //     var userOptions = {popoverText: textArray};
    //     if (options && typeof options === "object") {
    //         $.extend(userOptions, options);
    //     }
    //     Intro.setOptions(userOptions);

    //     $('body').append('<div id="demoScreen"></div>');

    //     $('#demoScreen').load(paths[demoType],
    //         function(response, status) {
    //             if (status === 'success') {
    //                 $('#container:not(.demoContainer)').hide();
    //                 Intro.start();
    //             } else {
    //                 Alert.error(AlertTStr.Error, SideBarTStr.WalkThroughUA);
    //             }
    //         }
    //     );
    // }

    return (Help);

}(jQuery, {}));
