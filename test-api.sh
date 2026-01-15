#!/bin/bash

# Test script for Manage Easy API
# This tests all CRUD operations locally

BASE_URL="http://127.0.0.1:5001/manage-easy-1768423759/us-central1"

# For testing, we'll use a mock token
# In production, you'd get this from Firebase Auth
# For emulator testing, we can skip auth validation temporarily
TEST_TOKEN="test-token-123"

echo "================================"
echo "Testing Manage Easy API"
echo "================================"
echo ""

# Test 1: Create an Idea
echo "1. Creating an Idea..."
IDEA_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/createIdea?token=${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build a mobile app",
    "description": "Create a mobile version of our task manager"
  }')
echo "Response: $IDEA_RESPONSE"
IDEA_ID=$(echo $IDEA_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Idea ID: $IDEA_ID"
echo ""

# Test 2: List Ideas
echo "2. Listing all Ideas..."
curl -s "${BASE_URL}/listIdeas?token=${TEST_TOKEN}" | jq '.'
echo ""

# Test 3: Create a Feature under the Idea
echo "3. Creating a Feature for the Idea..."
FEATURE_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/createFeature?token=${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"ideaId\": \"${IDEA_ID}\",
    \"title\": \"User authentication\",
    \"description\": \"Implement login and signup\"
  }")
echo "Response: $FEATURE_RESPONSE"
FEATURE_ID=$(echo $FEATURE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Feature ID: $FEATURE_ID"
echo ""

# Test 4: Create a Task for the Feature
echo "4. Creating a Task for the Feature..."
TASK_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/createTask?token=${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"featureId\": \"${FEATURE_ID}\",
    \"title\": \"Design login form\",
    \"description\": \"Create UI mockups for login screen\"
  }")
echo "Response: $TASK_RESPONSE"
TASK_ID=$(echo $TASK_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Task ID: $TASK_ID"
echo ""

# Test 5: Create a Bug for the Feature
echo "5. Creating a Bug for the Feature..."
BUG_RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/createBug?token=${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"featureId\": \"${FEATURE_ID}\",
    \"title\": \"Login button not responding\",
    \"description\": \"Button click does nothing\"
  }")
echo "Response: $BUG_RESPONSE"
BUG_ID=$(echo $BUG_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Bug ID: $BUG_ID"
echo ""

# Test 6: Update Task status
echo "6. Updating Task status to IN_PROGRESS..."
curl -s -X POST \
  "${BASE_URL}/updateTask?token=${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${TASK_ID}\",
    \"status\": \"IN_PROGRESS\"
  }" | jq '.'
echo ""

# Test 7: List all Tasks for the Feature
echo "7. Listing all Tasks for the Feature..."
curl -s "${BASE_URL}/listTasks?token=${TEST_TOKEN}&featureId=${FEATURE_ID}" | jq '.'
echo ""

# Test 8: List all Bugs for the Feature
echo "8. Listing all Bugs for the Feature..."
curl -s "${BASE_URL}/listBugs?token=${TEST_TOKEN}&featureId=${FEATURE_ID}" | jq '.'
echo ""

# Test 9: List all Features for the Idea
echo "9. Listing all Features for the Idea..."
curl -s "${BASE_URL}/listFeatures?token=${TEST_TOKEN}&ideaId=${IDEA_ID}" | jq '.'
echo ""

echo "================================"
echo "All tests completed!"
echo "================================"
echo ""
echo "Check the Firestore Emulator UI at: http://127.0.0.1:4000/firestore"
echo "Check all Functions at: http://127.0.0.1:4000/functions"
