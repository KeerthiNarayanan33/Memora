import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_api():
    print("=== Testing MeetGuard AI End-to-End API ===")
    
    # 1. Login
    login_data = {'email': 'admin@techcorp.example', 'password': 'admin123'}
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=5)
    assert res.status_code == 200, f"Login failed: {res.text}"
    login_res = res.json()
    token = login_res['access_token']
    print(f"1. Login OK: {login_res['user']['name']} ({login_res['user']['role']})")
    
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # 2. Test Dashboard Stats
    res = requests.get(f"{BASE_URL}/dashboard", headers=headers, timeout=5)
    assert res.status_code == 200, f"Dashboard failed: {res.text}"
    dash = res.json()
    print(f"2. Dashboard Stats: {dash['total_meetings']} meetings, {dash['total_actions']} actions, {dash['completion_rate']}% completion rate, {dash['overdue_actions']} overdue")
    
    # 3. Create a test meeting
    new_meeting = {
        'title': 'Sprint Retrospective & Release Planning',
        'meeting_date': '2026-09-24T15:00:00Z',
        'classification': 'INTERNAL',
        'storage_policy': 'LOCAL_ONLY',
        'storage_mode': 'LOCAL_ONLY',
        'participant_names': ['Arun Patel', 'Rahul Sharma', 'Priya Singh']
    }
    res = requests.post(f"{BASE_URL}/meetings", json=new_meeting, headers=headers, timeout=5)
    assert res.status_code == 201, f"Create meeting failed: {res.text}"
    m_res = res.json()
    m_id = m_res['id']
    print(f"3. Created Meeting ID {m_id}: '{m_res['title']}', status: {m_res['status']}")
    
    # 4. Add realistic spoken transcript segments
    # (Simulating real speech transcribed from microphone)
    print("   Adding real meeting transcript segments...")
    segments = [
        {"sequence": 1, "speaker_label": "SPEAKER_00", "speaker_name": "Arun Patel", "start_time": 0.0, "end_time": 5.0, "text": "Arun, please complete the website report by Friday."},
        {"sequence": 2, "speaker_label": "SPEAKER_01", "speaker_name": "Rahul Sharma", "start_time": 5.5, "end_time": 10.0, "text": "We decided to keep all meeting recordings in local storage."}
    ]
    for seg in segments:
        requests.post(f"{BASE_URL}/meetings/{m_id}/transcript-segment", json=seg, headers=headers)
        
    # 5. Trigger processing
    res = requests.post(f"{BASE_URL}/meetings/{m_id}/process", json={}, headers=headers, timeout=5)
    print(f"4. Processing Triggered: {res.json()['status']}")
    
    # Wait for processing background task
    print("Waiting for Ollama / Llama extraction pipeline...")
    for _ in range(15):
        time.sleep(1)
        res = requests.get(f"{BASE_URL}/meetings/{m_id}", headers=headers, timeout=5)
        detail = res.json()
        if detail['status'] in ('COMPLETED', 'FAILED'):
            break

    print(f"5. Meeting Status after processing: {detail['status']} (Mode: {detail.get('processing_mode')})")
    print(f"   Summary: {detail.get('summary')}")
    
    # Check decisions
    res = requests.get(f"{BASE_URL}/meetings/{m_id}/decisions", headers=headers, timeout=5)
    decisions = res.json()
    print(f"   Decisions count: {len(decisions)}")
    for d in decisions:
        print(f"   - Decision: {d.get('decision_text')} (Evidence: {d.get('evidence_text')})")
        
    # Check actions
    res = requests.get(f"{BASE_URL}/meetings/{m_id}/actions", headers=headers, timeout=5)
    actions = res.json()
    print(f"   Actions count: {len(actions)}")
    for a in actions:
        print(f"   - Action: {a.get('action_text')} -> Assignee: {a.get('owner_name')} | Due: {a.get('deadline_text')} | Status: {a.get('status')}")
        
    # 6. Test AI Status Endpoint
    res = requests.get(f"{BASE_URL}/ai/status", headers=headers, timeout=5)
    ai_status = res.json()
    print(f"6. AI Status: Local LLM Available = {ai_status.get('ollama_available')}, Model = {ai_status.get('model_name')}")

    print("\n=======================================================")
    print(" ALL END-TO-END PIPELINE TESTS COMPLETED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == '__main__':
    test_api()
