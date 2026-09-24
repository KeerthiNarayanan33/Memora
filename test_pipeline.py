import urllib.request
import json
import time

def test_api():
    print("=== Testing MeetGuard AI End-to-End API ===")
    
    # 1. Login
    data = json.dumps({'email': 'admin@techcorp.example', 'password': 'admin123'}).encode()
    req = urllib.request.Request('http://localhost:8000/api/v1/auth/login', data=data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    login_res = json.loads(res.read().decode())
    token = login_res['access_token']
    print(f"1. Login OK: {login_res['user']['name']} ({login_res['user']['role']})")
    
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    # 2. Test Dashboard Stats
    req = urllib.request.Request('http://localhost:8000/api/v1/dashboard', headers=headers)
    dash = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"2. Dashboard Stats: {dash['total_meetings']} meetings, {dash['total_actions']} actions, {dash['completion_rate']}% completion rate, {dash['overdue_actions']} overdue")
    
    # 3. Create a test meeting
    new_meeting = {
        'title': 'Sprint Retrospective & Release Planning',
        'meeting_date': '2026-09-24T15:00:00Z',
        'classification': 'INTERNAL',
        'storage_policy': 'LOCAL_ONLY',
        'participant_names': ['Arun Patel', 'Rahul Sharma', 'Priya Singh']
    }
    req = urllib.request.Request('http://localhost:8000/api/v1/meetings', data=json.dumps(new_meeting).encode(), headers=headers)
    m_res = json.loads(urllib.request.urlopen(req).read().decode())
    m_id = m_res['id']
    print(f"3. Created Meeting ID {m_id}: '{m_res['title']}', status: {m_res['status']}")
    
    # 4. Trigger processing
    req = urllib.request.Request(f'http://localhost:8000/api/v1/meetings/{m_id}/process', data=b'{}', headers=headers)
    p_res = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"4. Processing Triggered: {p_res['status']}")
    
    # Wait for processing background task
    print("Waiting for extraction pipeline...")
    time.sleep(2)
    
    # 5. Check meeting details
    req = urllib.request.Request(f'http://localhost:8000/api/v1/meetings/{m_id}', headers=headers)
    detail = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"5. Meeting Status after processing: {detail['status']} (Mode: {detail['processing_mode']})")
    print(f"   Summary: {detail.get('summary')}")
    
    # Check decisions
    req = urllib.request.Request(f'http://localhost:8000/api/v1/meetings/{m_id}/decisions', headers=headers)
    decisions = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"   Decisions count: {len(decisions)}")
    for d in decisions:
        print(f"   - Decision: {d['decision_text']} (Requires Review: {d['requires_review']})")
        
    # Check actions
    req = urllib.request.Request(f'http://localhost:8000/api/v1/meetings/{m_id}/actions', headers=headers)
    actions = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"   Actions count: {len(actions)}")
    for a in actions:
        print(f"   - Action: {a['action_text']} -> Assignee: {a.get('owner_name')} | Due: {a.get('deadline_text')} | Status: {a.get('status')}")
        
    # 6. Test updating an action item
    if actions:
        action = actions[0]
        act_id = action['id']
        patch_data = json.dumps({'status': 'COMPLETED'}).encode()
        patch_req = urllib.request.Request(f'http://localhost:8000/api/v1/actions/{act_id}', data=patch_data, headers=headers, method='PATCH')
        act_res = json.loads(urllib.request.urlopen(patch_req).read().decode())
        print(f"6. Action Item #{act_id} updated: Status is now {act_res['status']} (Completed at: {act_res.get('completed_at')})")

    # 7. Test AI Status Endpoint
    req = urllib.request.Request('http://localhost:8000/api/v1/ai/status', headers=headers)
    ai_status = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"7. AI Status: Local LLM Available = {ai_status['ollama_available']}, Whisper Available = {ai_status['whisper_available']}")

    # 8. Test Search
    req = urllib.request.Request('http://localhost:8000/api/v1/search?q=planning', headers=headers)
    search_res = json.loads(urllib.request.urlopen(req).read().decode())
    print(f"8. Search for 'planning': found {len(search_res)} matching records across meetings, actions, and decisions.")
    for item in search_res[:3]:
        print(f"   - [{item['type'].upper()}] {item['title']} (Meeting: {item.get('meeting_title')})")

    print("\n=======================================================")
    print(" ALL END-TO-END PIPELINE TESTS COMPLETED SUCCESSFULLY!")
    print("=======================================================")

if __name__ == '__main__':
    test_api()
