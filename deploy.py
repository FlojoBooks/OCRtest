#!/usr/bin/env python3
"""
Deployment script voor Railway.
Dit script bouwt de frontend en bereidt alles voor op deployment.
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(command, description):
    """Run een command en print status"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} voltooid")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} gefaald: {e}")
        print(f"Error output: {e.stderr}")
        return False

def main():
    print("🚀 Start deployment voor Railway...")
    
    # Check of we in de juiste directory zijn
    if not Path("backend").exists() or not Path("frontend").exists():
        print("❌ Backend of frontend directory niet gevonden!")
        print("Zorg ervoor dat je in de root van het project bent.")
        sys.exit(1)
    
    # Build frontend
    print("📦 Building frontend...")
    os.chdir("frontend")
    
    if not run_command("npm install", "Installing frontend dependencies"):
        sys.exit(1)
    
    if not run_command("npm run build", "Building frontend"):
        sys.exit(1)
    
    os.chdir("..")
    
    # Kopieer build naar backend static
    print("📁 Kopieer build naar backend...")
    import shutil
    
    static_dir = Path("backend/static")
    dist_dir = Path("frontend/dist")
    
    if static_dir.exists():
        shutil.rmtree(static_dir)
    
    if dist_dir.exists():
        shutil.copytree(dist_dir, static_dir)
        print("✅ Frontend build gekopieerd naar backend/static")
    else:
        print("❌ Frontend build directory niet gevonden!")
        sys.exit(1)
    
    # Check of alle benodigde bestanden bestaan
    required_files = [
        "backend/main.py",
        "requirements.txt",
        "railway.json",
        "Procfile"
    ]
    
    print("🔍 Controleer benodigde bestanden...")
    for file_path in required_files:
        if not Path(file_path).exists():
            print(f"❌ Benodigd bestand niet gevonden: {file_path}")
            sys.exit(1)
        else:
            print(f"✅ {file_path}")
    
    print("\n🎉 Deployment voorbereiding voltooid!")
    print("Je kunt nu deployen naar Railway met:")
    print("1. Push naar GitHub")
    print("2. Connect repository aan Railway")
    print("3. Set GOOGLE_API_KEY environment variable")
    print("4. Deploy!")

if __name__ == "__main__":
    main() 