const {onRequest} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

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
  return admin.firestore.FieldValue.serverTimestamp();
};

// Helper for arrayUnion
const arrayUnion = (...elements) => admin.firestore.FieldValue.arrayUnion(...elements);

// Helper for arrayRemove
const arrayRemove = (...elements) => admin.firestore.FieldValue.arrayRemove(...elements);

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
    const {title, description} = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const ideaRef = await db.collection("users")
        .doc(userId)
        .collection("ideas")
        .add({
          title,
          description: description || "",
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
    const {id, title, description, status} = req.body;

    if (!id) {
      return sendError(res, 400, "Idea ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
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
    const {id} = req.body;

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
    const {ideaId, title, description} = req.body;

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
          status: "CREATED",
          taskIds: [],
          bugIds: [],
          createdBy: userId,
          createdAt: getTimestamp(),
          updatedAt: getTimestamp(),
        });

    // Update idea's featureIds (skip in emulator due to FieldValue issues)
    if (!process.env.FUNCTIONS_EMULATOR) {
      await db.collection("users")
          .doc(userId)
          .collection("ideas")
          .doc(ideaId)
          .update({
            featureIds: arrayUnion(featureRef.id),
            updatedAt: getTimestamp(),
          });
    }

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
    const {ideaId} = req.query;

    let query = db.collection("users")
        .doc(userId)
        .collection("features");

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
    const {id, title, description, status} = req.body;

    if (!id) {
      return sendError(res, 400, "Feature ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
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
    const {id} = req.body;

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

    // Remove from idea's featureIds (skip in emulator due to FieldValue issues)
    if (!process.env.FUNCTIONS_EMULATOR) {
      await db.collection("users")
          .doc(userId)
          .collection("ideas")
          .doc(ideaId)
          .update({
            featureIds: arrayRemove(id),
            updatedAt: getTimestamp(),
          });
    }

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
    const {ideaId, featureId, title, description} = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const taskRef = await db.collection("users")
        .doc(userId)
        .collection("tasks")
        .add({
          ideaId: ideaId || null,
          featureId: featureId || null,
          title,
          description: description || "",
          status: "CREATED",
          createdBy: userId,
          createdAt: getTimestamp(),
          updatedAt: getTimestamp(),
        });

    // Update feature's taskIds (skip in emulator due to FieldValue issues)
    if (featureId && !process.env.FUNCTIONS_EMULATOR) {
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
    const {featureId} = req.query;

    let query = db.collection("users")
        .doc(userId)
        .collection("tasks");

    if (featureId) {
      query = query.where("featureId", "==", featureId);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const tasks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
    const {id, title, description, status, featureId} = req.body;

    if (!id) {
      return sendError(res, 400, "Task ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (featureId !== undefined) updates.featureId = featureId;
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
    const {id} = req.body;

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

    // Remove from feature's taskIds (skip in emulator due to FieldValue issues)
    if (!process.env.FUNCTIONS_EMULATOR) {
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
    const {ideaId, featureId, title, description} = req.body;

    if (!title) {
      return sendError(res, 400, "Title is required");
    }

    const bugRef = await db.collection("users")
        .doc(userId)
        .collection("bugs")
        .add({
          ideaId: ideaId || null,
          featureId: featureId || null,
          title,
          description: description || "",
          status: "CREATED",
          createdBy: userId,
          createdAt: getTimestamp(),
          updatedAt: getTimestamp(),
        });

    // Update feature's bugIds only if featureId provided (skip in emulator due to FieldValue issues)
    if (featureId && !process.env.FUNCTIONS_EMULATOR) {
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
    const {featureId} = req.query;

    let query = db.collection("users")
        .doc(userId)
        .collection("bugs");

    if (featureId) {
      query = query.where("featureId", "==", featureId);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();

    const bugs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
    const {id, title, description, status, featureId} = req.body;

    if (!id) {
      return sendError(res, 400, "Bug ID is required");
    }

    const updates = {
      updatedAt: getTimestamp(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (featureId !== undefined) updates.featureId = featureId;
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
    const {id} = req.body;

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

    // Remove from feature's bugIds (skip in emulator due to FieldValue issues)
    if (!process.env.FUNCTIONS_EMULATOR) {
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
