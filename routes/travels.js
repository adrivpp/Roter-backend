'use strict';

const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Travels = require('../models/travel');
const Notifications = require('../models/notifications');
const mongoose = require('mongoose')
const { ObjectId } = mongoose.Types;

const { isLoggedIn } = require('../helpers/middlewares');

router.get('/', (req, res, next) => {
  Travels.find()
    .then((travel) => {
      res.status(200)
      res.json(travel)
    })
    .catch(next)
})

router.get('/owned', (req, res, next) => {  
  const userId = req.session.currentUser._id;  
  Travels.find({ owner: userId }).populate({ path: 'notifications', populate: {path: 'request', model: 'User'}})
  .then((travels)=> {
    res.status(200)
    res.json(travels)
  })
  .catch(next)
})

router.get('/notifications', (req, res, next) => {  
  const userId = req.session.currentUser._id;  
  Notifications.find({ request: { '$in': [userId] }})
  .then((notifications) => { 
    const notificationArray = notifications.map((notifiation) => {
      return notifiation._id
    })    
    Travels.find({ notifications: { '$in': notificationArray }}).populate('notifications').populate('owner')
    .then((travels) => {
      res.status(200);
      res.json(travels)
    })
    .catch(next)
  })
  .catch(next)  
})

router.get('/booked', (req, res, next) => {  
  const userId = req.session.currentUser._id; 
  Travels.find({ attendees: { '$in': [userId] } })
  .then((travels) => {     
    res.status(200)
    res.json(travels)
  })
  .catch(next)    
})



router.post('/', isLoggedIn(), (req, res, next) => {  
  const { name, category, seats, date, startPoint, endPoint, imageUrl } = req.body;
  const userId = req.session.currentUser._id;  
  if(!name || !category || !seats || !date || !startPoint || !endPoint) {
    const err = new Error('require fields');
    err.status = 400;
    err.statusMessage = 'require fields';
    next(err)  
  }
  Travels.create({
    name,
    category,      
    date,       
    seats,
    startPoint, 
    endPoint,
    owner: userId, 
    imageUrl
  })
  .then((travel) => {
    res.status(200)
    res.json(travel)      
  })      
  .catch(next);
});

router.put('/:id/activities', isLoggedIn(), (req,res,next) => {
  const { id } = req.params;  
  const { activity } = req.body;  
  const userId = req.session.currentUser._id;  
  if (!activity) {
    const err = new Error('Bad request');
    err.status = 400;
    err.statusMessage = 'Required fields';
    next(err)    
  }
  Travels.findById(id)
    .then((travel) => {                 
      if (travel.owner.equals(userId)) {    
        Travels.findByIdAndUpdate(id, { $push: { activities: activity }}, { new: true })
        .then((updatedTravel) => {
          res.status(200);
          res.json(updatedTravel);
        })
        .catch(next)
      } else {
        const err = new Error('Unauthorized');
        err.status = 403;
        err.statusMessage = 'Unauthorized';
        next(err) 
      }
    })
    .catch(next)
})


// router.get('/:category', (req,res,next) => {
//   const { category } = req.params
//   Travels.find({category: category})
//   .then((travel) => {
//     console.log(travel)
//     res.status(200)
//     res.json(travel)   
//   })
//   .catch(next);  
// }) 

router.get('/:id/details', (req,res,next) => {
  const {id} = req.params;  
  Travels.findById(id)
  .then((travel)=> {        
    res.status(200);
    res.json(travel)
  })
  .catch(next)
})

router.post('/:id/book', isLoggedIn(), (req,res,next) => { 
  const { id } = req.params;    
  const userId = req.session.currentUser._id;       

  Travels.findById(id).populate('notifications')
    .then((travel) => {
      const isAlreadyBooked = travel.notifications.some((notification) => {
        return notification.request.equals(userId)      
      })
      if (isAlreadyBooked) {
        const err = new Error('Bad request');
        err.status = 400;
        err.statusMessage = 'User already booked this trip';
        next(err)  
      } else {
        Notifications.create({ request: ObjectId(userId), status: 'Pending' })
          .then((notification) => {       
            Travels.findByIdAndUpdate(id, { $push: { notifications: notification._id}}, {new: true})  
            .then(() => {              
              res.status(200)
              res.json({message: 'request sent'})
            })
            .catch(next)            
          })
          .catch(next)  
      }  
  })
  .catch(next) 
})       


