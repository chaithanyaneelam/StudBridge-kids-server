const pool = require("../config/db");

/**
 * Create a new school
 * @param {Object} data - School data (name, city, contact_person, contact_phone, head_count, per_head_fee)
 * @returns {Promise<Object>} Created school object
 */
const createSchool = async (data) => {
  const {
    name,
    city,
    contact_person,
    contact_phone,
    head_count,
    per_head_fee,
  } = data;

  const query = `
    INSERT INTO schools (name, city, contact_person, contact_phone, head_count, per_head_fee)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    name,
    city || null,
    contact_person || null,
    contact_phone || null,
    head_count || null,
    per_head_fee || null,
  ]);

  return result.rows[0];
};

/**
 * Fetch all schools ordered by creation date
 * @returns {Promise<Array>} Array of school objects
 */
const getAllSchools = async () => {
  const query = "SELECT * FROM schools ORDER BY created_at DESC;";
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Fetch single school by ID
 * @param {number} id - School ID
 * @returns {Promise<Object|null>} School object or null if not found
 */
const getSchoolById = async (id) => {
  const query = "SELECT * FROM schools WHERE id = $1;";
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

/**
 * Update school fields by ID
 * @param {number} id - School ID
 * @param {Object} data - Fields to update (name, city, contact_person, contact_phone, head_count, per_head_fee)
 * @returns {Promise<Object>} Updated school object
 */
const updateSchool = async (id, data) => {
  const {
    name,
    city,
    contact_person,
    contact_phone,
    head_count,
    per_head_fee,
  } = data;

  const query = `
    UPDATE schools 
    SET 
      name = COALESCE($2, name),
      city = COALESCE($3, city),
      contact_person = COALESCE($4, contact_person),
      contact_phone = COALESCE($5, contact_phone),
      head_count = COALESCE($6, head_count),
      per_head_fee = COALESCE($7, per_head_fee),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  const result = await pool.query(query, [
    id,
    name || null,
    city || null,
    contact_person || null,
    contact_phone || null,
    head_count || null,
    per_head_fee || null,
  ]);

  return result.rows[0];
};

module.exports = {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
};
