const Statistic = require('../models/statistic.model');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const doubtSchema = require('../models/doubt.model');
const Tesseract = require("tesseract.js");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Teacher = require('../models/teacher.model');
const Doubt = require('../models/doubt.model');
const redis = require('../redis.connection');
const { ChatGroq } = require("@langchain/groq");
const ejs = require('ejs');
const sendEmail = require('../utils/mailer');

async function storestatics(req, res) {
    try {
        const userId = req.userId;
        const { pasturl, score, totalscore, topic, mail, questions } = req.body;

        if (!pasturl || score === undefined || totalscore === undefined || !topic) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (mail && questions) {
            // Render the EJS template
            const templatePath = path.join(__dirname, '../template/statistics.ejs');
            const emailBody = await ejs.renderFile(templatePath, {
                score,
                totalscore,
                topic,
                questions
            });

            // Send email
            await sendEmail({
                to: mail,
                subject: 'Your Quiz Statistics',
                html: emailBody
            });
        }

        const newStatistic = new Statistic({
            pasturl,
            score,
            totalscore,
            topic,
            student: userId
        });

        // Store in Redis in format {studentId:{topic:[topics]}}
        const studentData = await redis.hGet(`student:${userId}`, 'statistics');
        if (studentData) {
            const studentStatistics = JSON.parse(studentData);
            if (studentStatistics[topic]) {
                studentStatistics[topic].push({ pasturl, score, totalscore });
            } else {
                studentStatistics[topic] = [{ pasturl, score, totalscore }];
            }
            await redis.HSET(`student:${String(userId)}`, 'statistics', JSON.stringify(studentStatistics));
        } else {
            const studentStatistics = { [topic]: [{ pasturl, score, totalscore }] };
            await redis.HSET(`student:${String(userId)}`, 'statistics', JSON.stringify(studentStatistics));
        }
        await redis.expire(`student:${userId}`, 86400); // Set expiration to 1 day (86400 seconds)

        await newStatistic.save();
        res.status(201).json({ message: 'Statistics saved successfully' });
    } catch (error) {
        console.error('Error saving statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getstatistics(req, res) {
    try {
        const userId = req.userId;
        const { pageNo } = req.query;
        const pageSize = 10;
        const page = parseInt(pageNo) || 1;
        const skip = (page - 1) * pageSize;
        const statistics = await Statistic.find({ student: userId }).sort({ createdAt: -1 }).skip(skip).limit(pageSize);
        res.status(200).json(statistics);
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});


const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});


async function getCategoryFromGroq(text) {
    try {
        const llm = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY,
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            maxRetries: 3,
        });

        const prompt = `Act as a query analyzer. Categorize the following question text into one of these primary categories: Mathematics, Physics, Chemistry, Biology, Computer Science, or Other.  
If the question belongs to a subdomain (e.g., Calculus, Linear Algebra with Mathematics; Computer Science with Operating Systems, Networks), classify it under the broader category along with the subdomain.  

Only respond in the following format:  
Chemistry : Inorganic (Teaching Subject)  

Here is the text: ${text}`;

        const aiMsg = await llm.invoke([
            {
                role: "system",
                content: "You are a helpful assistant that categorizes academic questions into their main subject domains."
            },
            { role: "user", content: prompt }
        ]);

        return aiMsg.content.trim();
    } catch (error) {
        console.error("Error getting category from Groq:", error);
        return "Other";
    }
}

async function getCategoryFromGemini(text) {
    try {
        // Fall back to Gemini if Groq fails
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `Act as a query analyzer. Categorize the following question text into one of these primary categories: Mathematics, Physics, Chemistry, Biology, Computer Science, or Other.  
        If the question belongs to a subdomain (e.g.,chemistry with Physical chemistry or chemistry with Organic chemistry  ,Calculus, Linear Algebra with Mathematics; Computer Science with Operating Systems, Networks , classify it under the broader category along with the subdomain. 
        Only respond with the category name and also tell me which teacher subject this question belongs to.
        !important: format should be "Computer Science : Operating System : Networks" or "Mathematics : Calculus ".
        Here is the text: ${text}`;

        const result = await model.generateContent(prompt);

        const category = result.response.text().trim();

        return category;
    } catch (error) {
        console.error("Error getting category from AI models:", error);
        return "Other";
    }
}

