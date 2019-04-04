const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const userSchema = new Schema({
  username: String,
  password: String,  
  califications: [{
    rate: Number,
    comment: String,
    owner: String,
  }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;