#!/bin/bash
# ダブルクリックでミエールを起動します（macOS）。止めるときはこの画面で control + C。
cd "$(dirname "$0")" || exit 1
echo "ミエールを準備しています…"
npm install --no-audit --no-fund --silent || { echo "npm install に失敗しました。Node.js が入っているか確認してください。"; read -r; exit 1; }
( sleep 2; open "http://localhost:${PORT:-3000}" ) &
npm start
