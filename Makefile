RC:=false
PRODUCT:=XD

ifeq ($(RC),true)
	GRUNT_EXTRA_FLAGS+=--rc
endif

GRUNT_EXTRA_FLAGS+= --product=$(PRODUCT)

all: setup_npm
	grunt installer $(GRUNT_EXTRA_FLAGS)
dev: setup_npm
	grunt dev $(GRUNT_EXTRA_FLAGS)
installer: setup_npm
	grunt installer $(GRUNT_EXTRA_FLAGS)
trunk: setup_npm
	grunt trunk $(GRUNT_EXTRA_FLAGS)
debug: setup_npm
	grunt debug $(GRUNT_EXTRA_FLAGS)

setup_npm:
	node -v
	npm install --save-dev
	grunt init
