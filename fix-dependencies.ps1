# PowerShell script to fix Expo 500 error
Write-Host "Fixing Expo dependencies..." -ForegroundColor Green

# Step 1: Clean everything
Write-Host "`n1. Cleaning node_modules and cache..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
}
npm cache clean --force

# Step 2: Reinstall
Write-Host "`n2. Installing dependencies..." -ForegroundColor Yellow
npm install

# Step 3: Fix Expo dependencies
Write-Host "`n3. Fixing Expo SDK versions..." -ForegroundColor Yellow
npx expo install --fix

Write-Host "`n✅ Done! Now run: npx expo start --clear" -ForegroundColor Green

