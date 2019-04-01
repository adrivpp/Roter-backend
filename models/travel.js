const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const travelSchema = new Schema({
  owner: {
    type: ObjectId,
    ref: 'User',   
  },
  name: String,  
  category: String,
  seats: Number,
  activities: Array,
  date: {
    type: Date,    
  },
  imageUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1530789253388-582c481c54b0?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=500&q=60'
  },
  attendees: [{
    type: ObjectId,
    ref: 'User'
  }],
  startPoint: String,
  endPoint: String,
  request: [{
    type: ObjectId,
    ref: 'User',    
  }]  
});

const Travels = mongoose.model('Travels', travelSchema);

module.exports = Travels;