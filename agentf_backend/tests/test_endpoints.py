import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app
from jose import jwt
from app.core.config import settings

client = TestClient(app)

def create_mock_token(tenant_id="tenant_123"):
    return jwt.encode(
        {"sub": tenant_id},
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256"
    )

class TestEndpoints(unittest.TestCase):
    def test_pipeline_process_no_auth(self):
        response = client.post("/api/v1/pipeline/process", files={"files": ("test.csv", b"mock data")})
        self.assertIn(response.status_code, [401, 403])

    @patch("app.api.v1.endpoints.pipeline.process_metadata")
    @patch("app.api.v1.endpoints.pipeline.generate_and_execute_code")
    @patch("app.api.v1.endpoints.pipeline.generate_auditor_narrative")
    def test_pipeline_process_with_auth(self, mock_auditor, mock_code, mock_metadata):
        # Setup mock returns
        from app.agents.state import AgentFSharedState
        mock_state = AgentFSharedState()
        mock_state.cleaned_data_status["global"] = "completed"
        mock_auditor.return_value = mock_state
        mock_code.return_value = mock_state
        mock_metadata.return_value = mock_state

        token = create_mock_token()
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post("/api/v1/pipeline/process", headers=headers, files=[("files", ("test.csv", b"mock data"))])
        self.assertEqual(response.status_code, 202)
        data = response.json()
        self.assertIn("session_id", data)
        self.assertEqual(data["status"], "202 Accepted")
        
        session_id = data["session_id"]
        status_resp = client.get(f"/api/v1/workspace/status/{session_id}", headers=headers)
        self.assertEqual(status_resp.status_code, 200)

if __name__ == "__main__":
    unittest.main()
