#!/usr/bin/env python3
"""
Script per aggiornare tutte le chiamate fetch('/api/...') con apiPath('/api/...')
mantenendo correttamente le opzioni di fetch come secondo parametro
"""

import re
import sys

def update_fetch_calls(content: str) -> tuple[str, bool]:
    """
    Aggiorna le chiamate fetch aggiungendo apiPath() attorno al primo parametro
    """
    modified = False
    
    # Pattern 1: fetch('/api/...') -> fetch(apiPath('/api/...'))
    pattern1 = r"fetch\((['\"`])(/api/[^'\"` ]+)\1\)"
    if re.search(pattern1, content):
        content = re.sub(pattern1, r"fetch(apiPath(\1\2\1))", content)
        modified = True
    
    # Pattern 2: fetch('/api/...', {options}) -> fetch(apiPath('/api/...'), {options})
    pattern2 = r"fetch\((['\"`])(/api/[^'\"` ]+)\1,\s*\{"
    if re.search(pattern2, content):
        content = re.sub(pattern2, r"fetch(apiPath(\1\2\1), {", content)
        modified = True
    
    # Pattern 3: fetch(`/api/${...}`) -> fetch(apiPath(`/api/${...}`))
    pattern3 = r"fetch\((`/api/[^`]+`)\)"
    if re.search(pattern3, content):
        content = re.sub(pattern3, r"fetch(apiPath(\1))", content)
        modified = True
    
    # Pattern 4: fetch(`/api/${...}`, {options}) -> fetch(apiPath(`/api/${...}`), {options})
    pattern4 = r"fetch\((`/api/[^`]+`),\s*\{"
    if re.search(pattern4, content):
        content = re.sub(pattern4, r"fetch(apiPath(\1), {", content)
        modified = True
    
    return content, modified

def add_import_if_needed(content: str, modified: bool) -> str:
    """
    Aggiunge l'import di apiPath se non presente e se il file è stato modificato
    """
    if not modified:
        return content
    
    # Verifica se l'import esiste già
    if "from '@/lib/apiPath'" in content or 'from "@/lib/apiPath"' in content:
        return content
    
    # Trova il blocco di import esistente
    import_block_pattern = r'(import\s+.*?from\s+["\'].*?["\'];?\n)+'
    match = re.search(import_block_pattern, content)
    
    if match:
        # Aggiungi l'import dopo l'ultimo import esistente
        last_import_end = match.end()
        new_import = "import { apiPath } from '@/lib/apiPath';\n"
        content = content[:last_import_end] + new_import + content[last_import_end:]
    else:
        # Nessun import trovato, aggiungi all'inizio (dopo "use client" se presente)
        if '"use client"' in content:
            content = content.replace('"use client";', '"use client";\n\nimport { apiPath } from \'@/lib/apiPath\';')
        else:
            content = "import { apiPath } from '@/lib/apiPath';\n\n" + content
    
    return content

def process_file(filepath: str) -> bool:
    """
    Processa un singolo file
    Returns True se il file è stato modificato
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        updated_content, modified = update_fetch_calls(content)
        
        if modified:
            updated_content = add_import_if_needed(updated_content, modified)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f"✅ {filepath}")
            return True
        else:
            print(f"⏭️  {filepath} (già aggiornato)")
            return False
    except Exception as e:
        print(f"❌ Errore in {filepath}: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    files = [
        "src/app/requests/page.tsx",
        "src/app/dj/libere/page.tsx",
        "src/app/dj/login/page.tsx",
        "src/app/admin/diagnostics/page.tsx",
    ]
    
    modified_count = 0
    for filepath in files:
        if process_file(filepath):
            modified_count += 1
    
    print(f"\n📊 Totale file modificati: {modified_count}/{len(files)}")
