#!/usr/bin/env python3
"""
Test script voor de boekeninventarisatie applicatie.
Dit script test de API endpoints en functionaliteit.
"""

import requests
import json
import os
import time

# Test configuratie
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def test_api_health():
    """Test of de API bereikbaar is"""
    print("🔍 Test API health...")
    try:
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print("✅ API is bereikbaar")
            return True
        else:
            print(f"❌ API health check gefaald: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Kan geen verbinding maken met de API")
        print("   Zorg ervoor dat de backend draait: python -m uvicorn backend.main:app --reload")
        return False

def test_get_books():
    """Test het ophalen van boeken"""
    print("📚 Test GET /api/books...")
    try:
        response = requests.get(f"{API_BASE}/books")
        if response.status_code == 200:
            books = response.json()
            print(f"✅ {len(books)} boeken gevonden in database")
            return True
        else:
            print(f"❌ GET /api/books gefaald: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Fout bij testen GET /api/books: {e}")
        return False

def test_process_stack_without_image():
    """Test process-stack endpoint zonder afbeelding (moet fout geven)"""
    print("🖼️ Test POST /api/process-stack zonder afbeelding...")
    try:
        data = {
            'rij': '1',
            'kolom': 'A',
            'stapel': 'voor'
        }
        response = requests.post(f"{API_BASE}/process-stack", data=data)
        if response.status_code == 422:  # Validation error
            print("✅ Correcte foutmelding voor ontbrekende afbeelding")
            return True
        else:
            print(f"❌ Onverwachte response: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Fout bij testen: {e}")
        return False

def test_invalid_input():
    """Test validatie van input"""
    print("🔍 Test input validatie...")
    
    # Test ongeldige rij
    try:
        data = {'rij': '999', 'kolom': 'A', 'stapel': 'voor'}
        response = requests.post(f"{API_BASE}/process-stack", data=data)
        if response.status_code == 400:
            print("✅ Correcte validatie voor ongeldige rij")
        else:
            print(f"❌ Onverwachte response voor ongeldige rij: {response.status_code}")
    except Exception as e:
        print(f"❌ Fout bij testen validatie: {e}")
    
    # Test ongeldige stapel
    try:
        data = {'rij': '1', 'kolom': 'A', 'stapel': 'invalid'}
        response = requests.post(f"{API_BASE}/process-stack", data=data)
        if response.status_code == 400:
            print("✅ Correcte validatie voor ongeldige stapel")
        else:
            print(f"❌ Onverwachte response voor ongeldige stapel: {response.status_code}")
    except Exception as e:
        print(f"❌ Fout bij testen validatie: {e}")

def main():
    print("🧪 Start applicatie tests...")
    print("=" * 50)
    
    # Test API health
    if not test_api_health():
        print("\n❌ API health check gefaald. Stop tests.")
        return
    
    print()
    
    # Test GET books
    test_get_books()
    print()
    
    # Test process stack zonder afbeelding
    test_process_stack_without_image()
    print()
    
    # Test input validatie
    test_invalid_input()
    print()
    
    print("=" * 50)
    print("✅ Tests voltooid!")
    print("\n📋 Volgende stappen:")
    print("1. Test de frontend op http://localhost:5173")
    print("2. Upload een echte foto om de volledige functionaliteit te testen")
    print("3. Check de database voor toegevoegde boeken")

if __name__ == "__main__":
    main() 