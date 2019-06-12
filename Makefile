RC:=false
PRODUCT:=XD

ifeq ($(RC),true)
	GRUNT_EXTRA_FLAGS+=--rc
endif

GRUNT_EXTRA_FLAGS+= --product=$(PRODUCT)

all: setup_npm
	node_modules/grunt/bin/grunt installer $(GRUNT_EXTRA_FLAGS)
dev: setup_npm
	node_modules/grunt/bin/grunt dev $(GRUNT_EXTRA_FLAGS)
installer: setup_npm
	node_modules/grunt/bin/grunt $(NPM_GRUNT_COLOR) installer $(GRUNT_EXTRA_FLAGS)
trunk: setup_npm
	node_modules/grunt/bin/grunt trunk $(GRUNT_EXTRA_FLAGS)
debug: setup_npm
	node_modules/grunt/bin/grunt debug $(GRUNT_EXTRA_FLAGS)

setup_npm:
	npm install $(NPM_GRUNT_COLOR) --save-dev
	node_modules/grunt/bin/grunt $(NPM_GRUNT_COLOR) init
