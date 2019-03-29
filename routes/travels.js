const express = require('express');
const router = express.Router();

const Travels = require('../models/travel');

const { isLoggedIn, isOwner } = require('../helpers/middlewares');

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
  Travels.find()
  .then((travels) => {
    if(travel.attendees.length) {
      const filteredTravels = travels.attendees.filter((attendee => {
        attendee.equals(userId)
      }))
      res.json(filteredTravels)
    }
  })
})

router.post('/', isLoggedIn(), (req, res, next) => {  
  const { name, category, seats, date, startPoint, endPoint } = req.body;
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
    owner: userId
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
  if (!activity) {
    res.json({message: 'require fields'})
    return;
  }           
  if (isOwner(id)) {        
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
      Travels.findByIdAndUpdate(id, {$push: {attendees: userId}}, {new: true})
      .then(() => {
        res.status(200);
        res.json({message:'succes'})
      })
      .catch(next)
    }
  })
  .catch(next)        
});

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
  if (isOwner(id)) {
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



module.exports = router;