@echo off
title Traders Diary Local Server
echo =======================================================
echo           Traders Diary Local Launch Utility
echo =======================================================
echo.
echo Starting the local server on your computer...
echo.
echo NOTE: Since this runs in your own command prompt,
echo it consumes ZERO AI agent credits.
echo.
echo Close this window when you are done to turn off the server.
echo.
echo =======================================================
echo.
start http://localhost:5173/
npm run dev
