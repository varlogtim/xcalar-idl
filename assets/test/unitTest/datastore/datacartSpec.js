function dataCartModuleTest() {
    // Note that this function is called in very early time
    // so do not initialize any resuable varible here
    // instead, initialize in the it() function
    var previousCart;
    var $mainTabCache;
    var minModeCache;
    var testCartId;
    var fakeDSObj;

    before(function(){
        previousCart = DataCart.getCarts();

        // turn off min mode, as it affectes DOM test
        minModeCache = gMinModeOn;
        gMinModeOn = true;

        // go to the data store tab, or some UI effect like :visible cannot test
        $mainTabCache = $(".mainMenuTab.active");
        $('#dataStoresTab').click();

        fakeDSObj = DS.__testOnly__.createDS({
            "id"      : "testDS" + Math.floor(Math.random() * 1000 + 1),
            "name"    : "testDS",
            "isFolder": false
        });
    });

    it('Should get cart', function() {
        expect(DataCart.getCarts()).to.equal(previousCart);
    });

    it('Should empty all cart', function() {
        DataCart.clear();

        var carts = DataCart.getCarts();
        expect(carts).to.be.a('array').with.length(0);

        // UI check
        assert.equal($("#dataCart .selectedTable").length, 0, 'have no carts');
    });

    it('Should add new cart', function() {
        testCartId = fakeDSObj.getId();
        DataCart.addItem(testCartId);

        var carts = DataCart.getCarts();
        expect(carts).to.be.a('array').with.length(1);

        var cart = carts[0];
        expect(cart).to.have.property('dsId').to.equal(testCartId);
        expect(cart).to.have.property('items').with.length(0);
        expect(cart).to.have.property('tableName');
    });

    it("Should get cart", function() {
        var $cart = DataCart.getCartById(testCartId);
        assert.equal($cart.length, 1, 'have only 1 cart');
        assert.isTrue($cart.find(".cartEmptyHint").is(":visible"), 'Should see hint');
    });

    it('Should add item', function() {
        var items = [{"colNum": 1, "value": "testItem"}];
        DataCart.addItem(testCartId, items);

        var carts = DataCart.getCarts();
        expect(carts).to.be.a('array').with.length(1);

        var cart = carts[0];
        expect(cart).to.have.property('items').with.length(1);

        var item = cart.items[0];
        expect(item).to.have.property('colNum').to.equal(1);
        expect(item).to.have.property('value').to.equal("testItem");

        // UI check
        var $cart = DataCart.getCartById(testCartId);
        assert.equal($cart.length, 1, 'still have only 1 cart');
        assert.equal($cart.find("li").length, 1, 'should have only 1 item');
        assert.isFalse($cart.find(".cartEmptyHint").is(":visible"),
                    'Should not see hint');
    });

    it('Should remove item', function() {
        DataCart.addItem(testCartId, {"colNum": 2, "value": "testItem2"});

        var carts = DataCart.getCarts();
        expect(carts).to.be.a('array').with.length(1);

        // now should have 2 items
        var cart = carts[0];
        expect(cart).to.have.property('items').with.length(2);

        // should have 1 item after remove
        DataCart.removeItem(testCartId, 1);
        expect(cart).to.have.property('items').with.length(1);


        // UI check
        var $cart = DataCart.getCartById(testCartId);
        var $li = $cart.find("li");
        assert.equal($li.length, 1, 'have only 1 item');
        assert.equal($li.text(), 'testItem2', 'have the right item');
    });

    it('Should remove cart', function() {
        DataCart.removeCart(testCartId);

        var carts = DataCart.getCarts();
        expect(carts).to.be.a('array').with.length(0);

        // UI check
        var $cart = DataCart.getCartById(testCartId);
        assert.equal($cart.length, 0, 'should have no carts');
    });

    after(function() {
        var $ds = DS.getGrid(fakeDSObj.getId());
        DS.__testOnly__.removeDS($ds);

        $mainTabCache.click(); // go back to previous tab
        gMinModeOn = minModeCache;
    });
}
