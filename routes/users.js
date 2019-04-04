const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../models/user');

const { isLoggedIn, isNotLoggedIn, validationLoggin } = require('../helpers/middlewares');

router.get('/:id', isLoggedIn(), (req, res, next) => {
  const { id } = req.params;
  User.findById(id) 
  .then((user) => {
    res.status(200)
    res.json(user)
  })
  .catch(next)
});

router.post('/:id', isLoggedIn(), (req,res,next) => { 
  const { id } = req.params;
  const  owner = req.session.currentUser.username
  const { comment, rate } = req.body;
  User.findByIdAndUpdate(id, { $push: { califications: {  rate, comment, owner } } }, { new: true })
  .then((user) => {
    res.status(200)
    res.json(user)
  })
  .catch(next)
})

module.exports = router;