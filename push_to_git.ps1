# 1. Set Identity
git config user.email "leelaprasad.pailaa2znaturopathy@gmail.com"
git config user.name "leelaprasad paila"

# 2. Re-stage all files (respecting .gitignore)
git add .

# 3. Create the commit (if any files are newly added)
git commit -m "Initial commit - cleaned up files"

# 4. Set branch to main
git branch -M main

# 5. Force Push (This solves the "Rejected" error)
git push -u origin main --force
