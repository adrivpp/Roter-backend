const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const userSchema = new Schema({
  username: String,
  password: String,
  notifications: [{
    type: ObjectId,
    ref: 'Travels'
  }]  
});

const User = mongoose.model('User', userSchema);

module.exports = User;