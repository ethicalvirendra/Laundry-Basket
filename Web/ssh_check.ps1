param()
Import-Module Posh-SSH

$pass = ConvertTo-SecureString "Laundry@9985" -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential("u130958259", $pass)

Write-Host "Connecting to Hostinger..." -ForegroundColor Cyan
$session = New-SSHSession -ComputerName "217.21.91.112" -Port 65002 -Credential $cred -AcceptKey -Force

if ($session) {
    Write-Host "Connected! Session ID: $($session.SessionId)" -ForegroundColor Green
    
    $cmds = @(
        "pwd",
        "echo '--- Node Version ---' && node --version",
        "echo '--- NPM Version ---' && npm --version",
        "echo '--- PM2 ---' && pm2 --version 2>/dev/null || echo 'PM2 not found'",
        "echo '--- Home Dir ---' && ls -la ~",
        "echo '--- Domains ---' && ls ~/domains/ 2>/dev/null || ls /home/u130958259/ 2>/dev/null",
        "echo '--- App Dir ---' && ls ~/domains/laundrybasketunicorn.com/ 2>/dev/null || echo 'domain dir not found'"
    )
    
    foreach ($cmd in $cmds) {
        $result = Invoke-SSHCommand -SessionId $session.SessionId -Command $cmd
        Write-Host $result.Output
    }
    
    Remove-SSHSession -SessionId $session.SessionId
    Write-Host "Done!" -ForegroundColor Green
} else {
    Write-Host "Failed to connect!" -ForegroundColor Red
}
