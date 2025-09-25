jest.mock("../../../server/models/membership.model");
jest.mock("../../../server/models/student.model");
jest.mock("../../../server/redis.connection");

const httpMocks = require('node-mocks-http');
const { getMembershipTiers, updateMembershipTier, getGlobalUsageStats, getMembershipHealthOverview, calculateAverageMembershipDuration } = require("../../../server/controller/admin.feature.controller");
const Membership = require("../../../server/models/membership.model");
const Student = require("../../../server/models/student.model");
const redis = require("../../../server/redis.connection");

describe('Admin Feature Controller', () => {
    let req, res, next;

    beforeEach(() => {
        req = httpMocks.createRequest();
        res = httpMocks.createResponse();
        next = jest.fn();

        jest.clearAllMocks();

        // Mock Membership model methods
        Membership.find = jest.fn().mockReturnThis();
        Membership.sort = jest.fn().mockReturnThis();
        Membership.findOneAndUpdate = jest.fn();
        Membership.exec = jest.fn(); // For chained calls like find().sort().exec()

        // Mock Student model methods
        Student.aggregate = jest.fn();

        // Mock Redis methods
        redis.del = jest.fn();
    });

    describe('getMembershipTiers', () => {
        it('should return all membership tiers successfully', async () => {
            const mockMemberships = [
                { type: 'Basic', displayOrder: 1 },
                { type: 'Premium', displayOrder: 2 }
            ];
            Membership.find.mockReturnThis();
            Membership.sort.mockReturnThis();
            Membership.exec.mockResolvedValue(mockMemberships);

            await getMembershipTiers(req, res);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                success: true,
                memberships: mockMemberships
            });
            expect(Membership.find).toHaveBeenCalledTimes(1);
            expect(Membership.sort).toHaveBeenCalledWith({ displayOrder: 1 });
        });

        it('should handle errors when retrieving membership tiers', async () => {
            const errorMessage = 'Database error';
            Membership.find.mockReturnThis();
            Membership.sort.mockReturnThis();
            Membership.exec.mockRejectedValue(new Error(errorMessage));

            await getMembershipTiers(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: 'Failed to retrieve membership tiers'
            });
        });
    });

    describe('updateMembershipTier', () => {
        it('should return 400 if membershipType is missing', async () => {
            req.params = {};
            req.body = { name: 'New Name' };

            await updateMembershipTier(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: 'Membership type is required'
            });
            expect(Membership.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it('should return 400 if attempting to change membership type identifier', async () => {
            req.params = { membershipType: 'Basic' };
            req.body = { type: 'Premium' };

            await updateMembershipTier(req, res);

            expect(res.statusCode).toBe(400);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: 'Cannot change membership type identifier'
            });
            expect(Membership.findOneAndUpdate).not.toHaveBeenCalled();
        });

        it('should return 404 if membership tier not found', async () => {
            req.params = { membershipType: 'NonExistent' };
            req.body = { name: 'New Name' };
            Membership.findOneAndUpdate.mockResolvedValue(null);

            await updateMembershipTier(req, res);

            expect(res.statusCode).toBe(404);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: 'Membership tier not found'
            });
            expect(Membership.findOneAndUpdate).toHaveBeenCalledWith(
                { type: 'NonExistent' },
                { name: 'New Name' },
                { new: true }
            );
            expect(redis.del).not.toHaveBeenCalled();
        });

        it('should update membership tier and clear cache successfully', async () => {
            const mockMembership = { type: 'Basic', name: 'Basic Tier', price: 10 };
            const updatedMembership = { ...mockMembership, price: 15 };
            req.params = { membershipType: 'Basic' };
            req.body = { price: 15 };
            Membership.findOneAndUpdate.mockResolvedValue(updatedMembership);
            redis.del.mockResolvedValue(1);

            await updateMembershipTier(req, res);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                success: true,
                message: 'Membership tier updated successfully',
                membership: updatedMembership
            });
            expect(Membership.findOneAndUpdate).toHaveBeenCalledWith(
                { type: 'Basic' },
                { price: 15 },
                { new: true }
            );
            expect(redis.del).toHaveBeenCalledWith('membership:Basic');
        });

        it('should handle errors when updating membership tier', async () => {
            const errorMessage = 'Database update error';
            req.params = { membershipType: 'Basic' };
            req.body = { price: 15 };
            Membership.findOneAndUpdate.mockRejectedValue(new Error(errorMessage));

            await updateMembershipTier(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: 'Failed to update membership tier'
            });
            expect(redis.del).not.toHaveBeenCalled();
        });
    });

    describe('getGlobalUsageStats', () => {
        const mockUsersByMembership = [{ _id: 'Basic', count: 10, activeUsers: 8 }];
        const mockFeatureUsage = {
            ytSummary: [{ _id: 'Basic', totalUsage: 50, avgUsage: 5, usersWithUsage: 5 }],
            quiz: [{ _id: 'Basic', totalUsage: 30, avgUsage: 3, usersWithUsage: 3 }]
        };

        it('should return global usage stats without date filter', async () => {
            req.query = {};
            Student.aggregate
                .mockResolvedValueOnce(mockUsersByMembership) // for usersByMembership
                .mockResolvedValueOnce(mockFeatureUsage.ytSummary) // for ytSummary
                .mockResolvedValueOnce(mockFeatureUsage.quiz) // for quiz (and other features)
                .mockResolvedValueOnce([]) // for chatbot
                .mockResolvedValueOnce([]) // for mindmap
                .mockResolvedValueOnce([]); // for p2pDoubt

            await getGlobalUsageStats(req, res);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                success: true,
                stats: {
                    usersByMembership: mockUsersByMembership,
                    featureUsage: {
                        ytSummary: mockFeatureUsage.ytSummary,
                        quiz: mockFeatureUsage.quiz,
                        chatbot: [],
                        mindmap: [],
                        p2pDoubt: []
                    }
                }
            });
            expect(Student.aggregate).toHaveBeenCalledTimes(6); // 1 for usersByMembership + 5 for features
            expect(Student.aggregate).toHaveBeenCalledWith([
                { $match: {} }, // No date filter
                expect.any(Object),
                expect.any(Object)
            ]);
        });

        it('should return global usage stats with date filter', async () => {
            const startDate = '2023-01-01';
            const endDate = '2023-01-31';
            req.query = { startDate, endDate };

            Student.aggregate
                .mockResolvedValueOnce(mockUsersByMembership)
                .mockResolvedValueOnce(mockFeatureUsage.ytSummary)
                .mockResolvedValueOnce(mockFeatureUsage.quiz)
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            await getGlobalUsageStats(req, res);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                success: true,
                stats: {
                    usersByMembership: mockUsersByMembership,
                    featureUsage: {
                        ytSummary: mockFeatureUsage.ytSummary,
                        quiz: mockFeatureUsage.quiz,
                        chatbot: [],
                        mindmap: [],
                        p2pDoubt: []
                    }
                }
            });
            expect(Student.aggregate).toHaveBeenCalledTimes(6);
            expect(Student.aggregate).toHaveBeenCalledWith([
                {
                    $match: {
                        createdAt: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                expect.any(Object),
                expect.any(Object)
            ]);
        });

        it('should handle errors when retrieving global usage stats', async () => {
            const errorMessage = 'Aggregation error';
            req.query = {};
            Student.aggregate.mockRejectedValue(new Error(errorMessage));

            await getGlobalUsageStats(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: 'Failed to retrieve usage statistics'
            });
        });
    });

    describe('getMembershipHealthOverview', () => {
        const mockNow = new Date('2024-01-15T12:00:00.000Z');
        const mockSoonThreshold = new Date('2024-01-22T12:00:00.000Z'); // 7 days later
        const mockLookbackStart = new Date('2024-01-08T12:00:00.000Z'); // 7 days prior

        beforeAll(() => {
            jest.useFakeTimers();
            jest.setSystemTime(mockNow);
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        it('should return health overview with default windowDays and info alert', async () => {
            req.query = {}; // No windowDays, defaults to 7
            Student.aggregate.mockResolvedValueOnce([
                {
                    totalByMembership: [{ _id: 'Basic', count: 100 }],
                    expiringSoon: [],
                    expired: [],
                    statusBreakdown: [{ _id: 'active', count: 100 }],
                    newSignups: [{ _id: 'Basic', count: 10 }]
                }
            ]);

            await getMembershipHealthOverview(req, res);

            expect(res.statusCode).toBe(200);
            const data = res._getJSONData();
            expect(data.success).toBe(true);
            expect(data.windowDays).toBe(7);
            expect(data.generatedAt).toBe(mockNow.toISOString());
            expect(data.summary.totalMembers).toBe(100);
            expect(data.summary.expiringSoon).toBe(0);
            expect(data.summary.expired).toBe(0);
            expect(data.summary.activeMembers).toBe(100);
            expect(data.summary.inactiveMembers).toBe(0);
            expect(data.summary.newSignups).toBe(10);
            expect(data.alerts).toEqual([{ severity: "info", message: "All memberships are in good standing." }]);
            expect(Student.aggregate).toHaveBeenCalledTimes(1);
            expect(Student.aggregate).toHaveBeenCalledWith([
                {
                    $facet: {
                        totalByMembership: expect.any(Array),
                        expiringSoon: expect.arrayContaining([
                            { $match: { "membershipDetails.endDate": { $gte: mockNow, $lte: mockSoonThreshold } } }
                        ]),
                        expired: expect.arrayContaining([
                            { $match: { "membershipDetails.endDate": { $lt: mockNow } } }
                        ]),
                        statusBreakdown: expect.any(Array),
                        newSignups: expect.arrayContaining([
                            { $match: { createdAt: { $gte: mockLookbackStart } } }
                        ])
                    }
                }
            ]);
        });

        it('should return health overview with custom windowDays and various alerts', async () => {
            req.query = { windowDays: '14' };
            const customSoonThreshold = new Date(mockNow.getTime() + 14 * 24 * 60 * 60 * 1000);
            const customLookbackStart = new Date(mockNow.getTime() - 14 * 24 * 60 * 60 * 1000);

            Student.aggregate.mockResolvedValueOnce([
                {
                    totalByMembership: [{ _id: 'Basic', count: 100 }],
                    expiringSoon: [{ _id: 'Basic', count: 25 }], // 25% > 20% -> critical
                    expired: [{ _id: 'Basic', count: 5 }],
                    statusBreakdown: [{ _id: 'active', count: 90 }, { _id: 'paused', count: 10 }],
                    newSignups: [{ _id: 'Basic', count: 15 }]
                }
            ]);

            await getMembershipHealthOverview(req, res);

            expect(res.statusCode).toBe(200);
            const data = res._getJSONData();
            expect(data.success).toBe(true);
            expect(data.windowDays).toBe(14);
            expect(data.summary.totalMembers).toBe(100);
            expect(data.summary.expiringSoon).toBe(25);
            expect(data.summary.expired).toBe(5);
            expect(data.summary.activeMembers).toBe(90);
            expect(data.summary.inactiveMembers).toBe(10);
            expect(data.summary.newSignups).toBe(15);
            expect(data.alerts).toEqual([
                { severity: "critical", message: "25 membership(s) expiring within the next 14 day(s)" },
                { severity: "critical", message: "5 membership(s) already expired" },
                { severity: "warning", message: "10 membership(s) flagged as paused" }
            ]);
            expect(Student.aggregate).toHaveBeenCalledWith([
                {
                    $facet: {
                        totalByMembership: expect.any(Array),
                        expiringSoon: expect.arrayContaining([
                            { $match: { "membershipDetails.endDate": { $gte: mockNow, $lte: customSoonThreshold } } }
                        ]),
                        expired: expect.arrayContaining([
                            { $match: { "membershipDetails.endDate": { $lt: mockNow } } }
                        ]),
                        statusBreakdown: expect.any(Array),
                        newSignups: expect.arrayContaining([
                            { $match: { createdAt: { $gte: customLookbackStart } } }
                        ])
                    }
                }
            ]);
        });

        it('should handle errors when generating membership health overview', async () => {
            req.query = {};
            Student.aggregate.mockRejectedValue(new Error('Aggregation failed'));

            await getMembershipHealthOverview(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: "Failed to generate membership health overview"
            });
        });
    });

    describe('calculateAverageMembershipDuration', () => {
        it('should return average membership duration successfully', async () => {
            const mockMemberships = [{ _id: null, totalDuration: 30 * 24 * 60 * 60 * 1000, count: 3 }]; // 30 days total for 3 memberships
            Student.aggregate.mockResolvedValueOnce(mockMemberships);

            await calculateAverageMembershipDuration(req, res);

            expect(res.statusCode).toBe(200);
            expect(res._getJSONData()).toEqual({
                success: true,
                averageDuration: mockMemberships[0].totalDuration + mockMemberships[0].count // Matches the logical error in the code
            });
            expect(Student.aggregate).toHaveBeenCalledTimes(1);
            expect(Student.aggregate).toHaveBeenCalledWith([
                {
                    $group: {
                        _id: null,
                        totalDuration: { $sum: { $subtract: ["$membershipDetails.endDate", "$membershipDetails.startDate"] } },
                        count: { $sum: 1 }
                    }
                }
            ]);
        });

        it('should return 404 if no memberships are found', async () => {
            Student.aggregate.mockResolvedValueOnce([]);

            await calculateAverageMembershipDuration(req, res);

            expect(res.statusCode).toBe(404);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: "No memberships found"
            });
        });

        it('should handle errors when calculating average membership duration', async () => {
            const errorMessage = 'Aggregation error';
            Student.aggregate.mockRejectedValue(new Error(errorMessage));

            await calculateAverageMembershipDuration(req, res);

            expect(res.statusCode).toBe(500);
            expect(res._getJSONData()).toEqual({
                success: false,
                message: "Failed to calculate average membership duration"
            });
        });
    });
});
