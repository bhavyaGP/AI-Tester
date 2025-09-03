const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getResultStatus = async (teacherId) => {
  if (!teacherId) {
    throw new Error('Teacher ID is required');
  }

  const teacher = await prisma.teacher.findUnique({
    where: { teacher_id: parseInt(teacherId) },
    select: {
      school_id: true,
    },
  });
  
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  const resultStatus = await prisma.schoolSchema.findUnique({
    where: { school_id: teacher.school_id },
    select: { resultout: true },
  });

  console.log('Result status:', resultStatus.resultout);
  
  return !!resultStatus.resultout;
};

// Function to set the result status
const setResultStatus = async (status, adminId) => {
  if (typeof status !== 'boolean') {
    throw new Error('Status must be a boolean value');
  }

  if (!adminId) {
    throw new Error('Admin ID is required');
  }

  try {
    const updatedSchool = await prisma.schoolSchema.update({
      where: { school_id: parseInt(adminId) },
      data: { resultout: status },
    });

    return updatedSchool.resultout;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new Error('School not found');
    }
    throw error;
  }
};

module.exports = { getResultStatus, setResultStatus };