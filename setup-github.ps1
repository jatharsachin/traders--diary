Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  TradeDiary Pro GitHub Sync Setup Wizard " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will link your local diary codebase to your GitHub account."
Write-Host ""

$repoUrl = Read-Host "https://github.com/jatharsachin/traders--diary.git"

if (-not $repoUrl) {
    Write-Host "Error: Repository URL cannot be empty." -ForegroundColor Red
    Exit
}

# Remove existing remote if any and add the new one
git remote remove origin 2>$null
git remote add origin $repoUrl
git branch -M main

Write-Host "Uploading codebase to GitHub..." -ForegroundColor Yellow
git push -u origin main -f

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  ✓ Codebase successfully pushed to GitHub!       " -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Open https://vercel.com/ in your browser."
    Write-Host "2. Log in using your GitHub account."
    Write-Host "3. Click 'Add New' -> 'Project'."
    Write-Host "4. Select your 'traders-diary' repository and click 'Deploy'."
    Write-Host "5. Done! Your website will be live in 1 minute."
} else {
    Write-Host ""
    Write-Host "Error: Failed to push to GitHub." -ForegroundColor Red
    Write-Host "Make sure you have created the repository online and have permission to push." -ForegroundColor Red
}
