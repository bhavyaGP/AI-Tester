const mongoose = require('mongoose');
const Level = require('../models/Level.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');

const levels = [
  {
    levelId: 0,
    title: 'Introduction to Physics',
    question: 'What is the basic unit of mass in the International System of Units (SI)?',
    correctAnswer: 'Kilogram',
    hints: ['It is abbreviated as kg.', 'It is used to measure mass.'],
    explanation: 'The kilogram is the base unit of mass in the International System of Units (SI).',
  },
  {
    levelId: 1,
    title: 'Newton’s First Law',
    question: 'What does Newton’s First Law of Motion state?',
    correctAnswer: 'An object remains at rest or in uniform motion unless acted upon by an external force.',
    hints: ['It is also called the law of inertia.', 'It explains the behavior of objects in motion.'],
    explanation: 'Newton’s First Law states that an object will remain at rest or in uniform motion unless acted upon by an external force.',
  },
  {
    levelId: 2,
    title: 'Force and Acceleration',
    question: 'What is the formula for force in terms of mass and acceleration?',
    correctAnswer: 'F = ma',
    hints: ['It is derived from Newton’s Second Law.', 'Force is proportional to mass and acceleration.'],
    explanation: 'Newton’s Second Law states that force is the product of mass and acceleration (F = ma).',
  },
  {
    levelId: 3,
    title: 'Work and Energy',
    question: 'What is the unit of work in the SI system?',
    correctAnswer: 'Joule',
    hints: ['It is named after a scientist.', 'It is also the unit of energy.'],
    explanation: 'The joule is the SI unit of work and energy, named after James Prescott Joule.',
  },
  {
    levelId: 4,
    title: 'Kinetic Energy',
    question: 'What is the formula for kinetic energy?',
    correctAnswer: 'KE = 1/2 mv^2',
    hints: ['It depends on mass and velocity.', 'It is proportional to the square of velocity.'],
    explanation: 'Kinetic energy is given by the formula KE = 1/2 mv^2, where m is mass and v is velocity.',
  },
  {
    levelId: 5,
    title: 'Potential Energy',
    question: 'What is the formula for gravitational potential energy?',
    correctAnswer: 'PE = mgh',
    hints: ['It depends on height.', 'It involves gravitational acceleration.'],
    explanation: 'Gravitational potential energy is given by PE = mgh, where m is mass, g is gravitational acceleration, and h is height.',
  },
  {
    levelId: 6,
    title: 'Laws of Thermodynamics',
    question: 'What does the First Law of Thermodynamics state?',
    correctAnswer: 'Energy cannot be created or destroyed, only transformed.',
    hints: ['It is also called the law of energy conservation.', 'It applies to all energy transformations.'],
    explanation: 'The First Law of Thermodynamics states that energy cannot be created or destroyed, only transformed from one form to another.',
  },
  {
    levelId: 7,
    title: 'Waves and Frequency',
    question: 'What is the formula for the speed of a wave?',
    correctAnswer: 'v = fλ',
    hints: ['It involves frequency and wavelength.', 'It is used to calculate wave speed.'],
    explanation: 'The speed of a wave is given by v = fλ, where f is frequency and λ is wavelength.',
  },
  {
    levelId: 8,
    title: 'Electricity and Circuits',
    question: 'What is Ohm’s Law?',
    correctAnswer: 'V = IR',
    hints: ['It relates voltage, current, and resistance.', 'It is fundamental to circuit analysis.'],
    explanation: 'Ohm’s Law states that the voltage across a conductor is directly proportional to the current flowing through it, with resistance as the constant of proportionality.',
  },
  {
    levelId: 9,
    title: 'Magnetism',
    question: 'What is the unit of magnetic field strength in the SI system?',
    correctAnswer: 'Tesla',
    hints: ['It is named after a famous inventor.', 'It measures magnetic flux density.'],
    explanation: 'The tesla is the SI unit of magnetic field strength, named after Nikola Tesla.',
  },
];

// Create corresponding tasks for each level
const tasks = levels.map(level => ({
  taskId: `task_${level.levelId}`,
  level: level.levelId,
  problem: level.question,
  correctAnswer: level.correctAnswer,
  hint: level.hints[0] || 'Think about the basic physics concepts.',
  toolsRequired: ['basic_tools'],
  reward: 10,
  solution: level.explanation
}));

const insertDummyData = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/playpower');

    console.log('🗑️  Clearing existing data...');
    await Level.deleteMany({}); // Clear existing levels
    await Task.deleteMany({}); // Clear existing tasks
    await User.deleteMany({ username: { $regex: /^physics_kid|test/ } }); // Clear test users

    console.log('📚 Inserting physics levels...');
    await Level.insertMany(levels);
    console.log(`✅ Inserted ${levels.length} levels successfully!`);

    console.log('📝 Inserting corresponding tasks...');
    await Task.insertMany(tasks);
    console.log(`✅ Inserted ${tasks.length} tasks successfully!`);

    // Verify data was inserted
    const levelCount = await Level.countDocuments();
    const taskCount = await Task.countDocuments();
    
    console.log(`\n📊 Database Summary:`);
    console.log(`   Levels: ${levelCount}`);
    console.log(`   Tasks: ${taskCount}`);
    console.log(`\n🎯 Ready for testing! Run: node test/fullPhysicsGameTest.js`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error inserting dummy data:', error);
    mongoose.connection.close();
  }
};

insertDummyData();
