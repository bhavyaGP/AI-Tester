let isResultOut = false;

module.exports = {
    setResultStatus: (status) => {
        isResultOut = status;
    },
    getResultStatus: () => isResultOut
};