module.exports = require('./baseReplayTest.js').replay(
    {
        user: 'dftest',
        workbook: 'Test-Dataflow-2',
        validation: [
            {dfName: 'DF Test(result)', nodeName: 'validation1'}
        ]
    },
    ["workbook replay3", "dataflowTest3", "allTests"]
);