const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { setTeacher, setAdmin } = require('../services/auth.js');

async function
    handlebasiclogin(req, res) {
    const { username, password } = req.body;
    // console.log(username, password);
    try {
        let token; 
        let user;

        // Use findFirst to search by both username and password
        user = await prisma.teacher.findFirst({
            where: {
                username: username,
                password: password
            },
            include: {
                school: {
                    select: {
                        resultout: true
                    }
                }
            }
        });

        if (user) {
            // Generate token for teacher
            token = setTeacher(user);
            res.cookie('authToken', token, {
                // httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // Cookie expires in 24 hours
            });
            return res.json({ message: 'Login successful. You will be redirected to the teacher dashboard.', token, user });
            // return res.redirect('/api/teacher');
        }

        if (username === 'admin') {
            adminwithschool = await prisma.schoolSchema.findFirst({
                where: {
                    password: password
                },
                select: {
                    school_id: true,
                    school_name: true,
                    school_add: true,
                    school_dist: true,
                    resultout: true
                }
            });



            admin = { admin_id: adminwithschool.school_id };
            token = setAdmin(admin);
            res.cookie('authToken', token, {
                httpOnly: false,
                maxAge: 24 * 60 * 60 * 1000
                // maxAge: 4 * 60 * 60 * 1000
            });
            return res.json({ message: 'Login successful. You will be redirected to the admin dashboard.', token, admin, school: adminwithschool });
            // return res.redirect('/api/admin');
        }
        res.status(401).send('Invalid credentials');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal server error');
    }
}

module.exports = { handlebasiclogin };