router.put('/:id/agree', isLoggedIn(), (req,res,next) => {   
  const { id } = req.params;
  const { invitedId } = req.body;    
  Travels.findById(id).populate('notifications')
  .then((travel) => {    
    const alreadyAttending = travel.attendees.some((attendee) => {
      return attendee.equals(invitedId)      
    })
    if (alreadyAttending) {         
      const err = new Error('Forbbiden');
      err.status = 403;
      err.statusMessage = 'user already attending to this trip';
      next(err) 
      return   
    }     
    const filteredNotification = travel.notifications.filter(notifiation => {
      return notifiation.request.equals(invitedId)
    })   
    if (filteredNotification[0].status === 'Pending') {
    Notifications.findByIdAndUpdate(filteredNotification[0]._id, { status: 'Accepted' }, {new: true})
      .then(() => {     
        Travels.findByIdAndUpdate(id, { $push: { attendees: invitedId }}) 
        .then(() => {
          res.status(200)
          res.json({message: 'request accepted'})
        })
        .catch(next)
      })
      .catch(next)      
      } else {
        const err = new Error('Forbbiden');
        err.status = 403;
        err.statusMessage = 'Forbbiden';
        next(err)
      }
  })
  .catch(next)          
})  

router.put('/:id/deny', isLoggedIn(), (req,res,next) => { 
  const { id } = req.params;  
  const userId = req.session.currentUser._id;  
  const { invitedId } = req.body
  Travels.findById(id).populate('notifications')
  .then((travel) => {   
    if(travel.owner.equals(userId)) {
      const filteredNotification = travel.notifications.filter(notifiation => {
        return notifiation.request.equals(invitedId)
      })
      if(filteredNotification[0].status === 'Pending') {
        Notifications.findByIdAndUpdate(filteredNotification[0]._id, { status: 'Rejected' }, {new: true})
        .then(() => {
          res.status(200)
          res.json({message: 'request rejected'})
        })
        .catch(next)     
      } else {
        const err = new Error('Forbidden');
        err.status = 403;
        err.statusMessage = 'Forbidden';
        next(err) 
      }
    } else {
      const err = new Error('Unauthorized');
      err.status = 401;
      err.statusMessage = 'Unauthorized';
      next(err) 
    }       
  })
  .catch(next)     

})

// router.put('/:id/unbook', isLoggedIn(), (req,res,next) => { 
//   const {id} = req.params;
//   const userId = req.session.currentUser._id;
//   let userFound = false;  
//   Travels.findById(id)
//   .then((travel) => {
//     travel.attendees.forEach((user) => {           
//       if (user.equals(userId)) {        
//         userFound = true;          
//       } 
//     })
//     if(userFound) {
//       Travels.findByIdAndUpdate(id, {$pull: {attendees: userId}}, {new: true})
//       .then(() => {
//         res.status(200);
//         res.json({message: 'you are not longer attending to this trip'})
//       })
//       .catch(next)
//       } else {
//         res.status(403);
//         res.json({message: 'user has not booked this trip'})
//       }
//     })
//   .catch(next)
// })

router.put('/notifications', isLoggedIn(), (req,res,next) => { 
  const { notification, travelId } = req.body
  
  Travels.findByIdAndUpdate(travelId, { $pull: { notifications: notification }}, { new: true })
  .then((travel) => {    
    Notifications.findByIdAndDelete(notification)
    .then(() => {
      res.status(200)
      res.json(travel)
    })
    .catch(next)
  })
  .catch(next) 
})

router.delete('/:id', isLoggedIn(), (req,res,next) => { 
  const {id} = req.params;
  const userId = req.session.currentUser._id;  
  Travels.findById(id)
  .then((travel) => {
    if (travel.owner.equals(userId)) {
      Travels.findByIdAndDelete(id)
      .then(() => {
        res.status(204)
        res.json({message: 'Deleted succesfully'})
      })
      .catch(next)
    } else {
      res.status(401)
      res.json({message: 'Unauthorized'})
    }
  })
  .catch(next)
})


module.exports = router;