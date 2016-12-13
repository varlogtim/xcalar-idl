describe('Authentication', function() {
	describe('generateHashTag function', function() {
		var genTag;
		before(function() {
			genTag = Authentication.__testOnly__.generateHashTag;
		})
		it ('should not have number in first character', function() {
			var cache = Math.random;
			Math.random = function() {
				return 0.01;
			}
			var tag = genTag();
			expect(tag.charAt(0)).to.equal('a');
			expect(tag.charAt(1)).to.equal('0');
			Math.random = cache;
		});

		it ('should return valid tag if Math.random produces .99', function() {
			var cache = Math.random;
			Math.random = function() {
				return 0.99;
			}
			var tag = genTag();
			expect(tag.charAt(0)).to.equal('Z');
			expect(tag.charAt(1)).to.equal('Z');
			Math.random = cache;
		});
		
	});
});