function parseCategoryText(text) {

    const categories = text.split(", ").map(entry => {
        const [field, subcategory] = entry.split(" : ");
        return { Field: field.trim(), Subcategory: subcategory.trim() };
    });

    return { Category: categories };
}
async function uploadFile(req, res) {
    try {
        const { type } = req.body;
        if (type == 'image') {
            if (!req.file) {
                return res.status(400).json({ error: "Please upload a file" });
            }

            const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
            const { data: { text } } = await Tesseract.recognize(req.file.path, "eng");

            let category = await getCategoryFromGroq(text);
            if (category !== "Other") {
                category = parseCategoryText(category);
            } else {
                category = { Category: [{ Field: "Other", Subcategory: "Other" }] };
            }

            const subject = category.Category[0].Field;
            const subcategory = category.Category[0].Subcategory;

            const doubt = new Doubt({
                student: req.userId,
                imageId: uuidv4(),
                name: req.file.originalname,
                image: fileUrl,
                topics: [subject, subcategory],
                status: "pending"
            });

            await doubt.save();
            await redis.HSET(`doubt:${String(doubt._id)}`, 'extractedText', String(text));

            res.status(200).json({
                message: "File uploaded successfully",
                doubtId: doubt._id,
                file: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    fileUrl: fileUrl,
                    size: req.file.size,
                    mimeType: req.file.mimetype,
                    extractedText: text,
                    topics: [subject, subcategory]
                },
                assignedTeacher: null
            });

        } else if (type === 'text') {
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ error: "Please provide text" });
            }

            let category = await getCategoryFromGroq(text);
            if (category !== "Other") {
                category = parseCategoryText(category);
            } else {
                category = { Category: [{ Field: "Other", Subcategory: "Other" }] };
            }

            const subject = category.Category[0].Field;
            const subcategory = category.Category[0].Subcategory;

            const doubt = new Doubt({
                student: req.userId,
                imageId: uuidv4(),
                name: "Text Doubt",
                image: null,
                topics: [subject, subcategory],
                status: "pending"
            });

            await doubt.save();
            await redis.HSET(`doubt:${String(doubt._id)}`, 'extractedText', String(text));

            res.status(200).json({
                message: "Text processed successfully",
                doubtId: doubt._id,
                file: null,
                extractedText: text,
                topics: [subject, subcategory],
                assignedTeacher: null
            });

        } else {
            return res.status(400).json({ error: "Invalid type. Please provide a valid type (image or text)" });
        }

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function giveratingtoteacher(req, res) {
    try {
        const { teacherId, rating } = req.body;
        if (!teacherId || rating === undefined || rating === null) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const numericRating = Number(rating);
        if (isNaN(numericRating) || numericRating < 0 || numericRating > 5) {
            return res.status(400).json({ error: "Rating must be a number between 0 and 5" });
        }

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) {
            return res.status(404).json({ error: "Teacher not found" });
        }

        const currentRating = Number(teacher.rating) || 0;
        const currentDoubtsSolved = Number(teacher.doubtsSolved) || 0;

        const newRating = Math.min(5, Math.max(0,
            (currentRating * currentDoubtsSolved + numericRating) / (currentDoubtsSolved + 1)
        ));

        if (isNaN(newRating)) {
            throw new Error('Rating calculation resulted in NaN');
        }

        teacher.rating = newRating;
        teacher.doubtsSolved = currentDoubtsSolved + 1;
    await redis.HSET(`teacher:${String(teacherId)}`, 'rating', String(newRating));
        await redis.hincrby(`teacher:${teacherId}`, 'doubtsSolved', 1);
        await teacher.save();

        res.status(200).json({
            message: "Thank you for your rating!"
        });
    }
    catch (error) {
        console.error("Error giving rating to teacher:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

async function getdoubthistory(req, res) {
    try {
        const userId = req.userId;
        const doubts = await Doubt.find({ student: userId }).sort({ createdAt: -1 });
        res.status(200).json(doubts);
    } catch (error) {
        console.error("Error fetching doubt history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

module.exports = {
    storestatics,
    getstatistics,
    uploadFile,
    upload,
    giveratingtoteacher,
    getdoubthistory
};