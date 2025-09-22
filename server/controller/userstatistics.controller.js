const Statistic = require('../models/statistic.model');
const sendEmail = require('../utils/mailer');
const ejs = require('ejs');
const path = require('path');

async function storestatics(req, res) {
    try {   
        
        const userId = req.userId;
        const { pasturl, score, totalscore, topic, mail, questions } = req.body;    
        if (!pasturl || score === undefined || totalscore === undefined || !topic) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (mail && questions) {
            // Render the EJS template
            const templatePath = path.join(__dirname, '../templates/statistics.ejs');
            const emailBody = await ejs.renderFile(templatePath, {
                score,
                totalscore,
                topic,
                questions
            });

            // Send email
            sendEmail({
                to: mail,
                subject: 'Your Quiz Statistics',
                body: emailBody
            });
        }

        const newStatistic = new Statistic({
            pasturl,
            score,
            totalscore,
            topic,
            student: userId
        });

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
        const statistics = await Statistic.find({ student: userId });
        res.status(200).json(statistics);
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { storestatics, getstatistics };