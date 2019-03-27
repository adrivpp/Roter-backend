const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const travelSchema = new Schema({
  owner: {
    type: ObjectId,
    ref: 'User',
    // required: true
  },
  name: String,
  description: String,
  category: String,
  activities: Array,
  date: {
    type: Date,    
  },
  attendees: [{
    type: ObjectId,
    ref: 'User'
  }],
  startPoint: String,
  endPoint: String
});

const Travels = mongoose.model('Travels', travelSchema);

module.exports = Travels;