$git = "C:\Users\Ashikul\AppData\Local\Programs\MinGit\cmd\git.exe"
& $git init
& $git branch -M main
& $git config user.name "directorcareerwings-cpu"
& $git config user.email "director@careerwings.in"
& $git remote remove origin 2>$null
& $git remote add origin "https://github.com/directorcareerwings-cpu/Career-Wings-Job.git"
& $git add .
& $git commit -m "Initial commit: Career Wings Full-Stack Job Portal"
& $git status
