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

router.post('/', isLoggedIn(), (req, res, next) => {  
  const { name, category, seats, date, startPoint, endPoint, imageUrl } = req.body;
  const userId = req.session.currentUser._id;  
  if(!name || !category || !seats || !date || !startPoint || !endPoint) {
    res.json({message: 'require fields'})
    return;
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
    res.json({message: 'require fields'})
    return;
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
    travel.attendees.forEach((user) => {           
      if (user.equals(userId)) {        
        userFound = true;          
      } 
    })
    if (userFound) {
      res.status(403);
      res.json({message: 'user already booked this trip'})
    } else {          
      Travels.findByIdAndUpdate(id, {$push: {request: userId}}, {new: true})
      .then(() => {
        User.findByIdAndUpdate(travel.owner, {$push: {notifications: id}}, {new: true})
        .then(() => {
          res.json(200)
        })
          res.status(200);
          res.json({message:'Request sent to the ownwer'})
        })
        .catch(next)
      }
    })
  .catch(next)        
});

router.put('/:id/agree', isLoggedIn(), (req,res,next) => { 
  const {id} = req.params;
  const userId = req.session.currentUser._id;
  const { invitedId } = req.body
  Travels.findById(id)
  .then((travel) => {    
    if (travel.owner.equals(userId)) {      
      Travels.findByIdAndUpdate(id, {$push: {attendees: invitedId}}, {$pull: {request: invitedId}}, {new: true})
      .then(() => {
        User.findByIdAndUpdate(invitedId, {$push: {notifications: id}}, {new: true})
        .then(()=>{
          res.status(200)
        })
        .catch(next)
        User.findByIdAndUpdate(travel.owner, {$pull: {notifications: id}}, {new: true})
        .then(() =>{
          res.status(200)
        })
        .catch(next)
        res.status(200);
        res.json({message:'succes'})
      })
      .catch(next)
    } else {
      res.status(401)
      res.json({message:'Unauthorized'})
    }    
  })
  .catch(next)
})

router.put('/:id/deny', isLoggedIn(), (req,res,next) => { 
  const {id} = req.params;
  const userId = req.session.currentUser._id;
  const { invitedId } = req.body
  Travels.findById(id)
  .then((travel) => {    
    if (travel.owner.equals(userId)) {      
      Travels.findByIdAndUpdate(id, {$pull: {request: invitedId}}, {new: true})
      .then(() => {
        User.findByIdAndUpdate(invitedId, {$push: {notifications: id}}, {new: true})
        .then(() =>{
          res.status(200)
        })
        .catch(next)
        User.findByIdAndUpdate(travel.owner, {$pull: {notifications: id}}, {new: true})
        .then(() =>{
          res.status(200)
        })
        .catch(next)
        res.status(200);
        res.json({message:'Request denied'})
      })
      .catch(next)
    } else {
      res.status(401)
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
        res.json({message: 'deleted succesfully'})
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