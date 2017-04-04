describe("Monitor Panel Test", function() {
	var $monitorPanel;
	before(function() {
		$monitorPanel = $("#monitor-system");
		$("#monitorTab").find(".mainTab");
		$("#systemButton").click();
	});

	describe("toggling xdb and ram", function() {
		it("clicking on donut should toggle xdb and ram", function() {
			expect($monitorPanel.find(".donutSection").eq(1).hasClass("xdbMode")).to.be.false;
			expect($("#donutStats2").is(":visible")).to.be.false;
			expect($("#donutStats1").is(":visible")).to.be.true;
			expect($monitorPanel.find(".graphSwitches .row").eq(1).find(".text").text()).to.equal("RAM");

			// to xdb mode
			$monitorPanel.find(".ramDonut .donut").eq(0).click();

			expect($monitorPanel.find(".donutSection").eq(1).hasClass("xdbMode")).to.be.true;
			expect($("#donutStats2").is(":visible")).to.be.true;
			expect($("#donutStats1").is(":visible")).to.be.false;
			expect($monitorPanel.find(".graphSwitches .row").eq(1).find(".text").text()).to.equal("XDB");

			// to ram mode
			$monitorPanel.find(".ramDonut .donut").eq(0).click();

			expect($monitorPanel.find(".donutSection").eq(1).hasClass("xdbMode")).to.be.false;
			expect($("#donutStats2").is(":visible")).to.be.false;
			expect($("#donutStats1").is(":visible")).to.be.true;
			expect($monitorPanel.find(".graphSwitches .row").eq(1).find(".text").text()).to.equal("RAM");
		});
	});
});