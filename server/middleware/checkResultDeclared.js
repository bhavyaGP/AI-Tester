// const {   getResultStatus } = require('./resultStatus');
const { getResultStatus } = require('../controllers/manageresult.js')

const checkResultDeclared = async (req, res, next) => {
  console.log('Checking if result has been declared');

  try {
    const resultDeclared = await getResultStatus(req.teacherId);
    if (resultDeclared) {
      // console.log('Result has been declared');
      next();
    } else {
      // console.log('Result has not been declared');
      res.status(403).json({ message: 'Result has not been declared yet' });
    }
  } catch (error) {
    console.error('Error checking result status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = checkResultDeclared;