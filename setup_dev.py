#!/usr/bin/env python3
"""
Development setup script.
Dit script helpt bij het opzetten van de lokale ontwikkelomgeving.
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(command, description, cwd=None):
    """Run een command en print status"""
    print(f"🔄 {description}...")
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            capture_output=True, 
            text=True,
            cwd=cwd
        )
        print(f"✅ {description} voltooid")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} gefaald: {e}")
        print(f"Error output: {e.stderr}")
        return False

def main():
    print("🚀 Setup lokale ontwikkelomgeving...")
    
    # Check of we in de juiste directory zijn
    if not Path("backend").exists() or not Path("frontend").exists():
        print("❌ Backend of frontend directory niet gevonden!")
        print("Zorg ervoor dat je in de root van het project bent.")
        sys.exit(1)
    
    # Setup backend
    print("\n🐍 Setup Python backend...")
    
    # Check of Python dependencies geïnstalleerd zijn
    if not run_command("pip install -r requirements.txt", "Installing Python dependencies"):
        print("❌ Fout bij installeren van Python dependencies")
        sys.exit(1)
    
    # Setup frontend
    print("\n⚛️ Setup React frontend...")
    os.chdir("frontend")
    
    if not run_command("npm install", "Installing frontend dependencies"):
        print("❌ Fout bij installeren van frontend dependencies")
        sys.exit(1)
    
    os.chdir("..")
    
    print("\n🎉 Setup voltooid!")
    print("\n📋 Volgende stappen:")
    print("1. Zorg ervoor dat je GOOGLE_API_KEY environment variable hebt ingesteld")
    print("2. Start de backend: python -m uvicorn backend.main:app --reload")
    print("3. Start de frontend: cd frontend && npm run dev")
    print("4. Open http://localhost:5173 in je browser")
    print("\n💡 Voor productie deployment:")
    print("   Run: python deploy.py")

if __name__ == "__main__":
    main() 