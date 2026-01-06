"""
Pytest configuration for E2E tests
"""

import pytest
import requests
import time


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "e2e: end-to-end tests")
    config.addinivalue_line("markers", "slow: slow running tests")
    config.addinivalue_line("markers", "docker: docker deployment tests")
    config.addinivalue_line("markers", "contracts: smart contract integration tests")


@pytest.fixture(scope="session")
def wait_for_services():
    """Wait for services to be ready before running tests."""
    import requests
    
    services = {
        "api": "http://localhost:8000/health",
        "frontend": "http://localhost:8080",
    }
    
    ready = {}
    max_wait = 30
    check_interval = 2
    
    for service, url in services.items():
        ready[service] = False
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            try:
                response = requests.get(url, timeout=2)
                if response.status_code == 200:
                    ready[service] = True
                    break
            except:
                pass
            time.sleep(check_interval)
    
    return ready

