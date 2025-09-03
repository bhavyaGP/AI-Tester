const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { setUser } = require('../services/auth.js');
const csvtojson = require('csvtojson');
const fs = require('fs');
const path = require('path');
const { Console } = require('console');


async function getReport(req, res) {
    try {
        // console.log("In getReport function");

        const teacherId = req.teacherId || req.body.teacherId;
        const rollno = req.query.rollno;
        // console.log(teacherId, rollno);

        // Find the teacher and their assigned standard
        const teacher = await prisma.teacher.findUnique({
            where: { teacher_id: teacherId },
            include: {
                students: true
            }
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const standard = teacher.students[0]?.stud_std;
        if (!standard) {
            return res.status(404).json({ error: 'No standard found for the teacher' });
        }

        const allActivities = await prisma.activity.findMany();

        // Create a mapping of activity_id to activity_name
        const activityMap = Object.fromEntries(
            allActivities.map(act => [act.activity_id.trim(), act.activity_name])
        );

        const student = await prisma.student.findFirst({
            where: {
                rollno: parseInt(rollno),
            },
            include: {
                teacher: true,
                school: true,
                monthlyAttendance: {
                    where: {
                        year: new Date().getFullYear(),
                    },
                },
                grades: {
                    where: { year: new Date().getFullYear() },
                    include: { subject: true },
                },
                learning_outcomes: {
                    where: {
                        date: {
                            gte: new Date(`${new Date().getFullYear()}-01-01`),
                            lte: new Date(`${new Date().getFullYear()}-12-31`),
                        },
                    },
                    include: { subject: true },
                },
                activities: true,
                achievements: true,
            },
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const report = {
            studentDetails: {
                GRno: student.GRno,
                rollno: student.rollno,
                firstName: student.stud_fname,
                lastName: student.stud_lname,
                standard: student.stud_std,
                dateOfBirth: student.DOB,
                parentContact: student.parent_contact,
                parentName: student.parentname,
                address: student.student_add,
                teacher: {
                    teacherId: student.teacher.teacher_id,
                    name: `${student.teacher.teacher_fname} ${student.teacher.teacher_lname}`,
                    email: student.teacher.teacher_email,
                    allocatedStandard: student.teacher.allocated_standard
                },
                school: {
                    schoolId: student.school.school_id,
                    name: student.school.school_name,
                    district: student.school.school_dist,
                    address: student.school.school_add
                }
            },
            attendance: student.monthlyAttendance.map(a => ({
                month: a.month,
                year: a.year,
                totalPresentDays: a.total_present_days,
                totalAbsentDays: a.total_absent_days,
                totalLateDays: a.total_late_days
            })),
            grades: student.grades.map(g => ({
                subject: g.subject.subject_name,
                marksObtained: g.marks_obtained,
                maxMarks: g.max_marks,
                year: g.year
            })),
            learningOutcomes: student.learning_outcomes.map(lo => ({
                subject: lo.subject.subject_name,
                description: lo.outcome_description,
                achieved: lo.achieved,
                date: lo.date
            })),
            activities: student.activities.map(act => ({
                activityId: act.activity_id.trim(),
                activityName: activityMap[act.activity_id.trim()] || 'Unknown Activity',
                marksObtained: parseFloat(act.marks_obtained),
                totalMarks: parseFloat(act.total_marks)
            })),
            achievements: student.achievements.map(ach => ({
                title: ach.achievement_title,
                date: ach.date,
                standard: ach.student_std
            }))
        };

        // console.log("Comprehensive report generated");
        return res.json(report);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


function ConverttedDate(date) {
    const parts = date.split('-');
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
}

async function convertCSVtoJSON(csvFilePath) {
    try {
        const jsonObj = await csvtojson().fromFile(csvFilePath);
        const jsonFilePath = `./uploads/${path.parse(csvFilePath).name}.json`; // Use /tmp for temporary storage
        await fs.promises.writeFile(jsonFilePath, JSON.stringify(jsonObj, null, 2));
        console.log("JSON file saved:", jsonFilePath);
        return jsonObj;
    } catch (error) {
        console.error("Error converting CSV to JSON:", error);
        throw new Error("Error converting CSV to JSON");
    }
}


async function addstudent(req, res) {
    // console.log("In addstudent function");

    if (!req.file) {
        return res.status(400).send("No files were uploaded.");
    }
    // console.log("File uploaded:", req.file.filename);
    const csvFilePath = req.file.path;

    try {
        const jsonObj = await convertCSVtoJSON(csvFilePath);

        const parsedTeacherId = req.teacherId;

        const { school_id: parsedSchoolId, allocated_standard: teacherStandard } = await prisma.teacher.findUnique({
            where: { teacher_id: parsedTeacherId },
            select: { school_id: true, allocated_standard: true }
        });

        if (!parsedSchoolId || !teacherStandard) {
            return res.status(400).send("Teacher's school ID or allocated standard not found.");
        }

        const lastStudent = await prisma.student.findFirst({
            where: {
                stud_std: parseInt(teacherStandard),
                school_id: parsedSchoolId
            },
            orderBy: {
                rollno: 'desc'
            }
        });

        const lastRollNo = lastStudent ? parseInt(lastStudent.rollno.toString().slice(2)) : 0;

        const studentData = jsonObj
            .filter(record => {
                const { stud_fname, stud_lname, stud_std, DOB, parent_contact, parentname, student_add } = record;
                return stud_fname && stud_lname && stud_std && DOB && parent_contact && parentname && student_add &&
                    stud_fname.trim() !== "" && stud_lname.trim() !== "" && stud_std.trim() !== "" &&
                    DOB.trim() !== "" && parent_contact.trim() !== "" && parentname.trim() !== "" &&
                    student_add.trim() !== "";
            })
            .map((record, index) => {
                const { stud_fname, stud_lname, stud_std, DOB, parent_contact, parentname, student_add } = record;

                let newrollno;

                if (parseInt(stud_std) === parseInt(teacherStandard)) {
                    const nextRollNo = lastRollNo + index + 1;
                    newrollno = `${teacherStandard}${nextRollNo.toString().padStart(3, '0')}`;
                } else {
                    throw new Error(`Student standard ${stud_std} does not match the teacher's allocated standard ${teacherStandard}.`);
                }
                if (parent_contact.trim().length < 10 || parent_contact.trim().length > 10) {
                    res.status(400).send("Parent Contact Number should be  10 characters");
                }
                
                
                return {
                    rollno: parseInt(newrollno),
                    stud_fname: stud_fname.trim(),
                    stud_lname: stud_lname.trim(),
                    stud_std: parseInt(stud_std),
                    DOB: ConverttedDate(DOB.trim()),
                    parent_contact: parent_contact.trim(),
                    parentname: parentname.trim(),
                    student_add: student_add.trim(),
                    teacher_id: parsedTeacherId,
                    school_id: parsedSchoolId
                };
            });

        if (studentData.length > 0) {
            await prisma.student.createMany({
                data: studentData
            });
        }   

        res.status(200).send("Students updated successfully.");
    } catch (error) {
        console.error("Error processing CSV file:", error);
        res.status(500).send("Error processing CSV file.");
    }
}


async function addmarks(req, res) {
    // console.log("In addmarks function");

    if (!req.file) {
        return res.status(400).send("No files were uploaded.");
    }
    // console.log("File uploaded:", req.file.filename);
    const csvFilePath = req.file.path;

    try {
        const jsonObj = await convertCSVtoJSON(csvFilePath);

        const parsedTeacherId = req.teacherId;

        const { school_id: teacherSchoolId, allocated_standard } = await prisma.teacher.findUnique({
            where: { teacher_id: parsedTeacherId },
            select: { school_id: true, allocated_standard: true }
        });

        if (!teacherSchoolId) {
            return res.status(400).send("Teacher's school ID not found.");
        }

        const parsedSchoolId = parseInt(teacherSchoolId);

        const subjects = ['ENG301', 'GUJ101', 'MATH101', 'SCI201', 'SS401']; 
        for (const student of jsonObj) {
            for (const subject of subjects) {
                const rollno = parseInt(student.rollno);
                // console.log(rollno);
                const marks_obtained = parseInt(student[subject]) || 0;

                //find the student std 
                const studentstd = await prisma.student.findFirst({
                    where: {
                        rollno: rollno
                    }, select: { stud_std: true, school_id: true }
                });
                if (!studentstd) {
                    return res.status(400).send("Student not found.");
                }
                if (studentstd.stud_std != allocated_standard && studentstd.school_id != parsedSchoolId) {
                    return res.status(400).send("Different Standard student not allowed");
                }
                
                // Check if the record already exists
                const existingRecord = await prisma.grades.findFirst({
                    where: {
                        rollno: rollno,
                        subject_id: subject,
                        year: new Date().getFullYear()
                    }
                });
                
                if (existingRecord) {
                    // Update existing record with new marks
                    await prisma.grades.update({
                        where: {
                            grade_id: existingRecord.grade_id
                        },
                        data: {
                            marks_obtained: marks_obtained
                        }
                    });
                } else {
                    
                    await prisma.grades.create({
                        data: {
                            rollno: rollno,
                            subject_id: subject,
                            marks_obtained: marks_obtained,
                            max_marks: 100,
                            year: new Date().getFullYear()
                        }
                    });
                }
            }
        }
        
        res.status(200).send("Marks added or updated successfully.");

    } catch (error) {
        console.error("Error processing CSV file:", error);
        res.status(500).send("Error processing CSV file.");
    }
}


async function getGradesForStudent(rollno) {
    try {
        const query = `
            SELECT subject_id, marks_obtained, max_marks, year
            FROM Grades
            WHERE rollno = ${rollno}`;

        const grades = await prisma.$queryRawUnsafe(query);
        // console.log(grades);

        return grades.map(grade => ({
            subjectId: grade.subject_id,
            marksObtained: grade.marks_obtained,
            maxMarks: grade.max_marks,
            year: grade.year,
        }));
    } catch (error) {
        console.error('Error fetching grades:', error);
        throw new Error('Failed to fetch grades');
    }
}

async function showsAllStudents(req, res) {
    try {
        const teacherId = req.teacherId || req.body.teacherId;

        const teacher = await prisma.teacher.findUnique({
            where: { teacher_id: teacherId },
            include: {
                students: true,
            },
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }

        const students = await Promise.all(
            teacher.students?.map(async student => {
                // console.log(student.stud_id);

                const grades = await getGradesForStudent(student.rollno);
                return {
                    rollno: parseInt(student.rollno),
                    firstName: student.stud_fname,
                    lastName: student.stud_lname,
                    standard: parseInt(student.stud_std),
                    dateOfBirth: new Date(student.DOB).toISOString(),
                    parentContact: student.parent_contact,
                    parentName: student.parentname,
                    studentAddress: student.student_add,
                };
            })
        );
        // console.log(students);
        
        return res.json(students);
    } catch (error) {
        console.error('Error showing all students:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function addactivitymarks(req, res) {
    // console.log("In addactivitymarks function");

    if (!req.file) {
        return res.status(400).send("No files were uploaded.");
    }

    // console.log("File uploaded:", req.file.filename);
    const csvFilePath = req.file.path;

    try {
        const jsonObj = await convertCSVtoJSON(csvFilePath);

        if (!jsonObj || jsonObj.length === 0) {
            return res.status(400).send("CSV file is empty or couldn't be parsed.");
        }

        const parsedTeacherId = req.teacherId;

        const teacher = await prisma.teacher.findUnique({
            where: { teacher_id: parsedTeacherId },
            select: { school_id: true }
        });

        if (!teacher || !teacher.school_id) {
            return res.status(400).send("Teacher's school ID not found.");
        }

        const parsedSchoolId = parseInt(teacher.school_id);
        const activities = ["ART04", "INDOOR02", "OUTDOOR03", "PROJECT05", "STAGE01"];
        const max_marks = 50;

        const promises = [];

        for (const student of jsonObj) {
            const rollno = parseInt(student.rollno);

            if (!rollno || isNaN(rollno)) {
                console.error(`Invalid roll number for student: ${JSON.stringify(student)}`);
                continue;
            }

            for (const activity of activities) {
                const marks_obtained = parseInt(student[activity]) || 0;

                promises.push(
                    prisma.activityMarks.findFirst({
                        where: {
                            rollno: rollno,
                            activity_id: activity,
                        },
                        select: {
                            activity_marks_id: true,
                        }
                    }).then(existingRecord => {
                        if (existingRecord) {
                            // Update existing record with new marks
                            return prisma.activityMarks.update({
                                where: {
                                    activity_marks_id: existingRecord.activity_marks_id
                                },
                                data: {
                                    marks_obtained: marks_obtained
                                }
                            });
                        } else {
                            return prisma.activityMarks.create({
                                data: {
                                    rollno: rollno,
                                    activity_id: activity,
                                    marks_obtained: marks_obtained || 0,
                                    total_marks: max_marks,
                                }
                            });
                        }
                    })
                );
            }
        }

        await Promise.all(promises);
        res.status(200).send("Activity marks added successfully.");

    } catch (error) {
        console.error("Error processing CSV file:", error);
        res.status(500).send("Error processing CSV file.");
    }
}


async function teacherdashboarddata(req, res) {
    try {
        // console.log("in teacherdashboarddata function");

        // console.log("body:", req.body.teacherId);
        // console.log("req:", req.teacherId);

        const teacherid = req.teacherId || parseInt(req.body.teacherId);
        const teacher = await prisma.teacher.findUnique({
            where: { teacher_id: teacherid },
            select: { school_id: true, allocated_standard: true }
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        const standard = teacher.allocated_standard;

        // Average marks of all students in all subjects
        const avgMarksBySubject = await prisma.$queryRaw`
            SELECT 
            g.subject_id, 
            AVG(g.marks_obtained) AS average_marks,
            sub.subject_name
            FROM 
            Grades g
            JOIN 
            Student s ON g.rollno = s.rollno
            JOIN
            Subject sub ON g.subject_id = sub.subject_id
            WHERE 
            s.stud_std = ${standard}  
            AND g.subject_id IN ('ENG301', 'GUJ101', 'MATH101', 'SCI201', 'SS401') 
            GROUP BY 
            g.subject_id, sub.subject_name;
        `;
        ;

        const formattedData = avgMarksBySubject.map(item => ({
            subjectName: item.subject_name,
            avgMarks: Number(item.average_marks).toFixed(2) // Convert to number
        }));

        // Total students count
        const studentsCountQuery = await prisma.$queryRaw`
            SELECT COUNT(*) AS students_count
            FROM Student
            WHERE stud_std = ${standard};
        `;
        const studentsCount = Number(studentsCountQuery[0].students_count); // Convert to number

        // Pass/Fail students
        const passFailCount = await prisma.$queryRaw`
            SELECT 
    COUNT(CASE WHEN student_pass_status.pass_count = subject_count THEN 1 END) AS pass_count,
    COUNT(CASE WHEN student_pass_status.pass_count < subject_count THEN 1 END) AS fail_count
FROM 
    (
        SELECT 
            s.rollno,
            COUNT(CASE WHEN g.marks_obtained >= 33 THEN 1 END) AS pass_count,
            COUNT(*) AS subject_count
        FROM 
            Grades g
        JOIN 
            Student s ON g.rollno = s.rollno
        WHERE 
            s.stud_std = ${standard}    
        GROUP BY 
            s.rollno
    ) AS student_pass_status;
;
        `;

        const passCount = Number(passFailCount[0].pass_count); // Convert to number
        const failCount = Number(passFailCount[0].fail_count); // Convert to number

        // Range of percentage of students
        const rangeCountsQuery = await prisma.$queryRaw`
    WITH student_averages AS (
        SELECT 
            g.rollno,
            (AVG(g.marks_obtained * 100.0 / g.max_marks)) as avg_percentage
        FROM 
            Grades g
        JOIN 
            Student s ON g.rollno = s.rollno
        WHERE 
            s.stud_std = ${standard}
        GROUP BY 
            g.rollno
    )
    SELECT 
    CASE 
        WHEN avg_percentage BETWEEN 0 AND 50 THEN '0-50%'
        WHEN avg_percentage BETWEEN 50 AND 60 THEN '51-60%'
        WHEN avg_percentage BETWEEN 60 AND 70 THEN '61-70%'
        WHEN avg_percentage BETWEEN 70 AND 80 THEN '71-80%'
        WHEN avg_percentage BETWEEN 80 AND 90 THEN '81-90%'
        WHEN avg_percentage BETWEEN 90 AND 100 THEN '91-100%'
    END AS percentage_range,
    COUNT(*) AS student_count
    FROM 
        student_averages
    GROUP BY 
        percentage_range
    ORDER BY
        percentage_range;
`;
        // console.log(rangeCountsQuery);

        const rangeCounts = rangeCountsQuery.reduce((acc, item) => {
            //remove null
            // if (item.percentage_range === null) {
            //     return acc;
            // }
            acc[item.percentage_range] = Number(item.student_count); // Convert to number
            return acc;
        }, {});

        // Number of students in each activity who scored more than 45 marks
        const activityMarks = await prisma.$queryRaw`
            SELECT 
            a.activity_id AS "Activity Code",
            COUNT(DISTINCT am.rollno) AS "No of student"
            FROM 
            Activity a
            JOIN 
            ActivityMarks am ON a.activity_id = am.activity_id
            JOIN 
            Student s ON am.rollno = s.rollno
            WHERE 
            am.marks_obtained >= 45 
            AND s.stud_std = ${standard} 
            GROUP BY 
            a.activity_id;
        `;

        const activityData = activityMarks.map(item => ({
            activityCode: item["Activity Code"],
            studentCount: Number(item["No of student"]) // Convert to number
        }));

        const dashboardData = {
            studentsCount,
            avgMarksBySubject: formattedData,
            passFailCount: { pass: passCount, fail: failCount },
            rangeCounts,
            activityData
        };
        return res.json(dashboardData);

    } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


async function teachertabulardata(req, res) {
    try {
        const teacherid = req.teacherId || req.body.teacherId;
        const teacher = await prisma.teacher.findUnique({
            where: { teacher_id: teacherid },
            select: { school_id: true, allocated_standard: true }
        });

        if (!teacher) {
            return res.status(404).json({ error: 'Teacher not found' });
        }
        const standard = teacher.allocated_standard;
        const resultofstudent = await prisma.$queryRaw`
        SELECT 
        ROW_NUMBER() OVER (ORDER BY s.rollno) AS "sr. no",
        s.rollno AS "student Id",
        CONCAT(s.stud_fname, ' ', s.stud_lname) AS "student name",
        AVG(g.marks_obtained) AS "Academic % of student",
        am.activity_id AS "Activity Grade of student",
        COALESCE(a.achievement_title, 'N.A') AS "Achievement title",
        CASE 
            WHEN AVG(g.marks_obtained) >= 33 THEN 'Pass'
            ELSE 'Fail'
        END AS "Pass / Fail"
        FROM 
            Student s
        LEFT JOIN 
            Grades g ON s.rollno = g.rollno
        LEFT JOIN 
            activitymarks am ON s.rollno = am.rollno
        LEFT JOIN 
            achievement a ON s.rollno = a.GRno  
        WHERE 
            s.stud_std = ${standard} 
        GROUP BY 
            s.rollno, s.stud_fname, s.stud_lname, am.activity_id, a.achievement_title;
        `;
        const studentachivement = await prisma.$queryRaw`
        SELECT 
            ROW_NUMBER() OVER (ORDER BY s.rollno) AS "sr. no",
            s.rollno AS "student Id",
            CONCAT(s.stud_fname, ' ', s.stud_lname) AS "student name",
            a.achievement_title AS "Achievement title",
            a.date AS "Date (student achievement)"
            FROM 
                Student s
            JOIN 
                Achievement a ON s.rollno = a.GRno  
            WHERE 
                s.stud_std = ${standard}; 
        `;
        console.log(studentachivement);

        const convertBigIntToString = (obj) => {
            for (let key in obj) {
                if (typeof obj[key] === 'bigint') {
                    obj[key] = obj[key].toString();
                }
            }
            return obj;
        };

        const resultofstudentConverted = resultofstudent.map(convertBigIntToString);
        const studentachivementConverted = studentachivement.map(convertBigIntToString);

        return res.json({ resultofstudent: resultofstudentConverted, studentachivement: studentachivementConverted });
    } catch (error) {
        console.error('Error fetching teacher tabular data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function addachivement(req, res) {

    const teacherId = req.teacherId;
    const { achievement_title, date, rollno } = req.body;
    //find teacherallocated standard from teacher id
    const teacher = await prisma.teacher.findUnique({
        where: { teacher_id: teacherId },
        select: { school_id: true, allocated_standard: true }
    });
    const standard = teacher.allocated_standard;
    const student = await prisma.student.findFirst({
        where: {
            rollno: parseInt(rollno),
        }
    });

    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }
    if (student.stud_std != teacher.allocated_standard) {
        return res.status(404).json({ "message": "Not allowed to add Different Standard student" });
    }
    const GRno = student.GRno;

    await prisma.achievement.create({
        data: {
            achievement_title: achievement_title,
            date: isNaN(Date.parse(date)) ? new Date().toISOString() : new Date(date).toISOString(),
            GRno: parseInt(GRno),
            student_std: parseInt(standard)
        }
    });
    return res.status(200).json({ message: 'Achievement added successfully' });
}

async function updatemarks(req, res) {

    const teacherId = req.teacherId;
    const { rollno, subject_id, marks_obtained } = req.body;
    const teacher = await prisma.teacher.findUnique({
        where: { teacher_id: teacherId },
        select: { school_id: true, allocated_standard: true }
    });
    const standard = teacher.allocated_standard;
    const student = await prisma.student.findFirst({
        where: {
            rollno: parseInt(rollno),
        }
    });

    if (!student) {
        return res.status(404).json({ error: 'Student not found' });
    }
    const subjects = ['ENG301', 'GUJ101', 'MATH101', 'SCI201', 'SS401'];
    const grade = await prisma.grades.findFirst({
        where: {
            rollno: parseInt(rollno),
            subject_id: subject_id,
            year: new Date().getFullYear()
        }
    });

    if (!grade) {
        return res.status(404).json({ error: 'Grade not found' });
    }

    await prisma.grades.update({
        where: {
            grade_id: grade.grade_id
        },
        data: {
            marks_obtained: marks_obtained
        }
    });

    return res.status(200).json({ message: 'Marks updated successfully' });


}

async function allachivement(req, res) {
    try {
        const achivement = await prisma.achievement.findMany();
        const achievementsWithStudentDetails = await Promise.all(
            achivement.map(async (ach) => {
                const student = await prisma.student.findUnique({
                    where: { GRno: ach.GRno },
                    select: {
                        rollno: true,
                        stud_fname: true,
                        stud_lname: true,
                        stud_std: true,
                    },
                });

                return {
                    ...ach,
                    student: student ? {
                        rollno: student.rollno,
                        firstName: student.stud_fname,
                        lastName: student.stud_lname,
                        standard: student.stud_std,
                    } : null,
                };
            })
        );

        return res.json(achievementsWithStudentDetails);
    }
    catch (error) {
        console.error('Error fetching all achivement:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function deletestudent(req, res) {
    const { rollno, standard } = req.body;
    try {
        const student = await prisma.student.findFirst({
            where: {
                rollno: parseInt(rollno),
                stud_std: parseInt(standard)
            }
        });

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        await prisma.student.delete({
            where: {
                rollno: student.rollno
            }
        });

        return res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

function convertToISODate(dateString) {
    const [day, month, year] = dateString.split('/');
    const isoDateString = `${year}-${month}-${day}T00:00:00.000Z`;
    return new Date(isoDateString); 
}

async function updatestudent(req, res) {
    const { rollno, stud_fname, stud_lname, DOB, parent_contact, parentname, student_add } = req.body;
    try {
        const student = await prisma.student.findFirst({
            where: {
                rollno: parseInt(rollno),
            }
        });
        

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }
        if (parseInt(parent_contact.length) < 10 ||parseInt(parent_contact.length)  > 10) {
            res.status(400).send("Parent Contact Number should be  10 characters");
        }
        await prisma.student.update({
            where: {
                rollno: student.rollno
            },
            data: {
                stud_fname: stud_fname,
                stud_lname: stud_lname,
                DOB: convertToISODate(DOB),
                parent_contact: parent_contact,
                parentname: parentname,
                student_add: student_add
            }
        });

        return res.status(200).json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function getallMarks(req, res) {
    const teacherId = req.teacherId || req.body.teacherId;

    const teacher = await prisma.teacher.findUnique({
        where: { teacher_id: teacherId },
        select: { school_id: true, allocated_standard: true }
    });
    const standard = teacher.allocated_standard;
    const allstudentmarks = await prisma.student.findMany({
        where: {
            stud_std: parseInt(standard)
        },
        include: {
            grades: {
                include: {
                    subject: true
                }
            },
            activities: true
        }
    }).then(students => {
        const studentMarks = students.map(student => ({
            rollno: student.rollno,
            firstName: student.stud_fname,
            lastName: student.stud_lname,
            grades: student.grades.map(grade => ({
                subject: grade.subject.subject_name,
                marksObtained: grade.marks_obtained,
                maxMarks: grade.max_marks,
                year: grade.year
            })),
            activities: student.activities.map(activity => ({
                activityId: activity.activity_id,
                activityName: activity.activity_name,
                marksObtained: activity.marks_obtained,
                totalMarks: activity.total_marks
            }))
        }));
        res.json(studentMarks);
    }).catch(error => {
        console.error('Error fetching student marks:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    });
}
module.exports = { getReport, addstudent, addmarks, showsAllStudents, addactivitymarks, teacherdashboarddata, teachertabulardata, addachivement, updatemarks, allachivement, deletestudent, updatestudent, getallMarks };