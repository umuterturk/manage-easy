const { onRequest } = require("firebase-functions/v2/https");
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
async function validateToken(req) {
  const token = req.headers.authorization?.replace("Bearer ", "") || req.query.token;

  if (!token) {
    throw new Error("No token provided");
  }

  // For emulator testing, allow test tokens
  if (process.env.FUNCTIONS_EMULATOR && token.startsWith("test-")) {
    return "test-user-123"; // Return a test user ID
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
        assignedUserIds: [], // Added
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
    const ideas = Array.from(ideasMap.values()).sort((a, b) => {
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
    const { ideaId } = req.query;

    let snapshot;
    if (ideaId) {
      // query all features for this idea (across all users)
      snapshot = await db.collectionGroup("features")
        .where("ideaId", "==", ideaId)
        .where("archived", "==", false)
        .orderBy("createdAt", "desc")
        .get();
    } else {
      // Fallback to my features if no ideaId provided
      snapshot = await db.collection("users")
        .doc(userId)
        .collection("features")
        .where("archived", "==", false)
        .orderBy("createdAt", "desc")
        .get();
    }

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

// ============== TASKS ==============

// ============== WORKS ==============

exports.createWork = onRequest({ cors: true }, async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { ideaId, featureId, title, description, creatorName, status, type, tags, order, ownerId } = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const workStatus = status || "CREATED";
    const workType = type || "TASK"; // Default to TASK

    const targetUserId = ownerId || userId;

    // If order is not provided, find the max order
    let workOrder = order;
    if (workOrder === undefined) {
      const existingWorks = await db.collection("users")
        .doc(targetUserId)
        .collection("works")
        .where("ideaId", "==", ideaId || null)
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
        ideaId: ideaId || null,
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
    if (featureId || ideaId) {
      let query = db.collectionGroup("works").where("archived", "==", false);

      if (featureId) {
        query = query.where("featureId", "==", featureId);
      }
      if (ideaId) {
        query = query.where("ideaId", "==", ideaId);
      }

      snapshot = await query.get();
    } else {
      // Fallback to my works
      snapshot = await db.collection("users")
        .doc(userId)
        .collection("works")
        .where("archived", "==", false)
        .get();
    }

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
    const { id, title, description, status, type, featureId, order, tags, archived, comments, ownerId } = req.body;

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
      .collection("works")
      .doc(id)
      .update(updates);

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
