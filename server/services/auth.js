const jwt = require('jsonwebtoken');

function setTeacher(teacher) {
    return jwt.sign(
        {
            id: teacher.teacher_id,
            role: 'teacher'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}


function setAdmin(admin) {
    return jwt.sign(
        {
            id: admin.admin_id,
            role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function getUser(token) {
    if (!token) return null;
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}



module.exports = {
    setTeacher,
    setAdmin,
    getUser
}
