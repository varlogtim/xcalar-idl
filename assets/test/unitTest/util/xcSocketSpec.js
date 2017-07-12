describe("xcSocket Test", function() {
    it("should know if is connected or not", function() {
        var res = XcSocket.isConnected();
        // XXXnow socket is not fulled enalbe in all servers
        // will change it to equal true to make sure socket is connected
        expect(res).to.be.a("boolean");
    });

    it("should get expServer url", function() {
        var getExpServerUrl = XcSocket.__testOnly__.getExpServerUrl;
        var oldExpHost = window.expHost;

        // case 1
        window.expHost = null;
        var res = getExpServerUrl("http://test");
        expect(res).to.equal("http://test");
        // case 2
        window.expHost = "http://test2";
        res = getExpServerUrl("http://test");
        expect(res).to.equal("http://test2");

        window.expHost = oldExpHost;
    });
});