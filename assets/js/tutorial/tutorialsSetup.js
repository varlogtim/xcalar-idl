window.TutorialsSetup = (function($, TutorialsSetup) {
    TutorialsSetup.setup = function() {
        Intro.setOptions({
            onComplete: function() {
                $('.intro-emptybox').remove();
                // $('#demoScreen [data-introstep]').removeClass('hover');
                $('#demoScreen').remove();
                $('#container').show();
            }
            // onNextStep: function(el) {
            //     // $('#demoScreen [data-introstep]').removeClass('hover');
            //     // el.addClass('hover');
            // }
        });

        $('#workbookWT').click(function() {
            // reset options set by datastorepreview1
            var options = {
                ignoreHidden: true,
                onStart: "",
                onNextStep: "",
                onPrevStep: "",
                onSkipToEnd: "",
                onSkipToStart: "",
                includeNumbering: "true"
            };

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

            introHelper('workbookTut', WalkThroughTStr.w1, options);
        });

        $('#datastoreWT1').click(function() {
            var options = {
                ignoreHidden: false,
                onNextStep: function(introObj) {
                    if (introObj.currentStep === 5) {
                        dsDemo1ToggleForm(true);
                    }
                },
                onPrevStep: function(introObj) {
                    if (introObj.currentStep === 4) {
                        dsDemo1ToggleForm(false);
                    }
                },
                onSkipToEnd: function() {
                    dsDemo1ToggleForm(true);
                },
                onSkipToStart: function() {
                    dsDemo1ToggleForm(false);
                }
            };

            introHelper('datastoreTut1', WalkThroughTStr.w2, options);
        });

        $('#datastoreWT2').click(function() {
            var options = {
                ignoreHidden: true,
                onStart: "",
                onNextStep: "",
                onPrevStep: "",
                onSkipToEnd: "",
                onSkipToStart: ""
            };
            introHelper('datastoreTut2', WalkThroughTStr.w3, options);
        });

        $('#datasetPanelWA1').click(function() {
            var options = {
                ignoreHidden: true,
                onStart: "",
                onNextStep: "",
                onPrevStep: "",
                onSkipToEnd: "",
                onSkipToStart: "",
                includeNumbering: "true"

            };
            /*var options = {
                ignoreHidden: true,
                onNextStep: function(introObj) {
                    if (introObj.currentStep === 5) {
                        dsA1ToggleMenu(true);
                    }
                },
                onPrevStep: function(introObj) {
                    if (introObj.currentStep === 4) {
                        dsA1ToggleMenu(false);
                    }
                },
                onSkipToEnd: function() {
                    dsA1ToggleMenu(true);
                },
                onSkipToStart: function() {
                    dsA1ToggleMenu(false);
                }
            };*/
            introHelper('datasetPanelTutA1', WalkThroughTStr.wa1, options);
        });

        $('#importDatasourceWA2').click(function() {
            var options = {
                ignoreHidden: true,
                onStart: "",
                onNextStep: "",
                onPrevStep: "",
                onSkipToEnd: "",
                onSkipToStart: "",
                includeNumbering: "true"
            };
            introHelper('importDatasourceTutA2', WalkThroughTStr.wa2, options);
        });

        $('#browseDatasourceWA3').click(function() {
            var options = {
                ignoreHidden: true,
                onStart: "",
                onNextStep: "",
                onPrevStep: "",
                onSkipToEnd: "",
                onSkipToStart: "",
                includeNumbering: "false"
            };
            introHelper('browseDatasourceTutA3', WalkThroughTStr.wa3, options);
        });

        $('#browseDatasource2WA4').click(function() {
            var options = {
                ignoreHidden: true,
                onStart: "",
                onNextStep: "",
                onPrevStep: "",
                onSkipToEnd: "",
                onSkipToStart: "",
                includeNumbering: "true"
            };
            introHelper('browseDatasource2TutA4', WalkThroughTStr.wa4, options);
        });
        //callback to display menu
        function dsA1ToggleMenu(showPreview) {
            if (showPreview) {
                $('#wa1Menu').removeClass("xc-hidden");
                $('#gridViewMenu').css("display", "block");
            } else {
                $('#gridViewMenu').addClass('xc-hidden');
            }
        }

        function dsDemo1ToggleForm(showPreview) {
            if (showPreview) {
                $('#demoScreen').find('#dsForm-preview')
                                .removeClass('xc-hidden');
                $('#demoScreen').find('#dsForm-path')
                                .addClass('xc-hidden');
            } else {
                $('#demoScreen').find('#dsForm-preview')
                                .addClass('xc-hidden');
                $('#demoScreen').find('#dsForm-path')
                                .removeClass('xc-hidden');
            }
        }
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
   
    return (TutorialsSetup);
}(jQuery, {}));