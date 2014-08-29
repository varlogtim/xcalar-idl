#! /bin/bash
cp ../index.html testIndex.html
cp ../cat_table.html testCat.html

# insert test.js right after XcalarThrift.js
sed -i '' 's/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script>/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script><script src="\/js\/test.js" type="text\/javascript"><\/script>/' testIndex.html
sed -i '' 's/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script>/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script><script src="\/js\/test.js" type="text\/javascript"><\/script>/' testCat.html

# to test the pages, simply open up testIndex.html
