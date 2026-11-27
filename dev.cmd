@echo off
rem Chay BE + FE + Mobile cung luc, moi phan 1 cua so rieng.
rem Dung: npm run dev  (hoac go: dev)   tai thu muc goc repo.
rem Doi SQL Server: tao file dev.local.cmd (khong commit) voi dong:  set DB_SERVER=.\SQLEXPRESS

set "ROOT=%~dp0"
if "%DB_SERVER%"=="" set "DB_SERVER=localhost"
if exist "%ROOT%dev.local.cmd" call "%ROOT%dev.local.cmd"

echo DB server: %DB_SERVER%
echo BE     http://localhost:5075  (dien thoai: http://IP-may:5075)
echo FE     http://localhost:5174
echo Mobile Expo Go cong 8082 (quet QR trong cua so Mobile)

rem BE phai chay trong thu muc du an API (doc dung appsettings + user-secrets Cloudinary)
start "SEP BE" cmd /k "cd /d "%ROOT%BE\DayCareElderlyService.API" && dotnet run --no-launch-profile -- --urls http://0.0.0.0:5075 --environment Development "--ConnectionStrings:DefaultConnection=Server=%DB_SERVER%;Database=DayCareElderlyDB;Trusted_Connection=True;TrustServerCertificate=True;" --Cors:AllowedOrigins:4=http://localhost:8081"
start "SEP FE" cmd /k "cd /d "%ROOT%FE\day-care-elderly-service" && npm run dev -- --port 5174"
start "SEP Mobile" cmd /k "cd /d "%ROOT%Mobile" && npx expo start --lan --port 8082"
