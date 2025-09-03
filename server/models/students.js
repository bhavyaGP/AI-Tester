const mongoose = require('mongoose');
const {Schema} = mongoose;

const StudentSchema = new Schema({
    name: {type: String},
    surname: {type: String}
});

module.exports = mongoose.model('student', StudentSchema);