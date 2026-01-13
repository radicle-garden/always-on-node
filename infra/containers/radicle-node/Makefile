
RADICLE_VERSION := 1.5.0

.PHONY: build
build:
	export RADICLE_DATE=$$(echo "$(cd heartwood && git log -1 --pretty=%ct)" | tr -d '\n') ; \
	podman build \
		--build-arg RADICLE_VERSION=$(RADICLE_VERSION) \
		--build-arg PLATFORM=x86_64-unknown-linux-musl \
		.