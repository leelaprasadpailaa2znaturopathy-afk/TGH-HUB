# 1. Ensure your local project is up to date
git config user.email "leelaprasad.pailaa2znaturopathy@gmail.com"
git config user.name "leelaprasad paila"

# 2. Add changes
git add .

# 3. Create a commit (If there are changes)
$commitMessage = Read-Host -Prompt 'Enter a description of your changes (e.g., "Updated UI")'
if (!$commitMessage) { $commitMessage = "Manual update $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }

git commit -m "$commitMessage"

# 4. Push to "Live" (GitHub)
git push origin main --force

Write-Output "----------------------------------------------------"
Write-Output "SUCCESS! Your code is now syncing to GitHub."
Write-Output "Visit GitHub Actions tab in your repository to see the 'Live' build progress."
Write-Output "----------------------------------------------------"
