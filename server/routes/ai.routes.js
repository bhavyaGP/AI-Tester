const express = require('express');
const router = express.Router();
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');

const { verifyUser } = require('../middleware/auth.middleware');
const AI_API_URL = process.env.AI_API_URL || 'http://localhost:5001/api';

// Configure multer for memory storage (to get file buffer for Flask server)
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// File upload endpoints
router.post('/upload', verifyUser, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log("here from here")
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        // console.log(`userid: ${req.user?.id || req.userId}`);
        // Attach user id from req.user (set by verifyUser middleware)
        formData.append('userid', req.user?.id || req.userId);

        const response = await axios.post(`${AI_API_URL}/upload`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error uploading file:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to upload file',
            details: error.response?.data || error.message
        });
    }
});

router.post('/paper_upload', verifyUser, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        const response = await axios.post(`${AI_API_URL}/paper_upload`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        res.json(response.data);
    } catch (error) {
        console.error('Error uploading paper:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Failed to upload paper',
            details: error.response?.data || error.message
        });
    }
});

// File operations
router.post('/query', verifyUser, async (req, res) => {
    try {
        const { query, filename, userId } = req.body;
        if (!query || !filename || !userId) {
            return res.status(400).json({ error: 'Query, filename, and userId are required' });
        }
            
        const response = await axios.post(`${AI_API_URL}/query`, req.body);
        console.log('Response from AI API:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error querying AI API:', error);
        res.status(500).json({ error: 'Failed to query AI API' });
    }
});

router.post('/clear_embeddings', verifyUser, async (req, res) => {
    try {
        const userId = req.userId;
        console.log(`Clearing embeddings for userId: ${userId}`);
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const response = await axios.post(`${AI_API_URL}/clear_embeddings`, { userid: userId });
        res.json(response.data);
    } catch (error) {
        console.error('Error clearing embeddings:', error);
        res.status(500).json({ error: 'Failed to clear embeddings' });
    }
});
// Question bank and paper generation
router.post('/generate_paper', verifyUser, async (req, res) => {
    try {
        const { file_path, num_questions, num_papers } = req.body;
        if (!file_path || !num_questions || !num_papers) {
            return res.status(400).json({ error: 'Missing required fields: file_path, num_questions, num_papers' });
        }

        const response = await axios.post(`${AI_API_URL}/generate_paper`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error generating paper:', error);
        res.status(500).json({ error: 'Failed to generate paper' });
    }
});

router.post('/question_bank', verifyUser, async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const response = await axios.post(`${AI_API_URL}/question_bank`, req.body, {
            responseType: 'arraybuffer' // For PDF download
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${topic.replace(/\s+/g, '_')}_Questions.pdf"`
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error generating question bank:', error);
        res.status(500).json({ error: 'Failed to generate question bank' });
    }
});

router.get('/download_paper', verifyUser, async (req, res) => {
    try {
        const { file_path } = req.query;
        if (!file_path) {
            return res.status(400).json({ error: 'File path is required' });
        }

        const response = await axios.get(`${AI_API_URL}/download_paper`, {
            params: req.query,
            responseType: 'arraybuffer'
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${file_path.split('/').pop()}"`
        });
        res.send(response.data);
    } catch (error) {
        console.error('Error downloading paper:', error);
        res.status(500).json({ error: 'Failed to download paper' });
    }
});
// Quiz generation endpoints
router.post('/quiz', verifyUser, async (req, res) => {
    try {
        const { link, qno, difficulty, model } = req.body;
        if (qno > 15) {
            return res.status(400).json({ error: 'Number of questions should not exceed 15' });
        }
        if (!link || !qno || !difficulty || !model) {
            return res.status(400).json({ error: 'Missing required fields: link, qno, difficulty, model' });
        }

        const response = await axios.post(`${AI_API_URL}/quiz`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error generating quiz:', error);
        res.status(500).json({ error: 'Failed to generate quiz' });
    }
});

router.post('/llm_quiz', verifyUser, async (req, res) => {
    try {
        const { topic, num_questions, difficultly } = req.body;
        if (!topic || !num_questions || !difficultly) {
            return res.status(400).json({ error: 'Missing required fields: topic, num_questions, difficulty' });
        }

        const response = await axios.post(`${AI_API_URL}/llm_quiz`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error generating LLM quiz:', error);
        res.status(500).json({ error: 'Failed to generate LLM quiz' });
    }
});
// Recommendation endpoints
router.post('/getonly', verifyUser, async (req, res) => {
    try {
        // Check if userId is in req.body or req.userId (from middleware)
        const userId = req.body.user_id || req.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const data = {
            user_id: userId
        };

        const response = await axios.post(`${AI_API_URL}/getonly`, data);
        res.json(response.data);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

router.post('/youtube_videos', verifyUser, async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        const response = await axios.post(`${AI_API_URL}/youtube_videos`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        res.status(500).json({ error: 'Failed to fetch YouTube videos' });
    }
});
// Transcript and chat endpoints
router.post('/chat_trans', verifyUser, async (req, res) => {
    try {
        const { link, model, question } = req.body;
        if (!link || !model || !question) {
            return res.status(400).json({ error: 'Missing required fields: link, model, question' });
        }

        const response = await axios.post(`${AI_API_URL}/chat_trans`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error in chat transcript:', error);
        res.status(500).json({ error: 'Failed to process chat transcript' });
    }
});

router.post('/generate_mind_map', verifyUser, async (req, res) => {
    try {
        const { video_url } = req.body;
        if (!video_url) {
            return res.status(400).json({ error: 'video_url is required' });
        }

        const response = await axios.post(`${AI_API_URL}/generate_mind_map`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error generating mind map:', error);
        res.status(500).json({ error: 'Failed to generate mind map' });
    }
});

// Health check endpoint
router.get('/health', verifyUser, async (req, res) => {
    try {
        const response = await axios.get(`${AI_API_URL}/health`);
        res.json({
            status: 'healthy',
            nodeServer: 'running',
            flaskServer: response.data
        });
    } catch (error) {
        console.error('Flask server health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            nodeServer: 'running',
            flaskServer: 'unreachable',
            error: error.message
        });
    }
});

module.exports = router;