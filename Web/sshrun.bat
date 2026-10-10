@echo off
set SSH_ASKPASS=C:\Projects\Laundry Basket\Web\askpass.bat
set SSH_ASKPASS_REQUIRE=force
"C:\Windows\System32\OpenSSH\ssh.exe" -p 65002 -o StrictHostKeyChecking=no u130958259@217.21.91.112 %*
