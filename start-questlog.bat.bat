@echo off
cd /d C:\Users\mudbh\Desktop\Projects\QuestLog
call venv\Scripts\activate
:loop
uvicorn main:app --host 0.0.0.0 --port 8000
echo Server stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto loop