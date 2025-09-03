// very small request logger for development
module.exports = function (req, res, next) {
    const ts = new Date().toISOString();
    const method = req.method;
    const path = req.originalUrl || req.url;
    const body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : '';
    // write to console for now
    console.log(`[${ts}] ${method} ${path} ${body}`);
    next();
};
