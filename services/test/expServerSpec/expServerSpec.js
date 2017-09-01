describe('ExpServer General Test', function() {
    // Test setup
    var expect = require('chai').expect;

    require('jquery');
    var supportStatusFile = require(__dirname + '/../../expServer/supportStatusFile.js');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var XcConsole = require(__dirname + '/../../expServer/expServerXcConsole.js');
    this.timeout(10000);
    // Test begins
    it("supportStatusFile.getStatus should work", function() {
        expect(supportStatusFile.getStatus(-1)).to.equal("Error");
        expect(supportStatusFile.getStatus(1)).to.equal("Ok");
    });
    it("expServer.getOperatingSystem should work", function(done) {
        expServer.getOperatingSystem()
        .always(function(ret) {
            expect(ret).to.not.be.empty;
            done();
        });
    });
    it("XcConsole.getTimeStamp should work", function() {
        expect(XcConsole.getTimeStamp()).to.not.be.empty;
    });
});