set shell := ["bash", "-cu"]

default:
    @just --list

install:
    cd web && pnpm install
    cd worker && pnpm install

dev:
    #!/usr/bin/env bash
    set -euo pipefail
    trap 'kill 0' EXIT
    (cd worker && pnpm dev) &
    (cd web && pnpm dev) &
    wait

web:
    cd web && pnpm dev

worker:
    cd worker && pnpm dev

build:
    cd web && pnpm build

preview:
    cd web && pnpm preview

check:
    cd web && pnpm check
    cd worker && pnpm typecheck

deploy-worker:
    cd worker && pnpm deploy

clean:
    rm -rf web/build web/.svelte-kit
