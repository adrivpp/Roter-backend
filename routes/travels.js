const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Travels = require('../models/travel');

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
  Travels.find({owner: userId})
  .then((travels)=> {
    res.json(travels)
  })
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

router.post('/notifications', (req, res, next) => {  
  Travels.find({_id: { $in: req.body }}).populate('request').populate('owner')
  .then((travel) => {
    res.status(200)
    res.json(travel)
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
        Travels.findByIdAndUpdate(id, {$push: {activities: activity}}, {new: true})
        .then((updatedTravel) => {
          res.status(200);
          res.json(updatedTravel);
        })
        .catch(next)
      } else {
        res.status(401)
        res.json({message: 'Unauthorized'})
      }
    })
    .catch(next)
})


router.get('/:category', (req,res,next) => {
  const { category } = req.params
  Travels.find({category: category})
  .then((travel) => {
    console.log(travel)
    res.status(200)
    res.json(travel)   
  })
  .catch(next);  
}) 

router.get('/:id/details', (req,res,next) => {
  const {id} = req.params;  
  Travels.findById(id)
  .then((travel)=> {        
    res.status(200);
    res.json(travel)
  })
  .catch(next)
})

router.put('/:id/book', isLoggedIn(), (req,res,next) => { 
  const { id } = req.params;  
  const userId = req.session.currentUser._id;
  let userFound = false;  
  Travels.findById(id)
  .then((travel) => {   
    travel.request.forEach((user) => {           
      if (user.equals(userId)) {           
        userFound = true        
      }        
    })      
      travel.attendees.forEach((attendee) => {
        if (attendee.equals(userId)) {        
          userFound = true
        }
    })

    if (userFound) {
      const err = new Error('Forbbiden');
      err.status = 403;
      err.statusMessage = 'User already booked this trip';
      next(err) 
    } else {          
      Travels.findByIdAndUpdate(id, { $push: { request: userId }}, { new: true })
      .then(() => {
        User.findByIdAndUpdate(travel.owner, { $push: { notifications: id }}, { new: true })
        .then(() => {
          res.status(200)                    
          res.json({message:'Request sent to the ownwer'})
        })
        .catch(next)          
        })
      .catch(next)
    }
  })
  .catch(next) 
})       

router.put('/:id/agree', isLoggedIn(), (req,res,next) => { 
  const {id} = req.params;
  const userId = req.session.currentUser._id;
  const { invitedId } = req.body;
  let alreadyAttending = false;
  Travels.findById(id)
  .then((travel) => {    
    if (travel.attendees.length) {        
      travel.attendees.forEach((attendee)=> {
        if (attendee.equals(invitedId)) {   
          alreadyAttending = true;
          const err = new Error('Forbbiden');
          err.status = 403;
          err.statusMessage = 'Forbbiden';
          next(err)    
        } 
      })
      return
    }
    if (travel.owner.equals(userId) && !alreadyAttending) {   
        Travels.findByIdAndUpdate(id, { $push: { attendees: invitedId }}, { new: true })
        .then(() => {   
          Travels.findByIdAndUpdate(id, { $pull: { request: invitedId }}, { new: true })
          .then(() => {
            User.findByIdAndUpdate(invitedId, { $push: { notifications: id }}, { new: true })
            .then(()=>{
              User.findByIdAndUpdate(travel.owner, { $pull: { notifications: id }}, { new: true })
              .then(() =>{
                res.status(200);
                res.json({message:'request accepted'})            
              })
              .catch(next)          
            })
            .catch(next)          
          })
          .catch(next)
        })
        .catch(next)
      } else {        
        res.status = 403;
        res.json({message: 'Forbbiden'})
        next(err)
      }        
  })
  .catch(next)       
})
  
  

router.put('/:id/deny', isLoggedIn(), (req,res,next) => { 
  const { id } = req.params;  
  const userId = req.session.currentUser._id;  
  const { invitedId } = req.body
  Travels.findById(id)
  .then((travel) => {    
    if (travel.owner.equals(userId)) {   
      Travels.findByIdAndUpdate(id, { $pull: { request: invitedId }}, {new: true})
      .then((travel) => {                   
        User.findByIdAndUpdate(invitedId, { $push: { notifications: id }}, {new: true})      
        .then(() =>{
          User.findByIdAndUpdate(travel.owner, { $pull: { notifications: id }}, {new: true})
          .then(() =>{
            res.status(200);
            res.json({message:'Request denied'})  
          })   
          .catch(next)        
        })  
        .catch(next)      
      })
      .catch(next)
    } else {
      res.status(401)
      res.json({message: 'Unauthorized'})
    }    
  })
  .catch(next)
})


router.put('/:id/unbook', isLoggedIn(), (req,res,next) => { 
  const {id} = req.params;
  const userId = req.session.currentUser._id;
  let userFound = false;  
  Travels.findById(id)
  .then((travel) => {
    travel.attendees.forEach((user) => {           
      if (user.equals(userId)) {        
        userFound = true;          
      } 
    })
    if(userFound) {
      Travels.findByIdAndUpdate(id, {$pull: {attendees: userId}}, {new: true})
      .then(() => {
        res.status(200);
        res.json({message: 'you are not longer attending to this trip'})
      })
      .catch(next)
      } else {
        res.status(403);
        res.json({message: 'user has not booked this trip'})
      }
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