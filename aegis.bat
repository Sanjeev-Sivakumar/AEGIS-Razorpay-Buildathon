@echo off
setlocal
set PYTHONIOENCODING=utf-8
python "%~dp0backend\cli\main.py" %*
