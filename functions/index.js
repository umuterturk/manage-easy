const { onRequest: baseOnRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

admin.initializeApp();

const db = admin.firestore();

// Configure Firestore to use emulator if running locally
if (process.env.FUNCTIONS_EMULATOR) {
  db.settings({
    host: "127.0.0.1:8080",
    ssl: false,
  });
}

// Helper to get Firestore timestamp
const getTimestamp = () => {
  // Use regular Date for emulator, FieldValue for production
  if (process.env.FUNCTIONS_EMULATOR) {
    return new Date();
  }
  return FieldValue.serverTimestamp();
};

// Helper for arrayUnion
const arrayUnion = (...elements) => FieldValue.arrayUnion(...elements);

// Helper for arrayRemove
const arrayRemove = (...elements) => FieldValue.arrayRemove(...elements);

// Helper function to validate token and get userId
// Helper function to validate token and get userId
async function validateToken(req) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;

  if (!token) {
    throw new Error("No token provided");
  }

  // 1. Check for API Key (starts with me_sk_)
  if (token.startsWith("me_sk_")) {
    const apiKeyDoc = await db.collection("apiKeys").doc(token).get();
    if (!apiKeyDoc.exists) {
      throw new Error("Invalid API Key");
    }
    return apiKeyDoc.data().userId;
  }

  // 2. For emulator testing, allow test tokens
  if (process.env.FUNCTIONS_EMULATOR && token.startsWith("test-")) {
    // Legacy support for existing tests
    if (token === "test-token-123") return "test-user-123";
    // Allow simulating other users
    return token;
  }

  const decodedToken = await admin.auth().verifyIdToken(token);
  return decodedToken.uid;
}

// Helper function to send error response
function sendError(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    error: message,
  });
}

const cors = require('cors')({ origin: true });

