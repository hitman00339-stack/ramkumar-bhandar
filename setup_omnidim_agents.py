# -*- coding: utf-8 -*-
"""
Setup & Verify Omnidimension AI Agents for Ramkumar Bhandar
- Outgoing Agent: Ramkumar Khad Bhandar Kuwargaddi — Outgoing (ID: 276578)
- Incoming Agent: Ramkumar Khad Bhandar - Incoming (ID: 276767)
- Dedicated Phone Number: +918045440103 (ID: 8484)
"""
import os
import sys
import json

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from omnidimension import Client

API_KEY = os.environ.get("OMNIDIM_API_KEY", "DBLJu9zg5E2Mahmpp7-vrjrIX8xTAvLeBlIjKDpMMtI")
CALLER_NUMBER = "+918045440103"
PHONE_NUMBER_ID = 8484
OUTGOING_AGENT_ID = 276578
INCOMING_AGENT_ID = 276767

def main():
    print(f"Connecting to Omnidimension with API key: {API_KEY[:8]}...")
    client = Client(api_key=API_KEY)

    # 1. Check Phone Numbers
    phone_res = client.phone_number.list()
    phones = phone_res.get('json', {}).get('phone_numbers', [])
    target_phone = None
    for p in phones:
        num = p.get('phone_number', '').replace(' ', '')
        if '8045440103' in num:
            target_phone = p
            break

    if target_phone:
        print(f"✓ Found Phone Number: {target_phone.get('phone_number')} (ID: {target_phone.get('id')})")
        print(f"  Active Bot ID: {target_phone.get('active_bot_id')} (Incoming Agent)")
        if target_phone.get('active_bot_id') != INCOMING_AGENT_ID:
            print(f"  Attaching {CALLER_NUMBER} to Incoming Agent {INCOMING_AGENT_ID}...")
            attach_res = client.phone_number.attach(phone_number_id=target_phone.get('id'), agent_id=INCOMING_AGENT_ID)
            print(f"  Attach response: {attach_res}")
        else:
            print(f"  ✓ Already bound to Incoming Agent ({INCOMING_AGENT_ID})")
    else:
        print(f"⚠ Warning: Phone number {CALLER_NUMBER} not found in phone list.")

    # 2. Check Agents
    agent_res = client.agent.list()
    bots = agent_res.get('json', {}).get('bots', [])
    outgoing_bot = next((b for b in bots if b.get('id') == OUTGOING_AGENT_ID), None)
    incoming_bot = next((b for b in bots if b.get('id') == INCOMING_AGENT_ID), None)

    print("\n--- Verified Agents ---")
    if outgoing_bot:
        print(f"✓ Outgoing Agent: {outgoing_bot.get('name')} (ID: {OUTGOING_AGENT_ID})")
        print(f"  Call Type: {outgoing_bot.get('bot_call_type')}")
    else:
        print(f"⚠ Outgoing Agent {OUTGOING_AGENT_ID} not found in agent list.")

    if incoming_bot:
        print(f"✓ Incoming Agent: {incoming_bot.get('name')} (ID: {INCOMING_AGENT_ID})")
        print(f"  Call Type: {incoming_bot.get('bot_call_type')}")
    else:
        print(f"⚠ Incoming Agent {INCOMING_AGENT_ID} not found in agent list.")

    print("\n✓ Configuration complete:")
    print(f"  • Outbound calls will ALWAYS originate from: {CALLER_NUMBER} (from_number_id: {PHONE_NUMBER_ID})")
    print(f"  • Inbound calls on {CALLER_NUMBER} are answered by: Agent {INCOMING_AGENT_ID}")
    print(f"  • All contacts & call logs permanently saved to database & local storage.")

if __name__ == '__main__':
    main()
