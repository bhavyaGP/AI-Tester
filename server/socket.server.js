const { Server } = require("socket.io");
const Chat = require("./models/chat.model");
const Doubt = require("./models/doubt.model");
const redis = require("./redis.connection");

const socketPort = process.env.SOCKET_PORT || 5002;
const io = new Server(socketPort, {
    cors: {
        origin: [
            process.env.FRONTEND_URL,
        ],
        credentials: true,
        optionsSuccessStatus: 200
    }
});

// Track active users and their rooms
const activeUsers = new Map();
// Track quiz rooms and states
const quizRooms = new Map();

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle joining chat room
    socket.on("join_chat", async ({ doubtId, userId, role }) => {
        try {
            console.log(doubtId, userId, role);
            const doubt = await Doubt.findById(doubtId);
            if (!doubt) {
                socket.emit("error", { message: "Doubt not found" });
                return;
            }

            const hasPermission = role === 'student' ? 
                doubt.student.toString() === userId :
                doubt.assignedTeacher?.toString() === userId;

            if (!hasPermission) {
                socket.emit("error", { message: "Unauthorized access" });
                return;
            }

            socket.join(doubtId);
            activeUsers.set(userId, { socketId: socket.id, doubtId, role });
            socket.emit("joined_chat", { doubtId });
            console.log(`${role} ${userId} joined chat ${doubtId}`);
        } catch (error) {
            console.error("Error joining chat:", error);
            socket.emit("error", { message: "Failed to join chat" });
        }
    });

    // Handle chat messages
    socket.on("send_message", async ({ doubtId, sender, message }) => {
        try {
            const newMessage = new Chat({ doubtId, sender, message });
            await newMessage.save();

            io.to(doubtId).emit("chat_message", {
                doubtId,
                sender,
                message,
                timestamp: new Date()
            });
        } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("error", { message: "Failed to send message" });
        }
    });

    // Handle doubt assignment notifications
    socket.on("doubt_assigned", ({ doubtId, teacherId }) => {
        try {
            // Emit notification to the assigned teacher
            io.to(teacherId).emit("new_doubt", {
                message: "A new doubt has been assigned to you",
                doubtId: doubtId
            });
            console.log(`Doubt ${doubtId} notification sent to teacher ${teacherId}`);
        } catch (error) {
            console.error("Error sending doubt notification:", error);
            socket.emit("error", { message: "Failed to notify teacher" });
        }
    });

    socket.on("doubt_status_update", ({ doubtId, status }) => {
        try {
            // Broadcast status update to all users in the doubt room
            io.to(doubtId).emit("doubt_updated", {
                doubtId,
                status
            });
            console.log(`Doubt ${doubtId} status updated to ${status}`);
        } catch (error) {
            console.error("Error updating doubt status:", error);
            socket.emit("error", { message: "Failed to update doubt status" });
        }
    });

    // Handle quiz-related events
    socket.on("join_quiz_room", ({ roomId, userId, role, studentName }) => {
        try {
            // Validate input parameters
            if (!roomId || !userId || !role) {
                socket.emit("error", { message: "Missing required parameters" });
                return;
            }

            // Initialize room if it doesn't exist
            if (!quizRooms.has(roomId)) {
                quizRooms.set(roomId, {
                    teacher: null,
                    students: [],
                    scores: {},
                    socketIds: {},
                    studentNames: {}
                });
            }

            const room = quizRooms.get(roomId);
            
            // Handle teacher join
            if (role === "teacher") {
                room.teacher = userId;
                room.socketIds[userId] = socket.id;
            } 
            // Handle student join
            else if (role === "student") {
                socket.join(roomId);
                
                // Add student if not already in the room
                if (!room.students.includes(userId)) {
                    room.students.push(userId);
                    room.scores[userId] = 0;
                }
                room.socketIds[userId] = socket.id;
                
                // Store student name
                if (studentName) {
                    room.studentNames[userId] = studentName;
                }
            }

            // Emit room update with student names
            io.to(roomId).emit('room_update', {
                students: room.students.map(studentId => ({
                    id: studentId,
                    name: room.studentNames[studentId] || `Student ${room.students.indexOf(studentId) + 1}`
                })),
                teacher: room.teacher,
                teacherName: room.teacherName || 'Teacher'
            });

        } catch (error) {
            console.error("Error in join_quiz_room:", error);
            socket.emit("error", { message: "Failed to join quiz room" });
        }
    });

    // Start Quiz
    socket.on("start_quiz", async ({ roomId, teacherId }) => {
        try {
            const room = quizRooms.get(roomId);
            if (!room || room.teacher !== teacherId) {
                socket.emit("error", { message: "Unauthorized to start quiz" });
                return;
            }

            // Get quiz data from Redis
            const quizData = await redis.get(`quiz:${roomId}`);
            console.log(quizData);
            if (!quizData) {
                socket.emit("error", { message: "No quiz found for this room" });
                return;
            }

            // Parse quiz data and emit to all users in the room
            const parsedQuizData = JSON.parse(quizData);
            console.log(parsedQuizData);
            
            // Emit to the entire room instead of individual sockets
            io.to(roomId).emit("quiz_questions", parsedQuizData);
            
            console.log(`Quiz started in room ${roomId} with ${room.students.length} students`);

        } catch (error) {
            console.error("Error starting quiz:", error);
            socket.emit("error", { message: "Failed to start quiz" });
        }
    });

    // Submit Answer
    socket.on("submit_answer", ({ roomId, userId, question, selectedOption, points }) => {
        const room = quizRooms.get(roomId);
        if (!room) return;

        // Initialize answers and points tracking if they don't exist
        if (!room.answers) {
            room.answers = {};
        }
        if (!room.points) {
            room.points = {};
        }
        if (!room.answers[userId]) {
            room.answers[userId] = 0;
        }
        if (!room.points[userId]) {
            room.points[userId] = 0;
        }
        
        // Increment answer count and update points for this student
        room.answers[userId]++;
        room.points[userId] = points;

        if (selectedOption === question.answer) {
            room.scores[userId] = (room.scores[userId] || 0) + 1;
        }

        // Calculate rankings based on points
        const rankings = Object.entries(room.points)
            .sort(([, a], [, b]) => b - a)
            .reduce((acc, [id], index) => {
                acc[id] = index + 1;
                return acc;
            }, {});

        // Emit updated scores and rankings to teacher only
        const teacherSocketId = room.socketIds[room.teacher];
        if (teacherSocketId) {
            io.to(teacherSocketId).emit("update_scores", { 
                scores: room.scores,
                points: room.points,
                rankings
            });
        }

        // Get total questions count from the question object
        const totalQuestions = question.totalQuestions || 0;

        // Check if all students have completed all questions
        const allCompleted = room.students.every(studentId => {
            return room.answers[studentId] >= totalQuestions;
        });

        if (allCompleted) {
            // Store final results in Redis with points
            const resultData = {
                roomId,
                students: room.students,
                scores: room.scores,
                points: room.points,
                rankings,
                endedAt: new Date().toISOString(),
                published: false
            };

            // Updated Redis SET with options object (EX seconds) instead of deprecated argument style
            redis.set(roomId, JSON.stringify(resultData), { EX: 3600 }); // Store for 1 hour

            // Notify teacher that quiz is complete and ready to publish
            if (teacherSocketId) {
                io.to(teacherSocketId).emit("quiz_completed", { 
                    scores: room.scores,
                    points: room.points,
                    rankings,
                    studentNames: room.studentNames
                });
            }

            // Notify students that quiz is complete and waiting for results
            room.students.forEach(studentId => {
                const studentSocketId = room.socketIds[studentId];
                if (studentSocketId) {
                    io.to(studentSocketId).emit("waiting_for_results");
                }
            });
        }
    });

    // New event handler for publishing results
    socket.on("publish_results", async ({ roomId, teacherId }) => {
        try {
            const room = quizRooms.get(roomId);
            if (!room || room.teacher !== teacherId) {
                socket.emit("error", { message: "Unauthorized to publish results" });
                return;
            }

            // Get stored results from Redis
            const resultData = await redis.get(roomId);
            if (!resultData) {
                socket.emit("error", { message: "Results not found" });
                return;
            }

            const results = JSON.parse(resultData);
            results.published = true;
            // Updated Redis SET with options object (EX seconds)
            await redis.set(roomId, JSON.stringify(results), { EX: 3600 });

            // Emit final scores to all users in the room
            io.to(roomId).emit("results_published", { 
                scores: room.scores,
                points: room.points,
                rankings: results.rankings,
                studentNames: room.studentNames
            });

            // Clean up room after a delay
            setTimeout(() => {
                quizRooms.delete(roomId);
            }, 5000);

        } catch (error) {
            console.error("Error publishing results:", error);
            socket.emit("error", { message: "Failed to publish results" });
        }
    });

    // End Quiz & Store Statistics in Redis
    socket.on("quiz_end", async ({ roomId }) => {
        const room = quizRooms.get(roomId);
        if (!room) return;

        try {
            const resultData = {
                roomId,
                students: room.students,
                scores: room.scores,
                endedAt: new Date().toISOString()
            };

            // Updated Redis SET with options object (EX seconds)
            await redis.set(roomId, JSON.stringify(resultData), { EX: 3600 }); // Store for 1 hour

            io.to(roomId).emit("final_scores", { 
                scores: room.scores,
                studentNames: room.studentNames
            });
            console.log(`Quiz results stored in Redis for room ${roomId}`);

            quizRooms.delete(roomId); // Cleanup memory
        } catch (error) {
            console.error("Error storing quiz results:", error);
            socket.emit("error", { message: "Failed to store quiz results" });
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        try {
            for (const [roomId, room] of quizRooms.entries()) {
                if (!room || !room.socketIds) continue;

                let userIdToRemove = null;
                
                // Find the user with this socket ID
                Object.entries(room.socketIds).forEach(([userId, socketId]) => {
                    if (socketId === socket.id) {
                        userIdToRemove = userId;
                    }
                });

                if (userIdToRemove) {
                    // Clean up user data
                    room.students.delete(userIdToRemove);
                    delete room.socketIds[userIdToRemove];
                    room.scores.delete(userIdToRemove);

                    // Handle teacher disconnect
                    if (room.teacher === userIdToRemove) {
                        room.teacher = null;
                    }

                    // Emit room update
                    io.to(roomId).emit("room_update", {
                        students: Array.from(room.students),
                        teacher: room.teacher
                    });

                    // Clean up empty rooms
                    if (!room.teacher && room.students.size === 0) {
                        quizRooms.delete(roomId);
                        console.log(`Room ${roomId} deleted - no participants left`);
                    }
                }
            }
        } catch (error) {
            console.error("Error handling disconnect:", error);
        }
    });

    socket.on("leave_chat", ({ doubtId, userId }) => {
        socket.leave(doubtId);
        io.to(doubtId).emit("user_left", { userId });
    });

    // Store quiz in Redis when teacher creates it
    socket.on("store_quiz", async ({ roomId, quizData, teacherId }) => {
        try {
            // Store quiz data in Redis with a prefix
            // No expiry specified previously; keep same behavior
            await redis.set(`quiz:${roomId}`, JSON.stringify(quizData));
            
            // Initialize room data
            quizRooms.set(roomId, {
                teacher: teacherId,
                students: [],
                scores: {},
                socketIds: { [teacherId]: socket.id },
                studentNames: {}
            });
            
            // Join the socket to the room
            socket.join(roomId);
            
            console.log(`Quiz stored for room ${roomId}`);
        } catch (error) {
            console.error("Error storing quiz:", error);
            socket.emit("error", { message: "Failed to store quiz" });
        }
    });

    // Verify room existence
    socket.on('verify_room', async ({ roomId, userId, role }) => {
        try {
            const exists = await redis.exists(`quiz:${roomId}`);
            socket.emit('room_verified', { 
                exists: exists === 1,  // Redis exists returns 1 if key exists, 0 if not
                roomId
            });
        } catch (error) {
            console.error("Error verifying room:", error);
            socket.emit('error', { message: 'Failed to verify room' });
        }
    });
});

console.log(`WebSocket server running on port ${socketPort}`);
module.exports = io;