// Custom onRequest wrapper to force CORS
const onRequest = (optsOrHandler, handler) => {
  let opts = {};
  let func = handler;
  if (typeof optsOrHandler === 'function') {
    func = optsOrHandler;
    opts = {};
  } else {
    opts = { ...optsOrHandler };
  }

  // Remove declaritive cors to avoid conflict
  delete opts.cors;

  return baseOnRequest(opts, (req, res) => {
    return new Promise((resolve, reject) => {
      cors(req, res, async () => {
        try {
          await func(req, res);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      // Handle OPTIONS (preflight) where next is not called
      if (req.method === 'OPTIONS') {
        resolve();
      }
    });
  });
};

// ============== USERS ==============

exports.listAllUsers = onRequest({ cors: true }, async (req, res) => {
  try {
    await validateToken(req);

    // List batch of users, 1000 at a time.
    const listUsersResult = await admin.auth().listUsers(1000);

    const users = listUsersResult.users.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      photoURL: userRecord.photoURL,
    }));

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Error listing users:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.generateApiKey = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req); // Must be logged in via standard token first

    // Generate random key
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomString = "";
    for (let i = 0; i < 32; i++) {
      randomString += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const apiKey = `me_sk_${randomString}`;

    // Store in apiKeys collection (root level for fast lookup)
    await db.collection("apiKeys").doc(apiKey).set({
      userId,
      createdAt: getTimestamp(),
    });

    // Store reference in user's secrets (so they can see they have one/regenerate?)
    // Actually, let's just return it. The user manages it.
    // But we might want to revoke old ones?
    // For MVP, just generate new one.

    return res.status(200).json({
      success: true,
      apiKey,
    });
  } catch (error) {
    console.error("Error generating API key:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

// ============== IDEAS ==============

exports.createIdea = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { title, description, tags } = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const ideaRef = await db.collection("users")
      .doc(userId)
      .collection("ideas")
      .add({
        title,
        description: description || "",
        tags: tags || [],
        status: "CREATED",
        featureIds: [],
        assignedUserIds: [],
        createdBy: userId,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      });

    return res.status(201).json({
      success: true,
      id: ideaRef.id,
      message: "Idea created successfully",
    });
  } catch (error) {
    console.error("Error creating idea:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.listIdeas = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);

    // 1. Get my own ideas
    const myIdeasPromise = db.collection("users")
      .doc(userId)
      .collection("ideas")
      .orderBy("createdAt", "desc")
      .get();

    // 2. Get ideas assigned to me (using Collection Group Query)
    const assignedIdeasPromise = db.collectionGroup("ideas")
      .where("assignedUserIds", "array-contains", userId)
      .orderBy("createdAt", "desc")
      .get();

    const [myIdeasSnapshot, assignedIdeasSnapshot] = await Promise.all([
      myIdeasPromise,
      assignedIdeasPromise
    ]);

    // Combine and deduplicate by ID
    const ideasMap = new Map();

    const processDoc = (doc) => {
      // Extract ownerId from the document path: users/{ownerId}/ideas/{ideaId}
      const ownerId = doc.ref.parent.parent ? doc.ref.parent.parent.id : userId;

      ideasMap.set(doc.id, {
        id: doc.id,
        ownerId,
        ...doc.data(),
      });
    };

    myIdeasSnapshot.docs.forEach(processDoc);
    assignedIdeasSnapshot.docs.forEach(processDoc);

    // Convert map to array and sort by createdAt (descending)
    let ideas = Array.from(ideasMap.values());

    // Filter by tag if provided (in-memory to avoid Firestore array-contains limits with assignedUserIds)
    if (req.query.tag) {
      const filterTag = req.query.tag;
      ideas = ideas.filter(idea => idea.tags && idea.tags.includes(filterTag));
    }

    ideas.sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateB - dateA; // Descending
    });

    return res.status(200).json({
      success: true,
      ideas,
    });
  } catch (error) {
    console.error("Error listing ideas:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.updateIdea = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, title, description, status, tags, ownerId } = req.body;

    if (!id) {
      return sendError(res, 400, "Idea ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (req.body.assignedUserIds !== undefined) updates.assignedUserIds = req.body.assignedUserIds;
    if (status !== undefined) {
      const validStatuses = ["CREATED", "TODO", "IN_PROGRESS", "DONE"];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid status");
      }
      updates.status = status;
    }

    const targetUserId = ownerId || userId;

    await db.collection("users")
      .doc(targetUserId)
      .collection("ideas")
      .doc(id)
      .update(updates);

    return res.status(200).json({
      success: true,
      message: "Idea updated successfully",
    });
  } catch (error) {
    console.error("Error updating idea:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.deleteIdea = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id } = req.body;

    if (!id) {
      return sendError(res, 400, "Idea ID is required");
    }

    await db.collection("users")
      .doc(userId)
      .collection("ideas")
      .doc(id)
      .delete();

    return res.status(200).json({
      success: true,
      message: "Idea deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting idea:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.getIdea = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id } = req.query;

    if (!id) {
      return sendError(res, 400, "Idea ID is required");
    }

    // Since we don't know the owner, and it could be shared, we might need to check multiple places.
    // Ideally, the client SHOULD provide ownerId if known.
    // If not provided, we can search my ideas, then shared ideas.
    // However, for direct GET, we usually expect the caller to know the path or we search.
    // Let's assume we search in user's ideas first.

    // Optimization: If ownerId is passed in query, use it.
    let targetOwnerId = req.query.ownerId || userId;

    let doc = await db.collection("users").doc(targetOwnerId).collection("ideas").doc(id).get();

    if (!doc.exists && !req.query.ownerId) {
      // If not found in my ideas and no explicit owner given, try to find in shared ideas.
      // This is expensive (Collection Group Query for single ID?).
      // Better: require ownerId for shared items or search by ID unique constraint.
      // Making an assumption: IDs are unique enough?
      // Let's use collectionGroup search for the ID if not found locally.
      const snapshot = await db.collectionGroup("ideas").where("assignedUserIds", "array-contains", userId).get();
      // This effectively lists all shared ideas to find one. Not efficient but works for now.
      const found = snapshot.docs.find(d => d.id === id);
      if (found) {
        doc = found;
        targetOwnerId = doc.ref.parent.parent.id;
      }
    }

    if (!doc.exists) {
      return sendError(res, 404, "Idea not found");
    }

    // Check access
    const data = doc.data();
    if (targetOwnerId !== userId) {
      // Must be in assignedUserIds
      if (!data.assignedUserIds?.includes(userId)) {
        return sendError(res, 403, "Not authorized to view this idea");
      }
    }

    return res.status(200).json({
      success: true,
      idea: {
        id: doc.id,
        ownerId: targetOwnerId,
        ...data
      }
    });

  } catch (error) {
    console.error("Error getting idea:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

// ============== FEATURES ==============

exports.createFeature = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { ideaId, title, description, tags } = req.body;

    if (!ideaId || !title) {
      return sendError(res, 400, "Idea ID and title are required");
    }

    const featureRef = await db.collection("users")
      .doc(userId)
      .collection("features")
      .add({
        ideaId,
        title,
        description: description || "",
        tags: tags || [],
        status: "CREATED",
        archived: false,
        workIds: [],
        createdBy: userId,
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      });

    // Update idea's featureIds
    await db.collection("users")
      .doc(userId)
      .collection("ideas")
      .doc(ideaId)
      .update({
        featureIds: arrayUnion(featureRef.id),
        updatedAt: getTimestamp(),
      });

    return res.status(201).json({
      success: true,
      id: featureRef.id,
      message: "Feature created successfully",
    });
  } catch (error) {
    console.error("Error creating feature:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.listFeatures = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { ideaId, tag } = req.query;

    let snapshot;
    let query;

    if (ideaId) {
      // query all features for this idea (across all users)
      query = db.collectionGroup("features")
        .where("ideaId", "==", ideaId)
        .where("archived", "==", false)
        .orderBy("createdAt", "desc");
    } else {
      // Fallback to my features if no ideaId provided
      query = db.collection("users")
        .doc(userId)
        .collection("features")
        .where("archived", "==", false)
        .orderBy("createdAt", "desc");
    }

    if (tag) {
      query = query.where("tags", "array-contains", tag);
    }

    snapshot = await query.get();

    const features = snapshot.docs.map((doc) => {
      const ownerId = doc.ref.parent.parent ? doc.ref.parent.parent.id : userId;
      return {
        id: doc.id,
        ownerId,
        ...doc.data(),
      };
    });

    return res.status(200).json({
      success: true,
      features,
    });
  } catch (error) {
    console.error("Error listing features:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.updateFeature = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, title, description, status, tags, archived, ownerId } = req.body;

    if (!id) {
      return sendError(res, 400, "Feature ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (archived !== undefined) updates.archived = archived;
    if (status !== undefined) {
      const validStatuses = ["CREATED", "TODO", "IN_PROGRESS", "DONE"];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid status");
      }
      updates.status = status;
    }

    const targetUserId = ownerId || userId;

    await db.collection("users")
      .doc(targetUserId)
      .collection("features")
      .doc(id)
      .update(updates);

    return res.status(200).json({
      success: true,
      message: "Feature updated successfully",
    });
  } catch (error) {
    console.error("Error updating feature:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.deleteFeature = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id } = req.body;

    if (!id) {
      return sendError(res, 400, "Feature ID is required");
    }

    // Get the feature to know which idea to update
    const featureDoc = await db.collection("users")
      .doc(userId)
      .collection("features")
      .doc(id)
      .get();

    if (!featureDoc.exists) {
      return sendError(res, 404, "Feature not found");
    }

    const ideaId = featureDoc.data().ideaId;

    // Delete the feature
    await db.collection("users")
      .doc(userId)
      .collection("features")
      .doc(id)
      .delete();

    // Remove from idea's featureIds
    await db.collection("users")
      .doc(userId)
      .collection("ideas")
      .doc(ideaId)
      .update({
        featureIds: arrayRemove(id),
        updatedAt: getTimestamp(),
      });

    return res.status(200).json({
      success: true,
      message: "Feature deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting feature:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.getFeature = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, ownerId } = req.query;

    if (!id) {
      return sendError(res, 400, "Feature ID is required");
    }

    // Use ownerId if provided, otherwise search.
    // Features are subcollections of users.
    // If we don't know ownerId, we can find it via collection group if we have idea context or just ID.

    let targetOwnerId = ownerId || userId;
    let doc = await db.collection("users").doc(targetOwnerId).collection("features").doc(id).get();

    // If not found and no specific ownerId, try collection group (expensive fallback)
    if (!doc.exists && !ownerId) {
      // Only if we suspect it's shared? 
      // Currently no direct "assignedUserIds" on features, it's inferred from Idea or Work usually?
      // Actually Features are usually accessed via Idea context.
      // Let's rely on collectionGroup for ID look up if local fails.
      const snapshot = await db.collectionGroup("features").get(); // potentially very large.
      // Optimize: features don't have unique IDs across all users theoretically unless UUIDs.
      // Firestore IDs are random enough.
      // Use client provided ownerId is best practice.
      // But for MCP convenience:
      const found = snapshot.docs.find(d => d.id === id);
      if (found) {
        doc = found;
        targetOwnerId = doc.ref.parent.parent.id;
      }
    }

    if (!doc.exists) {
      return sendError(res, 404, "Feature not found");
    }

    // Access check:
    // If I am owner -> OK.
    // If not owner, I must have access to the Idea this feature belongs to?
    // Features have `ideaId`. Check if I have access to that Idea.
    if (targetOwnerId !== userId) {
      const featureData = doc.data();
      const ideaId = featureData.ideaId;
      // Check idea access
      // We know the owner of the idea should be the same as the feature (usually?)
      // Yes, users/X/ideas/Y/ ... features are usually parallel users/X/features.
      const ideaDoc = await db.collection("users").doc(targetOwnerId).collection("ideas").doc(ideaId).get();
      if (ideaDoc.exists) {
        const ideaData = ideaDoc.data();
        if (!ideaData.assignedUserIds?.includes(userId)) {
          return sendError(res, 403, "Not authorized to view this feature (via Idea access)");
        }
      }
    }

    return res.status(200).json({
      success: true,
      feature: {
        id: doc.id,
        ownerId: targetOwnerId,
        ...doc.data()
      }
    });

  } catch (error) {
    console.error("Error getting feature:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

// ============== TASKS ==============

// ============== WORKS ==============

exports.createWork = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { ideaId, featureId, title, description, creatorName, status, type, tags, order, ownerId, assignedTo } = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const workStatus = status || "CREATED";
    const workType = type || "TASK"; // Default to TASK

    const targetUserId = ownerId || userId;

    let finalIdeaId = ideaId;

    // Enforce Idea Binding
    if (featureId) {
      // If featureId is provided, fetch the feature to get the correct ideaId
      const featureDoc = await db.collection("users")
        .doc(targetUserId)
        .collection("features")
        .doc(featureId)
        .get();

      if (!featureDoc.exists) {
        return sendError(res, 404, "Feature not found");
      }
      finalIdeaId = featureDoc.data().ideaId;
    } else {
      // If no featureId, ideaId MUST be provided
      if (!ideaId) {
        return sendError(res, 400, "Idea ID is required if no Feature ID is provided");
      }
    }

    // SECURITY CHECK: Verify access to the Idea
    if (targetUserId !== userId) {
      const ideaDoc = await db.collection("users")
        .doc(targetUserId)
        .collection("ideas")
        .doc(finalIdeaId)
        .get();

      if (!ideaDoc.exists) {
        return sendError(res, 404, "Idea not found");
      }

      const ideaData = ideaDoc.data();
      if (!ideaData.assignedUserIds?.includes(userId)) {
        return sendError(res, 403, "Not authorized to create work for this idea");
      }
    }

    // If order is not provided, find the max order
    let workOrder = order;
    if (workOrder === undefined) {
      const existingWorks = await db.collection("users")
        .doc(targetUserId)
        .collection("works")
        .where("ideaId", "==", finalIdeaId || null)
        .where("status", "==", workStatus)
        .orderBy("order", "desc")
        .limit(1)
        .get();

      const maxOrder = existingWorks.empty ? 0 : (existingWorks.docs[0].data().order || 0);
      workOrder = maxOrder + 1;
    }

    const workRef = await db.collection("users")
      .doc(targetUserId)
      .collection("works")
      .add({
        ideaId: finalIdeaId,
        featureId: featureId || null,
        title,
        description: description || "",
        type: workType,
        tags: tags || [],
        status: workStatus,
        order: workOrder,
        archived: false,
        createdBy: userId,
        creatorName: creatorName || "",
        assignedTo: assignedTo || null, // Added
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      });

    // Update feature's workIds
    if (featureId) {
      await db.collection("users")
        .doc(targetUserId)
        .collection("features")
        .doc(featureId)
        .update({
          workIds: arrayUnion(workRef.id),
          updatedAt: getTimestamp(),
        });
    }

    return res.status(201).json({
      success: true,
      id: workRef.id,
      message: "Work created successfully",
    });
  } catch (error) {
    console.error("Error creating work:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.listWorks = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { featureId, ideaId } = req.query;

    let snapshot;

    // Build Query
    // Use Collection Group if filtering by featureId or ideaId (Shared Access)
    let query;
    if (featureId || ideaId) {
      query = db.collectionGroup("works").where("archived", "==", false);

      if (featureId) {
        query = query.where("featureId", "==", featureId);
      }
      if (ideaId) {
        query = query.where("ideaId", "==", ideaId);
      }
    } else {
      // Fallback to my works
      query = db.collection("users")
        .doc(userId)
        .collection("works")
        .where("archived", "==", false);
    }

    if (req.query.tag) {
      query = query.where("tags", "array-contains", req.query.tag);
    }

    snapshot = await query.get();

    const works = snapshot.docs.map((doc) => {
      const ownerId = doc.ref.parent.parent ? doc.ref.parent.parent.id : userId;
      return {
        id: doc.id,
        ownerId,
        ...doc.data(),
      };
    });

    // Sort by order (ascending), fallback to createdAt
    works.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateA - dateB;
    });

    return res.status(200).json({
      success: true,
      works,
    });
  } catch (error) {
    console.error("Error listing works:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.updateWork = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    // Added 'type' to allowed updates
    const { id, title, description, status, type, featureId, order, tags, archived, comments, ownerId, assignedTo } = req.body;

    if (!id) {
      return sendError(res, 400, "Work ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (featureId !== undefined) updates.featureId = featureId;
    if (order !== undefined) updates.order = order;
    if (archived !== undefined) updates.archived = archived;
    if (type !== undefined) updates.type = type;
    if (comments !== undefined) updates.comments = comments;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo; // Added

    if (status !== undefined) {
      const validStatuses = ["CREATED", "TODO", "IN_PROGRESS", "DONE"];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid status");
      }
      updates.status = status;
    }

    const targetUserId = ownerId || userId;

    // Get current work doc to check for featureId or archived changes
    const workDocRef = db.collection("users")
      .doc(targetUserId)
      .collection("works")
      .doc(id);

    const workDoc = await workDocRef.get();
    if (!workDoc.exists) {
      return sendError(res, 404, "Work not found");
    }

    const oldData = workDoc.data();

    // SECURITY CHECK
    if (targetUserId !== userId) {
      // Must be assigned to the Idea of this work
      const workIdeaId = oldData.ideaId;
      if (workIdeaId) {
        const ideaDoc = await db.collection("users").doc(targetUserId).collection("ideas").doc(workIdeaId).get();
        if (ideaDoc.exists) {
          const ideaData = ideaDoc.data();
          if (!ideaData.assignedUserIds?.includes(userId) && oldData.assignedTo !== userId) {
            return sendError(res, 403, "Not authorized to update this work");
          }
        }
      } else {
        // No idea bound? Should not happen with new logic, but if so, only owner can edit.
        return sendError(res, 403, "Not authorized to update this work (orphan)");
      }
    }

    const oldFeatureId = oldData.featureId;
    const oldArchived = oldData.archived || false;

    // Perform the update
    await workDocRef.update(updates);

    // Sync workIds if featureId or archived status changed
    const newFeatureId = featureId !== undefined ? featureId : oldFeatureId;
    const newArchived = archived !== undefined ? archived : oldArchived;

    if (oldFeatureId !== newFeatureId || oldArchived !== newArchived) {
      // 1. Remove from old feature if it was active
      if (oldFeatureId && !oldArchived) {
        await db.collection("users")
          .doc(targetUserId)
          .collection("features")
          .doc(oldFeatureId)
          .update({
            workIds: arrayRemove(id),
            updatedAt: getTimestamp(),
          });
      }

      // 2. Add to new feature if it's now active
      if (newFeatureId && !newArchived) {
        await db.collection("users")
          .doc(targetUserId)
          .collection("features")
          .doc(newFeatureId)
          .update({
            workIds: arrayUnion(id),
            updatedAt: getTimestamp(),
          });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Work updated successfully",
    });
  } catch (error) {
    console.error("Error updating work:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.deleteWork = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, ownerId } = req.body;

    if (!id) {
      return sendError(res, 400, "Work ID is required");
    }

    const targetUserId = ownerId || userId;

    // Get the work to know which feature to update
    const workDoc = await db.collection("users")
      .doc(targetUserId)
      .collection("works")
      .doc(id)
      .get();

    if (!workDoc.exists) {
      return sendError(res, 404, "Work not found");
    }

    // SECURITY CHECK
    if (targetUserId !== userId) {
      // Only owner can delete? Or assigned users too?
      // Usually only owners or specific roles delete. 
      // For now, let's restrictive: Only Owner can Delete.
      // Or if I am assigned to it?
      // Let's allow if I am assigned to the work specifically or the idea owner.

      const workData = workDoc.data();
      if (workData.assignedTo !== userId) {
        return sendError(res, 403, "Not authorized to delete this work");
      }
    }

    const featureId = workDoc.data().featureId;

    // Delete the work
    await db.collection("users")
      .doc(targetUserId)
      .collection("works")
      .doc(id)
      .delete();

    // Remove from feature's workIds only if featureId exists
    if (featureId) {
      await db.collection("users")
        .doc(targetUserId)
        .collection("features")
        .doc(featureId)
        .update({
          workIds: arrayRemove(id),
          updatedAt: getTimestamp(),
        });
    }

    return res.status(200).json({
      success: true,
      message: "Work deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting work:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.getWork = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, ownerId } = req.query;

    if (!id) {
      return sendError(res, 400, "Work ID is required");
    }

    let targetOwnerId = ownerId || userId;
    let doc = await db.collection("users").doc(targetOwnerId).collection("works").doc(id).get();

    // Fallback search
    if (!doc.exists && !ownerId) {
      const snapshot = await db.collectionGroup("works").get();
      const found = snapshot.docs.find(d => d.id === id);
      if (found) {
        doc = found;
        targetOwnerId = doc.ref.parent.parent.id;
      }
    }

    if (!doc.exists) {
      return sendError(res, 404, "Work not found");
    }

    // Access check:
    // If I am owner -> OK.
    // If not owner, check check if I am assigned? OR if I have access to the Idea.
    if (targetOwnerId !== userId) {
      const workData = doc.data();
      const ideaId = workData.ideaId;
      const assignedTo = workData.assignedTo;

      let hasAccess = false;
      if (assignedTo === userId) hasAccess = true;

      if (!hasAccess && ideaId) {
        const ideaDoc = await db.collection("users").doc(targetOwnerId).collection("ideas").doc(ideaId).get();
        if (ideaDoc.exists) {
          const ideaData = ideaDoc.data();
          if (ideaData.assignedUserIds?.includes(userId)) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return sendError(res, 403, "Not authorized to view this work");
      }
    }

    return res.status(200).json({
      success: true,
      work: {
        id: doc.id,
        ownerId: targetOwnerId,
        ...doc.data()
      }
    });

  } catch (error) {
    console.error("Error getting work:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

// ============== COMMENTS ==============

exports.addComment = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { entityType, entityId, text, authorName } = req.body;

    if (!entityId || !text) {
      return sendError(res, 400, "Entity ID and text are required");
    }

    const collectionName = (entityType === 'works') ? 'works' : entityType;

    // Create a new comment object with its own ID
    const commentId = Math.random().toString(36).substring(2, 15);

    const comment = {
      id: commentId,
      text,
      authorId: userId,
      authorName: authorName || "Unknown",
      createdAt: getTimestamp(),
      updatedAt: getTimestamp(),
    };

    await db.collection("users")
      .doc(userId)
      .collection(collectionName)
      .doc(entityId)
      .update({
        comments: arrayUnion(comment),
        updatedAt: getTimestamp(),
      });

    return res.status(201).json({
      success: true,
      comment,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.updateComment = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { entityType, entityId, commentId, text } = req.body;

    if (!entityId || !commentId || !text) {
      return sendError(res, 400, "Required fields missing");
    }

    const collectionName = (entityType === 'works') ? 'works' : entityType;

    const docRef = db.collection("users")
      .doc(userId)
      .collection(collectionName)
      .doc(entityId);

    const doc = await docRef.get();
    if (!doc.exists) {
      return sendError(res, 404, "Entity not found");
    }

    const comments = doc.data().comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      return sendError(res, 404, "Comment not found");
    }

    if (comments[commentIndex].authorId !== userId) {
      return sendError(res, 403, "Not authorized to edit this comment");
    }

    comments[commentIndex].text = text;
    comments[commentIndex].updatedAt = getTimestamp();

    await docRef.update({
      comments,
      updatedAt: getTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.deleteComment = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { entityType, entityId, commentId } = req.body;

    if (!entityId || !commentId) {
      return sendError(res, 400, "Required fields missing");
    }

    const collectionName = (entityType === 'works') ? 'works' : entityType;

    const docRef = db.collection("users")
      .doc(userId)
      .collection(collectionName)
      .doc(entityId);

    const doc = await docRef.get();
    if (!doc.exists) {
      return sendError(res, 404, "Entity not found");
    }

    const comments = doc.data().comments || [];
    const comment = comments.find(c => c.id === commentId);

    if (!comment) {
      return sendError(res, 404, "Comment not found");
    }

    if (comment.authorId !== userId) {
      return sendError(res, 403, "Not authorized to delete this comment");
    }

    // Filter out the comment
    const updatedComments = comments.filter(c => c.id !== commentId);

    await docRef.update({
      comments: updatedComments,
      updatedAt: getTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});
// ============== COMMENTS ==============
exports.addComment = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { entityType, entityId, text, authorName } = req.body;

    if (!entityType || !entityId || !text) {
      return sendError(res, 400, "entityType, entityId, and text are required");
    }

    const validEntityTypes = ["tasks", "bugs"];
    if (!validEntityTypes.includes(entityType)) {
      return sendError(res, 400, "Invalid entityType");
    }

    const comment = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      authorId: userId,
      authorName: authorName || "Unknown",
      createdAt: getTimestamp(),
    };

    await db.collection("users")
      .doc(userId)
      .collection(entityType)
      .doc(entityId)
      .update({
        comments: arrayUnion(comment),
        updatedAt: getTimestamp(),
      });

    return res.status(200).json({
      success: true,
      comment,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("Error adding comment:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.updateComment = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { entityType, entityId, commentId, text } = req.body;

    if (!entityType || !entityId || !commentId || !text) {
      return sendError(res, 400, "entityType, entityId, commentId, and text are required");
    }

    const docRef = db.collection("users").doc(userId).collection(entityType).doc(entityId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return sendError(res, 404, "Entity not found");
    }

    const data = doc.data();
    const comments = data.comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      return sendError(res, 404, "Comment not found");
    }

    if (comments[commentIndex].authorId !== userId) {
      return sendError(res, 403, "Not authorized to edit this comment");
    }

    comments[commentIndex].text = text;
    comments[commentIndex].updatedAt = getTimestamp();

    await docRef.update({
      comments,
      updatedAt: getTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: comments[commentIndex],
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return sendError(res, 500, error.message);
  }
});

exports.deleteComment = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { entityType, entityId, commentId } = req.body;

    if (!entityType || !entityId || !commentId) {
      return sendError(res, 400, "entityType, entityId, and commentId are required");
    }

    const docRef = db.collection("users").doc(userId).collection(entityType).doc(entityId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return sendError(res, 404, "Entity not found");
    }

    const data = doc.data();
    const comments = data.comments || [];
    const commentIndex = comments.findIndex(c => c.id === commentId);

    if (commentIndex === -1) {
      return sendError(res, 404, "Comment not found");
    }

    if (comments[commentIndex].authorId !== userId) {
      return sendError(res, 403, "Not authorized to delete this comment");
    }

    const deletedComment = comments.splice(commentIndex, 1)[0];

    await docRef.update({
      comments,
      updatedAt: getTimestamp(),
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      commentId,
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return sendError(res, 500, error.message);
  }
});
