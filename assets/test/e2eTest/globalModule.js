module.exports = {
    reporter : function(results, done) {
        console.log(`XD e2etest passed = ${results.failed === 0}`)
        // console.log(results);
        done();
    }
};