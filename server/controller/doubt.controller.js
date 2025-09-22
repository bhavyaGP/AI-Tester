const Doubt = require('../models/doubt.model');
const redis = require('../redis.connection');
const io = require('../socket.server');
const Together = require('together-ai');
const together = new Together();
async function matchdoubt(req, res) {

    try {
        const { doubtId } = req.params;
        const doubt = await Doubt.findById(doubtId);
        if (!doubt) return res.status(404).json({ error: "Doubt not found" });

        const subject = doubt.topics[0];
        const subcategory = doubt.topics[1];

        const teacherKeys = await redis.keys('teacher:*');
        let matchedTeachers = [];

        for (const key of teacherKeys) {
            const teacher = await redis.hGetAll(key);
            
            // Parse teacher's subcategories (assuming it's stored as JSON array)
            let teacherSubcategories = [];
            try {
            teacherSubcategories = teacher.subcategory ? JSON.parse(teacher.subcategory) : [];
            } catch (e) {
            // If subcategory is a string, treat it as single subcategory
            teacherSubcategories = teacher.subcategory ? [teacher.subcategory] : [];
            }
            
            // Check if teacher's field matches and has relevant subcategory
            const fieldMatch = teacher.field === subject;
            const subcategoryMatch = teacherSubcategories.some(sub => 
            sub.toLowerCase().includes(subcategory.toLowerCase()) || 
            subcategory.toLowerCase().includes(sub.toLowerCase())
            );
            
            if (fieldMatch && subcategoryMatch) {
            matchedTeachers.push({
                _id: key.split(':')[1],
                email: teacher.email,
                username: teacher.username,
                rating: parseFloat(teacher.rating),
                doubtsSolved: parseInt(teacher.doubtsSolved),
                field: teacher.field,
                subcategory: teacher.subcategory,
                certification: JSON.parse(teacher.certification)
            });
            }
        }
        //find the all teacher by subject and subcategory
        if (matchedTeachers.length === 0) {
            for (const key of teacherKeys) {
                const teacher = await redis.hGetAll(key);
                if (teacher.field === subject) {
                    matchedTeachers.push({
                        _id: key.split(':')[1],
                        email: teacher.email,
                        username: teacher.username,
                        rating: parseFloat(teacher.rating),
                        doubtsSolved: parseInt(teacher.doubtsSolved),
                        field: teacher.field,
                        subcategory: teacher.subcategory,
                    });
                }
            }
        }
        // If no exact match found, find teachers by subject only
        if (matchedTeachers.length === 0) {
            for (const key of teacherKeys) {
                const teacher = await redis.hGetAll(key);
                if (teacher.field === subject) {
                    matchedTeachers.push({
                        _id: key.split(':')[1],
                        email: teacher.email,
                        username: teacher.username,
                        rating: parseFloat(teacher.rating),
                        doubtsSolved: parseInt(teacher.doubtsSolved),
                        field: teacher.field,
                        subcategory: teacher.subcategory,
                        certification: JSON.parse(teacher.certification)
                    });
                }
            }
        }

        matchedTeachers = matchedTeachers.sort((a, b) => {
            if (b.rating === a.rating) {
                return b.doubtsSolved - a.doubtsSolved;
            }
            return b.rating - a.rating;
        }).slice(0, 3);

        let assignedTeacher = matchedTeachers.length > 0 ? matchedTeachers[0]._id : null;

        // If no teacher is found, return pending status
        if (!assignedTeacher) {
            return res.status(200).json({ message: "No online teacher found, doubt remains pending." });
        }

        // Assign the teacher to the doubt
        doubt.assignedTeacher = assignedTeacher;
        doubt.status = "assigned";
        await doubt.save();

    // Update Redis doubt status (ensure values are strings)
    await redis.HSET(`doubt:${String(doubtId)}`, 'status', 'assigned', 'teacher', String(assignedTeacher));

        // Emit notification to the assigned teacher
        if (assignedTeacher) {
            io.to(assignedTeacher).emit("new_doubt", {
                message: "A new doubt has been assigned to you",
                doubtId: doubt._id,
            });
        }
        console.log(`Doubt ${doubtId} assigned to teacher ${assignedTeacher} and notified`);
        res.status(200).json({
            message: "Teacher assigned successfully",
            doubtId,
            assignedTeacher,
            onlineteacher: matchedTeachers
        });
    } catch (error) {
        console.error("Error matching teacher:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getPendingDoubts(req, res) {
    try {
        // Get all pending doubts from Redis
        const pendingDoubts = await redis.lrange("doubt:pending", 0, -1);

        if (!pendingDoubts.length) {
            return res.status(200).json({ message: "No pending doubts" });
        }

        // Fetch full doubt details from MongoDB
        const doubts = await Doubt.find({ _id: { $in: pendingDoubts } });

        res.status(200).json(doubts);
    } catch (error) {
        console.error("Error fetching pending doubts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getTeacherDoubts(req, res) {

    try {
        const { teacherId } = req.params;

        // Fetch doubts assigned to the teacher from Redis
        const doubts = await Doubt.find({ assignedTeacher: teacherId });

        if (!doubts.length) {
            return res.status(200).json({ message: "No assigned doubts" });
        }

        res.status(200).json(doubts);
    } catch (error) {
        console.error("Error fetching teacher's doubts:", error);
        res.status(500).json({ error: "Internal server error" });
    }

}

async function setsolveddoubt(req, res) {
    try {
        const { doubtId } = req.params;
        const doubt = await Doubt.findById(doubtId);
        if (!doubt) {
            return res.status(404).json({ error: "Doubt not found" });
        }
        doubt.status = 'resolved';
        await doubt.save();
        res.status(200).json({ message: "Doubt marked as resolved" });
    } catch (error) {
        console.error("Error marking doubt as resolved:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function solvedbyai(req, res) {
    try {
        const { question } = req.body; 
        if (!question) {
            return res.status(400).json({ error: "Please provide a question" });
        }
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        const stream = await together.chat.completions.create({
            model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
            messages: [
                { role: 'user', content: question },
            ],
            stream: true,
        });
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }
        
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (error) {
        console.error("Error in AI solving doubt:", error);
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: "An error occurred" })}\n\n`);
            res.end();
        } else {
            res.status(500).json({ error: "Internal server error" });
        }
    }
}

module.exports = { matchdoubt, getPendingDoubts, getTeacherDoubts, setsolveddoubt, solvedbyai };