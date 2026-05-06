const topicService = require("../services/topic.service");

/**
 * Get syllabus for logged-in student
 * Uses class_id and board_id from decoded JWT (req.user)
 * Returns nested chapter/topic structure - entire syllabus loads on student login
 */
const getSyllabus = async (req, res, next) => {
  try {
    // Get class_id and board_id from JWT payload
    const { class_id, board_id } = req.user;

    // Debug: log JWT payload
    console.log("JWT Payload (req.user):", req.user);

    if (!class_id || !board_id || isNaN(class_id) || isNaN(board_id)) {
      return res.status(400).json({
        error: "class_id and board_id are required in your account",
        received: { class_id: req.user.class_id, board_id: req.user.board_id },
      });
    }

    // Fetch nested syllabus from service
    const syllabus = await topicService.getSyllabus(class_id, board_id);

    // Return nested JSON structure
    res.status(200).json({
      message:
        syllabus.length === 0
          ? "No syllabus content yet for your class"
          : "Syllabus retrieved successfully",
      data: syllabus,
    });
  } catch (error) {
    // Pass errors to global error handler
    next(error);
  }
};

module.exports = {
  getSyllabus,
};
