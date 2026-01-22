#!/bin/bash

# Test script for NODUS relay server

RELAY_URL="http://194.87.103.193:8082/relay"

echo "Testing NODUS Relay Server..."
echo "URL: $RELAY_URL"
echo ""

# Test 1: Status check
echo "1. Testing status endpoint..."
STATUS=$(curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}')
echo "Response: $STATUS"
echo ""

# Test 2: Register peer
echo "2. Testing peer registration..."
PEER_ID="test_peer_$(date +%s)"
REGISTER=$(curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"register\",\"peerId\":\"$PEER_ID\",\"info\":{\"username\":\"TestUser\"}}")
echo "Response: $REGISTER"
echo ""

# Test 3: Heartbeat
echo "3. Testing heartbeat..."
HEARTBEAT=$(curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"heartbeat\",\"peerId\":\"$PEER_ID\"}")
echo "Response: $HEARTBEAT"
echo ""

# Test 4: Call send
echo "4. Testing call send..."
CALL_ID="test_call_$(date +%s)"
CALL_SEND=$(curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"callSend\",\"to\":\"peer2\",\"from\":\"$PEER_ID\",\"callId\":\"$CALL_ID\",\"event\":\"offer\",\"kind\":\"voice\",\"payload\":{}}")
echo "Response: $CALL_SEND"
echo ""

# Test 5: Call poll
echo "5. Testing call poll..."
CALL_POLL=$(curl -s -X POST "$RELAY_URL" \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"callPoll\",\"peerId\":\"peer2\"}")
echo "Response: $CALL_POLL"
echo ""

echo "All tests completed!"
