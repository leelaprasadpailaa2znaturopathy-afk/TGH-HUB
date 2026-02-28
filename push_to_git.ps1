# 1. Set your identity (Use your correct GitHub email/name)
git config user.email "leelaprasad.pailaa2znaturopathy@gmail.com"
git config user.name "leelaprasad paila"

# 2. Re-initialize and clean the selection
# This removes everything from being tracked, so we can re-add ONLY the right files
git rm -r --cached .

# 3. Add files back (it will now correctly ignore node_modules using the new .gitignore)
git add .

# 4. Create the initial commit
git commit -m "Initial commit - cleaned up files"

# 5. Set branch to main
git branch -M main

# 6. Try to push (use -f only if necessary, but -u is better for the first time)
git push -u origin main
