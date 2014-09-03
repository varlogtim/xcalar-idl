#! /bin/bash
cp ../index.html index.html
cp ../cat_table.html cat.html

# insert test.js right after XcalarThrift.js
sed -i '' 's/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script>/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script><script src="\/js\/test.js" type="text\/javascript"><\/script>/' index.html
sed -i '' 's/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script>/<script src="\/js\/XcalarThrift.js" type="text\/javascript"><\/script><script src="\/js\/test.js" type="text\/javascript"><\/script>/' cat.html

# to test the pages, simply open up test/index.html
