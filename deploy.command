#!/bin/bash
# Build + deploy Coc Vuong.
#   ./deploy.command            -> hien menu chon moi truong
#   ./deploy.command prod       -> build .env.production -> cocvuong-se60824
#   ./deploy.command dev        -> build .env.development -> fvc-score (DB dev)
#   ./deploy.command dev-rules  -> chi deploy database.rules.json len fvc-score
set -euo pipefail
cd "$(dirname "$0")"

deploy_prod() {
  echo "==> PRODUCTION: build (.env.production) + deploy len cocvuong-se60824"
  npm run build && firebase deploy -P prod
}

deploy_dev() {
  echo "==> DEV: build (.env.development) + deploy len fvc-score (DB dev)"
  npm run build:dev && firebase deploy -P dev
}

deploy_dev_rules() {
  echo "==> DEV: chi deploy database rules len fvc-score"
  firebase deploy -P dev --only database
}

target="${1:-}"

if [ -z "$target" ]; then
  echo "Chon moi truong deploy:"
  echo "  1) Production - cocvuong-se60824 (.env.production)"
  echo "  2) Dev        - fvc-score, DB dev (.env.development)"
  echo "  3) Dev        - chi database rules"
  echo "  q) Thoat"
  read -r -p "Lua chon [1/2/3/q]: " choice
  case "$choice" in
    1) target="prod" ;;
    2) target="dev" ;;
    3) target="dev-rules" ;;
    q|Q|"") echo "Da huy."; exit 0 ;;
    *) echo "Lua chon khong hop le: $choice" >&2; exit 1 ;;
  esac
fi

case "$target" in
  prod) deploy_prod ;;
  dev) deploy_dev ;;
  dev-rules) deploy_dev_rules ;;
  *) echo "Tham so khong hop le: $target (dung: prod | dev | dev-rules)" >&2; exit 1 ;;
esac
