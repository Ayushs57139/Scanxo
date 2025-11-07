# Downgrade to Expo SDK 51 for Expo Go compatibility
Write-Host "Downgrading to Expo SDK 51 for Expo Go compatibility..." -ForegroundColor Yellow

Write-Host "`n1. Installing Expo SDK 51..." -ForegroundColor Cyan
npm install expo@~51.0.0

Write-Host "`n2. Fixing all dependencies to SDK 51 compatible versions..." -ForegroundColor Cyan
npx expo install --fix

Write-Host "`n3. Installing expo-constants..." -ForegroundColor Cyan
npx expo install expo-constants

Write-Host "`n✅ Done! Now run: npx expo start --clear" -ForegroundColor Green
Write-Host "This should fix the PlatformConstants error!" -ForegroundColor Green

