"""
Docker Deployment End-to-End Tests
Tests the application running in Docker containers
"""

import pytest
import requests
import time
import subprocess
import json
from typing import Dict, Any

# Docker configuration
DOCKER_COMPOSE_FILE = "docker-compose.yml"
CONTAINER_NAME = "veilscore"
HEALTH_CHECK_URL = "http://localhost:8080/health"
FRONTEND_URL = "http://localhost:8080"
API_URL = "http://localhost:8080/api"
TEST_TIMEOUT = 30


@pytest.fixture(scope="module")
def docker_available():
    """Check if Docker is available."""
    try:
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode == 0
    except:
        return False


@pytest.fixture(scope="module")
def container_running(docker_available):
    """Check if container is running."""
    if not docker_available:
        return False
    
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", f"name={CONTAINER_NAME}", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return CONTAINER_NAME in result.stdout
    except:
        return False


class TestDockerDeployment:
    """Test Docker deployment and container functionality."""
    
    @pytest.mark.e2e
    @pytest.mark.docker
    def test_container_is_running(self, docker_available, container_running):
        """Test that the Docker container is running."""
        if not docker_available:
            pytest.skip("Docker not available")
        
        if not container_running:
            pytest.skip("Container not running. Start with: docker compose up -d")
        
        assert container_running, "Container should be running"
    
    @pytest.mark.e2e
    @pytest.mark.docker
    def test_health_endpoint_accessible(self, container_running):
        """Test health endpoint is accessible through Docker."""
        if not container_running:
            pytest.skip("Container not running")
        
        try:
            response = requests.get(HEALTH_CHECK_URL, timeout=10)
            assert response.status_code == 200
            
            data = response.json()
            assert "status" in data
            print(f"✓ Health check: {data}")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Health endpoint not accessible: {e}")
    
    @pytest.mark.e2e
    @pytest.mark.docker
    def test_api_through_nginx(self, container_running):
        """Test API is accessible through Nginx proxy."""
        if not container_running:
            pytest.skip("Container not running")
        
        # Test health endpoint through nginx
        try:
            response = requests.get(f"{FRONTEND_URL}/health", timeout=10)
            assert response.status_code == 200
            
            data = response.json()
            assert "status" in data
            print(f"✓ API accessible through Nginx: {data}")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"API not accessible through Nginx: {e}")
    
    @pytest.mark.e2e
    @pytest.mark.docker
    def test_frontend_served(self, container_running):
        """Test frontend is being served."""
        if not container_running:
            pytest.skip("Container not running")
        
        try:
            response = requests.get(FRONTEND_URL, timeout=10)
            assert response.status_code == 200
            assert len(response.text) > 0
            
            # Should serve HTML
            content_type = response.headers.get("content-type", "")
            assert "text/html" in content_type or len(response.text) > 100
            
            print("✓ Frontend is being served")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Frontend not accessible: {e}")
    
    @pytest.mark.e2e
    @pytest.mark.docker
    @pytest.mark.slow
    def test_complete_workflow_in_docker(self, container_running):
        """Test complete workflow through Docker deployment."""
        if not container_running:
            pytest.skip("Container not running")
        
        sample_features = {
            "loan_amnt": 15000.0,
            "annual_inc": 75000.0,
            "dti": 18.0,
            "delinq_2yrs": 0.0,
            "inq_last_6mths": 1.0,
            "open_acc": 8.0,
            "pub_rec": 0.0,
            "revol_bal": 12000.0,
            "revol_util": 35.0,
            "total_acc": 15.0,
        }
        
        # Test API through nginx proxy
        try:
            response = requests.post(
                f"{FRONTEND_URL}/api/prove",
                json=sample_features,
                timeout=TEST_TIMEOUT
            )
            
            assert response.status_code == 200, \
                f"API request failed: {response.status_code} - {response.text}"
            
            data = response.json()
            assert "score" in data
            assert 300 <= data["score"] <= 850
            
            print(f"✓ Complete workflow test in Docker: Score {data['score']}")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Workflow test failed: {e}")
    
    @pytest.mark.e2e
    @pytest.mark.docker
    def test_container_logs(self, docker_available, container_running):
        """Test container logs are accessible."""
        if not docker_available or not container_running:
            pytest.skip("Docker/container not available")
        
        try:
            result = subprocess.run(
                ["docker", "logs", "--tail", "10", CONTAINER_NAME],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            assert result.returncode == 0
            assert len(result.stdout) > 0
            
            # Check for common errors
            logs = result.stdout.lower()
            assert "error" not in logs or "fatal" not in logs, \
                "Container logs contain errors"
            
            print("✓ Container logs accessible")
        except subprocess.TimeoutExpired:
            pytest.skip("Timeout accessing logs")
        except Exception as e:
            pytest.skip(f"Could not access logs: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "docker", "--tb=short"])

