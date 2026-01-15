# Manage Easy

A simple, AI-friendly task management system built with Firebase.

## Architecture

**Backend:** Firebase Cloud Functions + Firestore
**Frontend:** Firebase Hosting (static site)
**Auth:** Firebase Authentication

## Domain Model

```
IDEA (High-level concept/goal)
├── FEATURE (Specific capability)
│   ├── TASK (Work to implement)
│   └── BUG (Problem to fix)
```

### Status States
All entities support these states:
- `CREATED` - Just created, not yet planned
- `TODO` - Ready to start
- `IN_PROGRESS` - Being worked on
- `DONE` - Completed

## Project Structure

```
manage-easy/
├── functions/              # Cloud Functions (Node.js)
│   ├── index.js           # All CRUD endpoints
│   └── package.json
├── public/                # Static web hosting
│   └── index.html
├── firestore.rules        # Database security rules
├── firestore.indexes.json # Database indexes
├── firebase.json          # Firebase configuration
├── .firebaserc           # Project selection
└── test-api.sh           # API test script
```

## API Endpoints

All endpoints require authentication via token (query param or Bearer header).

### Ideas
- `POST /createIdea` - Create a new idea
- `GET /listIdeas` - List all ideas
- `POST /updateIdea` - Update an idea
- `POST /deleteIdea` - Delete an idea

### Features
- `POST /createFeature` - Create a feature under an idea
- `GET /listFeatures?ideaId=...` - List features (optionally filtered by idea)
- `POST /updateFeature` - Update a feature
- `POST /deleteFeature` - Delete a feature

### Tasks
- `POST /createTask` - Create a task under a feature
- `GET /listTasks?featureId=...` - List tasks (optionally filtered by feature)
- `POST /updateTask` - Update a task
- `POST /deleteTask` - Delete a task

### Bugs
- `POST /createBug` - Create a bug under a feature
- `GET /listBugs?featureId=...` - List bugs (optionally filtered by feature)
- `POST /updateBug` - Update a bug
- `POST /deleteBug` - Delete a bug

## Development

### Prerequisites
- Node.js 18+
- Java 21+ (for emulators)
- Firebase CLI: `npm install -g firebase-tools`

### Local Testing

1. **Start emulators:**
```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
firebase emulators:start
```

2. **Run tests:**
```bash
./test-api.sh
```

3. **Access UIs:**
- Emulator UI: http://127.0.0.1:4000/
- Firestore: http://127.0.0.1:4000/firestore
- Functions: http://127.0.0.1:4000/functions

### Production Deployment

**Note:** Requires Firebase Blaze (pay-as-you-go) plan for Cloud Functions.

1. **Deploy everything:**
```bash
firebase deploy
```

2. **Deploy specific components:**
```bash
firebase deploy --only functions
firebase deploy --only firestore
firebase deploy --only hosting
```

## Firebase Configuration

**Project ID:** `manage-easy-1768423759`
**Console:** https://console.firebase.google.com/project/manage-easy-1768423759/overview
**Hosting URL:** https://manage-easy-1768423759.web.app

## Security

### Authentication
- Users authenticate via Firebase Auth (Google, GitHub, Email/Password)
- Each request requires a valid Firebase ID token
- Tokens are validated server-side

### Authorization
- Firestore security rules enforce user-level isolation
- Users can only access their own data
- All data is scoped under `/users/{userId}/`

### Firestore Structure
```
/users/{userId}/
  /ideas/{ideaId}
  /features/{featureId}
  /tasks/{taskId}
  /bugs/{bugId}
```

## MCP Integration

For AI agent integration via Model Context Protocol:

1. **Enable Firebase Authentication** in console
2. **Generate user token** (coming soon - dedicated endpoint)
3. **Configure MCP client** with token
4. **Use Cloud Functions** as API endpoints

Example MCP configuration:
```json
{
  "mcpServers": {
    "manage-easy": {
      "url": "https://us-central1-manage-easy-1768423759.cloudfunctions.net",
      "token": "your-firebase-id-token"
    }
  }
}
```

## Testing

The test script (`test-api.sh`) demonstrates:
1. Creating an idea
2. Creating a feature under that idea
3. Creating a task under that feature
4. Creating a bug under that feature
5. Updating task status
6. Listing all entities

All tests use a test token (`test-token-123`) which only works in emulator mode.

## Known Limitations (Emulator)

The local emulator has some limitations:
- Array operations (arrayUnion/arrayRemove) are skipped in emulator mode
- This means parent ID arrays won't be updated locally
- These operations work normally in production

## Next Steps

1. [ ] Upgrade to Firebase Blaze plan
2. [ ] Deploy functions to production
3. [ ] Enable Firebase Authentication
4. [ ] Create token generation endpoint for MCP
5. [ ] Build web UI for task management
6. [ ] Add MCP server implementation

## License

MIT
