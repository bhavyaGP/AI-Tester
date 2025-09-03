const {getResultStatus, setResultStatus} = require('../../server/controllers/manageresult.js');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('getResultStatus', () => {
  it('should throw an error if teacherId is not provided', async () => {
    await expect(getResultStatus()).rejects.toThrow('Teacher ID is required');
  });

  it('should throw an error if teacher is not found', async () => {
    await expect(getResultStatus(999999)).rejects.toThrow('Teacher not found');
  });

  it('should return the correct result status', async () => {
    const teacher = await prisma.teacher.create({data: {teacher_id: 1, school_id:1}});
    const school = await prisma.schoolSchema.create({data: {school_id: 1, resultout: true}});

    const result = await getResultStatus(1);
    expect(result).toBe(true);
    await prisma.teacher.delete({where: {teacher_id: teacher.teacher_id}});
    await prisma.schoolSchema.delete({where: {school_id: school.school_id}});
  });

  it('should return false if resultout is false', async () => {
    const teacher = await prisma.teacher.create({data: {teacher_id: 2, school_id:2}});
    const school = await prisma.schoolSchema.create({data: {school_id: 2, resultout: false}});
    const result = await getResultStatus(2);
    expect(result).toBe(false);
    await prisma.teacher.delete({where: {teacher_id: teacher.teacher_id}});
    await prisma.schoolSchema.delete({where: {school_id: school.school_id}});
  });
});

describe('setResultStatus', () => {
  it('should throw an error if status is not a boolean', async () => {
    await expect(setResultStatus('true', 1)).rejects.toThrow('Status must be a boolean value');
  });

  it('should throw an error if adminId is not provided', async () => {
    await expect(setResultStatus(true)).rejects.toThrow('Admin ID is required');
  });

  it('should throw an error if school is not found', async () => {
    await expect(setResultStatus(true, 999999)).rejects.toThrow('School not found');
  });

  it('should update the result status successfully', async () => {
    const school = await prisma.schoolSchema.create({data: {school_id: 3, resultout: false}});
    const result = await setResultStatus(true, 3);
    expect(result).toBe(true);
    await prisma.schoolSchema.delete({where: {school_id: school.school_id}});
  });

  it('should update the result status to false successfully', async () => {
    const school = await prisma.schoolSchema.create({data: {school_id: 4, resultout: true}});
    const result = await setResultStatus(false, 4);
    expect(result).toBe(false);
    await prisma.schoolSchema.delete({where: {school_id: school.school_id}});
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
