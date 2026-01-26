#!/usr/bin/env bash
set -e

cd backend

# 安裝依賴（Railway build 有時沒抓到 Python 專案時，這行能救命）
python -m pip install --upgrade pip
pip install -r requirements.txt

# 啟動
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
