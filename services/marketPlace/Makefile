.PHONY: build run

build:
	docker build -t market .

run: build
	-docker stop market
	-docker rm market
	docker run -p 12123:12123 --restart=always --name=market -d market
