// Validation middleware for student endpoints (dev-friendly, lightweight)
function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

const validate = {};

// Validate create/update single student
validate.validateCreate = (req, res, next) => {
    const body = req.body || {};
    const errors = [];

    if (!isNonEmptyString(body.name)) errors.push('name is required and must be a non-empty string');
    // surname is optional but if provided should be a string
    if (body.surname !== undefined && typeof body.surname !== 'string') errors.push('surname must be a string');

    if (errors.length) return res.status(400).json({ errors });
    // sanitize a tiny bit
    req.body.name = String(body.name).trim();
    if (body.surname !== undefined) req.body.surname = String(body.surname).trim();
    next();
};

// Validate bulk create: expects an array of {name, surname}
validate.validateBulk = (req, res, next) => {
    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'expected an array of students in request body' });

    const errors = [];
    for (let i = 0; i < body.length; i++) {
        const item = body[i];
        if (!item || !isNonEmptyString(item.name)) errors.push({ index: i, error: 'name is required' });
        if (item && item.surname !== undefined && typeof item.surname !== 'string') errors.push({ index: i, error: 'surname must be a string' });
        // basic sanitization in place
        if (item && item.name) item.name = String(item.name).trim();
        if (item && item.surname !== undefined) item.surname = String(item.surname).trim();
    }

    if (errors.length) return res.status(400).json({ errors });
    next();
};

module.exports = validate;
