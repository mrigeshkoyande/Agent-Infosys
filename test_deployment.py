#!/usr/bin/env python3
"""
Test script to verify all deployment components are working correctly
"""

import sys
import os
from pathlib import Path

def test_imports():
    """Test that all modules can be imported"""
    print("\n" + "="*60)
    print("Testing Module Imports...")
    print("="*60)
    
    try:
        from backend import config
        print("✓ Config module imported")
        print(f"  - Environment: {config.ENVIRONMENT}")
        print(f"  - Port: {config.PORT}")
        print(f"  - Database: {config.SKILLBRIDGE_DB}")
    except Exception as e:
        print(f"✗ Failed to import config: {e}")
        return False
    
    try:
        from backend import db
        print("✓ Database module imported")
    except Exception as e:
        print(f"✗ Failed to import db: {e}")
        return False
    
    try:
        from backend import auth
        print("✓ Auth module imported")
    except Exception as e:
        print(f"✗ Failed to import auth: {e}")
        return False
    
    try:
        from backend import agent
        print("✓ Agent module imported")
    except Exception as e:
        print(f"✗ Failed to import agent: {e}")
        return False
    
    try:
        from backend import server
        print("✓ Server module imported")
    except Exception as e:
        print(f"✗ Failed to import server: {e}")
        return False
    
    return True


def test_database():
    """Test database initialization"""
    print("\n" + "="*60)
    print("Testing Database...")
    print("="*60)
    
    try:
        from backend import db
        db.init_db()
        print("✓ Database initialized successfully")
        
        # Check if database file exists
        if os.path.exists("data/skillbridge.db"):
            print("✓ Database file created at data/skillbridge.db")
            size = os.path.getsize("data/skillbridge.db")
            print(f"  - File size: {size} bytes")
        else:
            print("✗ Database file not created")
            return False
        
        return True
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_auth():
    """Test authentication"""
    print("\n" + "="*60)
    print("Testing Authentication...")
    print("="*60)
    
    try:
        from backend import auth
        user_id = auth.ensure_demo_user()
        print(f"✓ Demo user ensured with ID: {user_id}")
        
        # Test demo login
        result = auth.demo_login()
        if result and "token" in result and "user" in result:
            print(f"✓ Demo login successful")
            print(f"  - User: {result['user']['email']}")
            print(f"  - Token: {result['token'][:20]}...")
        else:
            print("✗ Demo login failed")
            return False
        
        return True
    except Exception as e:
        print(f"✗ Authentication test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_config():
    """Test configuration"""
    print("\n" + "="*60)
    print("Testing Configuration...")
    print("="*60)
    
    try:
        from backend import config
        
        print(f"✓ Configuration loaded")
        print(f"  - Environment: {config.ENVIRONMENT}")
        print(f"  - Debug: {config.DEBUG}")
        print(f"  - Port: {config.PORT}")
        print(f"  - Host: {config.HOST}")
        print(f"  - CORS Origin: {config.CORS_ORIGIN}")
        print(f"  - Log Level: {config.LOG_LEVEL}")
        print(f"  - Database: {config.SKILLBRIDGE_DB}")
        print(f"  - Logger: {config.logger}")
        
        return True
    except Exception as e:
        print(f"✗ Configuration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("SkillBridge Agent - Deployment Verification Test")
    print("="*60)
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Configuration", test_config()))
    results.append(("Database", test_database()))
    results.append(("Authentication", test_auth()))
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {test_name}")
    
    all_passed = all(result[1] for result in results)
    
    if all_passed:
        print("\n✓ All tests passed! Deployment is ready.")
        return 0
    else:
        print("\n✗ Some tests failed. Please fix the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
