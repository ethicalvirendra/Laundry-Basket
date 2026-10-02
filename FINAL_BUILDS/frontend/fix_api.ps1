$pattern = 'const API_BASE = .*;'
$replacement = "const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';"

$files = Get-ChildItem -Path . -Include *.html, *.js -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $newContent = [regex]::Replace($content, $pattern, $replacement)
    $newContent = $newContent.Replace('fetch(`${API_BASE}/stores`)', 'fetch(`${API_BASE}/public/stores`)')
    
    if ($content -ne $newContent) {
        $newContent | Set-Content $file.FullName
        Write-Host "Updated: $($file.FullName)"
    }
}
