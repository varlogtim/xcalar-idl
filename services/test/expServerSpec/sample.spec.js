var assert = require('assert');
var expect = require('chai').expect;

describe('Sample Test', function() {
    it('should pass', function() {
      assert.equal(1, 1);
    });

    it('should fail', function() {
        expect(1).to.equal(1);
    });
});