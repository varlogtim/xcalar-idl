
module.exports = require('./baseReplayTest.js').replay(
    {
        user: 'dftest',
        workbook: 'Test-Dataflow-Join2',
        validation: [
            {dfName: 'DF Test (result)', nodeName: 'validation1'}
        ]
    },
    ["join dataflow replay", "dataflowTest1", "allTestsSkipped"]
);