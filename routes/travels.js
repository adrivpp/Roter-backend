const express = require('express');
const router = express.Router();

const Travels = require('../models/travel');

const { isLoggedIn, isNotLoggedIn, validationLoggin } = require('../helpers/middlewares');

router.post('/', isLoggedIn(), (req, res, next) => {
  const { name, category, description, date, activities, startPoint, endPoint } = req.body;
  const userId = req.session.currentUser._id;
  if(!name || !category || !description || !date || !activities || !startPoint || !endPoint) {
    res.json({message: 'require fields'})
    return;
  }
  Travels.create({
      name,
      category,
      description,
      date, 
      activities, 
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
  const {id} = req.params;
  const userId = req.session.currentUser._id;
  let userFound = false;  
  Travels.findById(id)
  .then((travel) => {
    travel.attendees.forEach((user) => {           
      if (user == userId) {        
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
      if (user == userId) {        
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
    if (travel.owner == userId) {
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



module.exports = router