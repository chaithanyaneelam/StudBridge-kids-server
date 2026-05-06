const { reportSchema } = require("../validators/report.validator");
const reportService = require("../services/report.service");

/**
 * Generate on-demand report for student
 * Groups by chapters and classifies topic performance
 * @param {Object} req - Express request with validated body and req.user
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
const generateReport = async (req, res, next) => {
  try {
    // Validate request body
    const validatedData = reportSchema.parse(req.body);

    // Get user_id from authenticated user
    const user_id = req.user.id;

    // Call service to generate report
    const report = await reportService.generateReport(
      user_id,
      validatedData.chapter_ids,
    );

    // Return report
    res.status(200).json({
      message: "Report generated successfully",
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateReport,
};
