module.exports = require('./baseReplayTest.js').replay(
   {
       user: 'dftest5',
       workbook: 'ENG_4727',
       validation: [
		  {dfName: 'Dataflow 2', nodeName: 'finalnode'}
       ]
   },
   ["nanTest", "allTests"]
);