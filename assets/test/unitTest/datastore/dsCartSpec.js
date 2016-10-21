function dsCartModuleTest() {
    // Note that this function is called in very early time
    // so do not initialize any resuable varible here
    // instead, initialize in the it() function
    var previousCart;
    var testCartId;
    var fakeDSObj;

    
    // XXX add more test as code coverage is not enough now

    function getCartsLen(carts) {
        return Object.keys(carts).length;
    }

    function getFirstCart(carts) {
        for (var dsId in carts) {
            return carts[dsId];
        }
        return null;
    }

    before(function(){
        previousCart = DSCart.getCarts();

        fakeDSObj = DS.__testOnly__.createDS({
            "id"      : "testDS" + Math.floor(Math.random() * 1000 + 1),
            "name"    : "testDS",
            "isFolder": false
        });
    });

    it('Should get cart', function() {
        expect(DSCart.getCarts()).to.equal(previousCart);
    });

    it('Should empty all cart', function() {
        DSCart.clear();

        var carts = DSCart.getCarts();
        expect(carts).to.be.an('object');
        expect(jQuery.isEmptyObject(carts)).to.be.true;

        // UI check
        assert.equal($("#dataCart").find(".selectedTable").length, 0, 'have no carts');
    });

    it('Should add new cart', function() {
        testCartId = fakeDSObj.getId();
        DSCart.addItem(testCartId);

        var carts = DSCart.getCarts();
        expect(carts).to.be.an('object');

        var cart = getFirstCart(carts);
        expect(cart).to.have.property('dsId').to.equal(testCartId);
        expect(cart).to.have.property('items').with.length(0);
        expect(cart).to.have.property('tableName');
    });

    it("Should get cart", function() {
        var $cart = DSCart.getCartElement(testCartId);
        assert.equal($cart.length, 1, 'have only 1 cart');
    });

    it('Should add item', function() {
        var items = [{"colNum": 1, "value": "testItem"}];
        DSCart.addItem(testCartId, items);

        var carts = DSCart.getCarts();
        expect(getCartsLen(carts)).to.equal(1);

        var cart = getFirstCart(carts);
        expect(cart).to.have.property('items').with.length(1);

        var item = cart.items[0];
        expect(item).to.have.property('colNum').to.equal(1);
        expect(item).to.have.property('value').to.equal("testItem");

        // UI check
        var $cart = DSCart.getCartElement(testCartId);
        assert.equal($cart.length, 1, 'still have only 1 cart');
        assert.equal($cart.find("li").length, 1, 'should have only 1 item');
        assert.isFalse($cart.find(".cartEmptyHint").is(":visible"),
                    'Should not see hint');
    });

    it('Should remove item', function() {
        DSCart.addItem(testCartId, {"colNum": 2, "value": "testItem2"});

        var carts = DSCart.getCarts();
        expect(getCartsLen(carts)).to.equal(1);

        // now should have 2 items
        var cart = getFirstCart(carts);
        expect(cart).to.have.property('items').with.length(2);

        // should have 1 item after remove
        DSCart.removeItem(testCartId, 1);
        expect(cart).to.have.property('items').with.length(1);


        // UI check
        var $cart = DSCart.getCartElement(testCartId);
        var $li = $cart.find("li");
        assert.equal($li.length, 1, 'have only 1 item');
        assert.equal($li.text(), 'testItem2', 'have the right item');
    });

    it('Should remove cart', function() {
        DSCart.removeCart(testCartId);

        var carts = DSCart.getCarts();
        expect(getCartsLen(carts)).to.equal(0);

        // UI check
        var $cart = DSCart.getCartElement(testCartId);
        assert.equal($cart.length, 0, 'should have no carts');
    });

    after(function() {
        var $ds = DS.getGrid(fakeDSObj.getId());
        DS.__testOnly__.removeDS($ds);
    });
}
