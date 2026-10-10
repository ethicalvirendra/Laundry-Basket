import os
import re

pattern = r"const API_BASE = .*;"
replacement = "const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:5000/api' : '/api';"

for root, dirs, files in os.walk('.'):
    for name in files:
        if name.endswith('.html') or name.endswith('.js'):
            path = os.path.join(root, name)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = re.sub(pattern, replacement, content)
            
            # Also fix specific branch fetch in booking.html if not handled
            new_content = new_content.replace('fetch(`${API_BASE}/stores`)', 'fetch(`${API_BASE}/public/stores`)')
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {path}")
