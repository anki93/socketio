// io.on('connection', function(socket){
//   console.log('a user connected');
//   socket.on('disconnect', function(){
//     console.log('user disconnected');
//   });
//   socket.on('chat message', function(msg){
//     io.emit('chat message', msg);
//   });
// });

const path  = require("path")
const express = require('express');
const app = express()
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

let numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // Get all online user
  socket.on('ONLINE_USER', function () {

    let keys = Object.keys(io.sockets.clients().connected);
    let users = []

    for (let key of keys) {

      let user = {
        username:io.sockets.clients().connected[key].username,
        id: key
      }
      // skip current session user
      if(key != socket.id && user.username) users.push(user)
    }

    socket.emit('USERS', users)

  })

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function ({msg, id}) {
    // we tell the client to execute 'new message'
    if (id) {
      socket.to(id).emit('private', {msg, username:socket.username});
    } else {
      socket.broadcast.emit('new message', {
        username: socket.username,
        message: msg
      });
    }

  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers,
      id: socket.id
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        id: socket.id,
        numUsers: numUsers
      });
    }
  });

});


http.listen(5000, function(){
  console.log('listening on *:3000');
});
