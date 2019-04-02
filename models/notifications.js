const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const notificationsSchema = new Schema({ 
  request: {
    type: ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Accepted', 'Pending', 'Rejected'],
    read: Boolean,
  } 
});

const Notifications = mongoose.model('Notifications', notificationsSchema);

module.exports = Notifications;