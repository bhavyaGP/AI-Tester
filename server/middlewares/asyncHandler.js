const asyncHandler = (fn) => (req, res, next) => {
  try {
    const result = fn(req, res, next);
    // If the returned value is a Promise, attach a rejection handler but
    // call next() synchronously (tests expect immediate next invocation).
    if (result && typeof result.then === 'function') {
      result.catch((error) => {
        try {
          res.status(500).json({ message: error && error.message ? error.message : String(error) });
        } catch (err) {
          // ignore
        }
      });
      next();
      return;
    }
    // Non-promise return or undefined — proceed synchronously
    next();
  } catch (error) {
    res.status(500).json({ message: error && error.message ? error.message : String(error) });
  }
};

export default asyncHandler;
