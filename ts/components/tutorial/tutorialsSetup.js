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

        $('#sampleWorkbook').click(function() {
            // var targetName = "Sample Workbook Generator";
            // var targetType = "memory"; // corresponds to 'Generated'
            var targetName = "XcalarSampleWorkbookAzure";
            var targetType = "azblobfullaccount"; // corresponds to 'Azure"
            var targetParams = {"account_name": "xcdatasetswestus2",
                                "sas_token":
            "?sv=2017-11-09&ss=bfqt&srt=sco&sp=rwdlacup&se=2018-10-01T04:44:34Z&st=2018-08-23T20:44:34Z&spr=https&sig=v1SoHWE3wWq6DgmWKHunJaQsAw%2FrDARVVzQPBLyP%2BWY%3D"
            };

            var wbName = "SampleWorkbook";
            var description = "This workbook holds the solutions and explanations" +
                " to Xcalar Adventure - Data Prep. It not only contains the whole dataflow" + 
                " It not only contains the whole dataflow from importing the data to the" +
                " last question of the Xcalar Adventure, but also provides the flexibility" +
                " to revert back to any intermediate table, allowing maximum flexibility" +
                " for the inquisitive minds to get the hang of Xcalar Design."
            // Add target
            XcalarTargetList()
            .then(function(targetList) {

                for (var ii = 0; ii < targetList.length; ii++) {
                    if (targetList[ii].name === targetName) {
                        return XIApi.deleteDataTarget(targetName);
                    }
                }
                return PromiseHelper.resolve();
            })
            .then(function() {
                return XIApi.createDataTarget(targetType, targetName, targetParams);
            })
            .then(function() {
                // upload workbook
                var wkbkBlob = "tutorialWkbk/SampleWorkbook.tar.gz";
                var wkbkContainer = "netstore";
                // example url: https://myaccount.blob.core.windows.net/mycontainer/myblob
                const blobUri = 'https://' + targetParams.account_name + '.blob.core.windows.net';
                // const blobService = AzureStorage.Blob
                // .createBlobServiceWithSas(blobUri, targetParams.sas_token);
                var downloadLink = blobUri + '/' + wkbkContainer
                + '/' + wkbkBlob + targetParams.sas_token;
                const workbooks = WorkbookManager.getWorkbooks();
                wbName = WorkbookPanel.wbDuplicateName("SampleWorkbook", workbooks, 0);
                var req = new Request(downloadLink);
                fetch(req)
                .then(function(response) { return response.blob(); })
                .then(function(myBlob) {
                    return WorkbookPanel.createNewWorkbook(wbName, description, myBlob);
                })
                .catch(function(error) {
                    handleError(error);
                })
            })

        });

        $('#tutorialWorkbookMarketplace').click(function() {
            MainMenu.openPanel("monitorPanel", "tutorialSettingButton");
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
        return; // XXX Disable it in 2.0
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