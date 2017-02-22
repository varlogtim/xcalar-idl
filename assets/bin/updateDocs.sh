rm -rf ~/gui/assets/help/user/*
rm -rf ~/gui/assets/help/admin/*
scp -r jyang@cantor:/netstore/doc/help/Help_XD1.0/* ~/gui/assets/help/user
scp -r jyang@cantor:/netstore/doc/help/Help_admin_XD1.0/* ~/gui/assets/help/admin

