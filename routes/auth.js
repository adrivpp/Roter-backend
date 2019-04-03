const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const User = require('../models/user');

const { isLoggedIn, isNotLoggedIn, validationLoggin } = require('../helpers/middlewares');

router.get('/me', isLoggedIn(), (req, res, next) => {
  res.json(req.session.currentUser)  
});

router.get('/updatedme', isLoggedIn(), (req, res, next) => { 
  const { username } = req.session.currentUser
  User.findOne({username}).populate('notifications')
    .then((user) => {
      res.status(200);
      res.json(user);
    })
    .catch(next)
})

router.post('/login', isNotLoggedIn(), validationLoggin(), (req, res, next) => {
  const { username, password } = req.body;

  User.findOne({
      username
    })
    .then((user) => {
      if (!user) {
        return res.status(404).json({message: 'User not found'})               
      }
      if (bcrypt.compareSync(password, user.password)) {
        req.session.currentUser = user;
        return res.status(200).json(user);
      } else {
        return res.status(401).json({message: 'User or password incorrect'})        
      }
    })
    .catch(next);
});

router.post('/signup', isNotLoggedIn(), validationLoggin(), (req, res, next) => {
  const { username, password } = req.body;

  User.findOne({
      username
    }, 'username')
    .then((userExists) => {
      if (userExists) {
        return res.status(422).json({message: 'The username is taken'})        
      }
      const salt = bcrypt.genSaltSync(10);
      const hashPass = bcrypt.hashSync(password, salt);
      const newUser = new User({
        username,
        password: hashPass,
      });

      return newUser.save().then(() => {        
        req.session.currentUser = newUser;
        res.status(200).json(newUser);
      });
    })
    .catch(next);
});

router.post('/logout', isLoggedIn(), (req, res, next) => {
  req.session.destroy();
  return res.status(204).send();
});

module.exports = router;
