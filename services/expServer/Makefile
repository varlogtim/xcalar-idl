.PHONY: all deploy archive build run clean


SERVER ?= authentication
NOW = $(shell date +'%Y%m%d-%H%M')
NAME ?= appserver
GIT_SHA1=$(shell git rev-parse --short=8 HEAD)
ARCHIVE := $(NAME)-$(NOW)-$(GIT_SHA1).tar.gz
DESTDIR ?= /srv/apps/$(NAME)-$(NOW)

FILES := Dockerfile expServer.js Makefile ldapConfig.json package.json marketplace.json

all:
	@echo "deploy    - deploy to $(SERVER)"
	@echo "archive   - build archive file ($(ARCHIVE))"
	@echo "build     - build docker image"
	@echo "run       - run docker image"
	@echo "debug     - run a shell"

archive: $(ARCHIVE)

$(ARCHIVE): $(FILES)
	tar czvf $@ $^

deploy: $(ARCHIVE)
	gcloud compute ssh $(SERVER) --command="sudo mkdir -p $(DESTDIR)"
	cat $< | gcloud compute ssh $(SERVER) --command="sudo tar zxvf - --no-same-owner -C $(DESTDIR)"
	gcloud compute ssh $(SERVER) --command="cd $(DESTDIR) && sudo make run GIT_SHA1=$(GIT_SHA1) NOW=$(NOW) && echo $(GIT_SHA1) | sudo tee GIT_SHA1 && sudo ln -sfn $(NAME)-$(NOW) ../appserver"
	gcloud compute ssh $(SERVER) --command="sudo service caddy restart"

build:
	docker build -q -t $(NAME) .

run: build
	@-docker stop $(NAME) 2>/dev/null
	@-docker rm -f $(NAME) 2>/dev/null
	docker run -p 12124:12124 -v /etc/xcalar:/etc/xcalar -v /var/log:/var/log --restart=always --name=$(NAME) -d $(NAME)


debug: build
	@-docker stop $(NAME) 2>/dev/null
	@-docker rm -f $(NAME) 2>/dev/null
	docker run -it -p 12124:12124 -e AWS_ACCESS_KEY_ID=AKIAIB3EAQQFJR5FDQBA -e AWS_SECRET_ACCESS_KEY=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 -v /var/tmp/uploads:/var/tmp/uploads -v /etc/xcalar:/etc/xcalar -v /var/log:/var/log --restart=always --name=$(NAME) $(NAME) /bin/bash -l

clean:
	-rm -vf $(NAME)-*.tar.gz
