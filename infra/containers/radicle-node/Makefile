
RADICLE_VERSION := 1.6.1
HEARTWOOD_VERSION ?= master

.PHONY: build
build:
	export RADICLE_DATE=$$(echo "$(cd heartwood && git log -1 --pretty=%ct)" | tr -d '\n') ; \
	podman build \
		--build-arg RADICLE_VERSION=$(RADICLE_VERSION) \
		--build-arg PLATFORM=x86_64-unknown-linux-musl \
		.

heartwood:
	git submodule update --init $(CURDIR)/heartwood

.PHONY: submodule-update
submodule-update: heartwood
	git submodule update --remote $(CURDIR)/heartwood

.PHONY: submodule-checkout
submodule-checkout: heartwood
	cd $(CURDIR)/heartwood ; git fetch && git checkout $(HEARTWOOD_VERSION)
