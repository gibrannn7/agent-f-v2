import unittest
from unittest.mock import patch
from app.agents.state import AgentFSharedState, FileMetadata
from app.agents.metadata_explorer import process_metadata
from app.agents.code_engine import generate_and_execute_code
from app.agents.financial_auditor import generate_auditor_narrative

class TestAgents(unittest.TestCase):

    @patch("app.agents.metadata_explorer.call_deepseek_json")
    def test_metadata_explorer(self, mock_call):
        mock_call.return_value = '{"actions": [{"column": "col1", "category": "revenue"}]}'
        state = AgentFSharedState()
        metadata = FileMetadata(file_id="f1", file_name="test.csv", shape=[10, 2], columns=["col1", "col2"])
        
        new_state = process_metadata(state, metadata)
        self.assertIn("f1", new_state.semantic_schema_register)
        self.assertEqual(len(new_state.semantic_schema_register["f1"].actions), 1)

    @patch("app.agents.code_engine.execute_sandbox_code")
    @patch("app.agents.code_engine.call_deepseek_text")
    def test_code_engine_self_healing(self, mock_llm, mock_exec):
        mock_llm.side_effect = ["bad code 1", "bad code 2", 'print("{\\"cagr\\": 0.1}")']
        mock_exec.side_effect = [
            {"status": "error", "traceback": "SyntaxError"},
            {"status": "error", "traceback": "NameError"},
            {"status": "success", "output": '{"cagr": 0.1}'}
        ]
        
        state = AgentFSharedState()
        new_state = generate_and_execute_code(state, {"anomaly": "test"})
        
        self.assertEqual(mock_llm.call_count, 3)
        self.assertEqual(mock_exec.call_count, 3)
        self.assertEqual(new_state.analytical_data.get("cagr"), 0.1)

    @patch("app.agents.financial_auditor.call_deepseek_text")
    def test_financial_auditor(self, mock_llm):
        mock_llm.return_value = "Executive Briefing: ..."
        state = AgentFSharedState(analytical_data={"cagr": 0.1})
        
        new_state = generate_auditor_narrative(state)
        self.assertIn("Executive Briefing: ...", new_state.execution_logs)

if __name__ == "__main__":
    unittest.main()
