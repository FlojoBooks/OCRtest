#!/usr/bin/env python3
"""
Script om de React frontend te builden en te kopiëren naar de backend static directory.
Dit zorgt ervoor dat de frontend wordt geserveerd door de FastAPI backend.
"""

import os
import subprocess
import shutil
from pathlib import Path

def build_frontend():
    """Build de React frontend en kopieer naar backend/static"""
    
    print("🔨 Building React frontend...")
    
    # Ga naar frontend directory
    frontend_dir = Path("frontend")
    if not frontend_dir.exists():
        print("❌ Frontend directory niet gevonden!")
        return False
    
    os.chdir(frontend_dir)
    
    # Installeer dependencies
    print("📦 Installing dependencies...")
    try:
        subprocess.run(["npm", "install"], check=True)
    except subprocess.CalledProcessError:
        print("❌ Fout bij installeren van dependencies")
        return False
    
    # Build de applicatie
    print("🏗️ Building application...")
    try:
        subprocess.run(["npm", "run", "build"], check=True)
    except subprocess.CalledProcessError:
        print("❌ Fout bij builden van applicatie")
        return False
    
    # Ga terug naar root directory
    os.chdir("..")
    
    # Maak static directory in backend
    static_dir = Path("backend/static")
    static_dir.mkdir(exist_ok=True)
    
    # Kopieer build files naar backend static
    dist_dir = frontend_dir / "dist"
    if dist_dir.exists():
        print("📁 Kopieer build files naar backend...")
        
        # Verwijder oude static files
        if static_dir.exists():
            shutil.rmtree(static_dir)
        
        # Kopieer nieuwe build files
        shutil.copytree(dist_dir, static_dir)
        
        print("✅ Frontend succesvol gebouwd en gekopieerd!")
        return True
    else:
        print("❌ Build directory niet gevonden!")
        return False

if __name__ == "__main__":
    build_frontend() 