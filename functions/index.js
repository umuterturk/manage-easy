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

// ============== IDEAS ==============

exports.createIdea = onRequest(async (req, res) => {
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

exports.listIdeas = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);

    const snapshot = await db.collection("users")
      .doc(userId)
      .collection("ideas")
      .orderBy("createdAt", "desc")
      .get();

    const ideas = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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

exports.updateIdea = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, title, description, status, tags } = req.body;

    if (!id) {
      return sendError(res, 400, "Idea ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (status !== undefined) {
      const validStatuses = ["CREATED", "TODO", "IN_PROGRESS", "DONE"];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid status");
      }
      updates.status = status;
    }

    await db.collection("users")
      .doc(userId)
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

exports.deleteIdea = onRequest(async (req, res) => {
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

exports.createFeature = onRequest(async (req, res) => {
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
        taskIds: [],
        bugIds: [],
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

exports.listFeatures = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { ideaId } = req.query;

    let query = db.collection("users")
      .doc(userId)
      .collection("features")
      .where("archived", "==", false);

    if (ideaId) {
      query = query.where("ideaId", "==", ideaId);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const features = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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

exports.updateFeature = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, title, description, status, tags, archived } = req.body;

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

    await db.collection("users")
      .doc(userId)
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

exports.deleteFeature = onRequest(async (req, res) => {
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

exports.createTask = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { ideaId, featureId, title, description, creatorName, status, tags } = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const taskStatus = status || "CREATED";

    // Get the highest order for tasks in this idea/status to place new task at the end
    const existingTasks = await db.collection("users")
      .doc(userId)
      .collection("tasks")
      .where("ideaId", "==", ideaId || null)
      .where("status", "==", taskStatus)
      .orderBy("order", "desc")
      .limit(1)
      .get();

    const maxOrder = existingTasks.empty ? 0 : (existingTasks.docs[0].data().order || 0);

    const taskRef = await db.collection("users")
      .doc(userId)
      .collection("tasks")
      .add({
        ideaId: ideaId || null,
        featureId: featureId || null,
        title,
        description: description || "",
        tags: tags || [],
        status: taskStatus,
        order: maxOrder + 1,
        archived: false,
        createdBy: userId,
        creatorName: creatorName || "",
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      });

    // Update feature's taskIds
    if (featureId) {
      await db.collection("users")
        .doc(userId)
        .collection("features")
        .doc(featureId)
        .update({
          taskIds: arrayUnion(taskRef.id),
          updatedAt: getTimestamp(),
        });
    }

    return res.status(201).json({
      success: true,
      id: taskRef.id,
      message: "Task created successfully",
    });
  } catch (error) {
    console.error("Error creating task:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.listTasks = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { featureId } = req.query;

    let query = db.collection("users")
      .doc(userId)
      .collection("tasks")
      .where("archived", "==", false);

    if (featureId) {
      query = query.where("featureId", "==", featureId);
    }

    const snapshot = await query.get();

    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by order (ascending), fallback to createdAt for items without order
    tasks.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      // Fallback to createdAt if order is the same
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateA - dateB;
    });

    return res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    console.error("Error listing tasks:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.updateTask = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, title, description, status, featureId, order, tags, archived } = req.body;

    if (!id) {
      return sendError(res, 400, "Task ID is required");
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
    if (status !== undefined) {
      const validStatuses = ["CREATED", "TODO", "IN_PROGRESS", "DONE"];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid status");
      }
      updates.status = status;
    }

    await db.collection("users")
      .doc(userId)
      .collection("tasks")
      .doc(id)
      .update(updates);

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("Error updating task:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.deleteTask = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id } = req.body;

    if (!id) {
      return sendError(res, 400, "Task ID is required");
    }

    // Get the task to know which feature to update
    const taskDoc = await db.collection("users")
      .doc(userId)
      .collection("tasks")
      .doc(id)
      .get();

    if (!taskDoc.exists) {
      return sendError(res, 404, "Task not found");
    }

    const featureId = taskDoc.data().featureId;

    // Delete the task
    await db.collection("users")
      .doc(userId)
      .collection("tasks")
      .doc(id)
      .delete();

    // Remove from feature's taskIds only if featureId exists
    if (featureId) {
      await db.collection("users")
        .doc(userId)
        .collection("features")
        .doc(featureId)
        .update({
          taskIds: arrayRemove(id),
          updatedAt: getTimestamp(),
        });
    }

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

// ============== BUGS ==============

exports.createBug = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { ideaId, featureId, title, description, creatorName, status, tags } = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const bugStatus = status || "CREATED";

    // Get the highest order for bugs in this idea/status to place new bug at the end
    const existingBugs = await db.collection("users")
      .doc(userId)
      .collection("bugs")
      .where("ideaId", "==", ideaId || null)
      .where("status", "==", bugStatus)
      .orderBy("order", "desc")
      .limit(1)
      .get();

    const maxOrder = existingBugs.empty ? 0 : (existingBugs.docs[0].data().order || 0);

    const bugRef = await db.collection("users")
      .doc(userId)
      .collection("bugs")
      .add({
        ideaId: ideaId || null,
        featureId: featureId || null,
        title,
        description: description || "",
        tags: tags || [],
        status: bugStatus,
        order: maxOrder + 1,
        archived: false,
        createdBy: userId,
        creatorName: creatorName || "",
        createdAt: getTimestamp(),
        updatedAt: getTimestamp(),
      });

    // Update feature's bugIds only if featureId provided
    if (featureId) {
      await db.collection("users")
        .doc(userId)
        .collection("features")
        .doc(featureId)
        .update({
          bugIds: arrayUnion(bugRef.id),
          updatedAt: getTimestamp(),
        });
    }

    return res.status(201).json({
      success: true,
      id: bugRef.id,
      message: "Bug created successfully",
    });
  } catch (error) {
    console.error("Error creating bug:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.listBugs = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { featureId } = req.query;

    let query = db.collection("users")
      .doc(userId)
      .collection("bugs")
      .where("archived", "==", false);

    if (featureId) {
      query = query.where("featureId", "==", featureId);
    }

    const snapshot = await query.get();

    const bugs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by order (ascending), fallback to createdAt for items without order
    bugs.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      // Fallback to createdAt if order is the same
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return dateA - dateB;
    });

    return res.status(200).json({
      success: true,
      bugs,
    });
  } catch (error) {
    console.error("Error listing bugs:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.updateBug = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id, title, description, status, featureId, order, tags, archived } = req.body;

    if (!id) {
      return sendError(res, 400, "Bug ID is required");
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
    if (status !== undefined) {
      const validStatuses = ["CREATED", "TODO", "IN_PROGRESS", "DONE"];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, "Invalid status");
      }
      updates.status = status;
    }

    await db.collection("users")
      .doc(userId)
      .collection("bugs")
      .doc(id)
      .update(updates);

    return res.status(200).json({
      success: true,
      message: "Bug updated successfully",
    });
  } catch (error) {
    console.error("Error updating bug:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});

exports.deleteBug = onRequest(async (req, res) => {
  try {
    const userId = await validateToken(req);
    const { id } = req.body;

    if (!id) {
      return sendError(res, 400, "Bug ID is required");
    }

    // Get the bug to know which feature to update
    const bugDoc = await db.collection("users")
      .doc(userId)
      .collection("bugs")
      .doc(id)
      .get();

    if (!bugDoc.exists) {
      return sendError(res, 404, "Bug not found");
    }

    const featureId = bugDoc.data().featureId;

    // Delete the bug
    await db.collection("users")
      .doc(userId)
      .collection("bugs")
      .doc(id)
      .delete();

    // Remove from feature's bugIds only if featureId exists
    if (featureId) {
      await db.collection("users")
        .doc(userId)
        .collection("features")
        .doc(featureId)
        .update({
          bugIds: arrayRemove(id),
          updatedAt: getTimestamp(),
        });
    }

    return res.status(200).json({
      success: true,
      message: "Bug deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bug:", error);
    if (error.code === "auth/invalid-token") {
      return sendError(res, 401, "Invalid token");
    }
    return sendError(res, 500, error.message);
  }
});
// ============== COMMENTS ==============
exports.addComment = onRequest(async (req, res) => {
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

exports.updateComment = onRequest(async (req, res) => {
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

exports.deleteComment = onRequest(async (req, res) => {
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
