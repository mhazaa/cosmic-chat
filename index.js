var express = require('express');
var fs = require('fs');
var app = express();
var PORT = process.env.PORT || 4000;
var server = app.listen(PORT, '0.0.0.0', function(){
	console.log('listenting to port: ' + PORT);
});
app.use(express.static('assets'));

var socket = require('socket.io');
var io = socket(server);

app.use(function(req, res, next) {
  req.io = io;
  next();
});
var router = require('./controllers/router.js');
router(app);

var players = [ {},{},{},{},{},{} ];
var roomSize = 50;
//websockets
io.on('connection', function(socket){
	socket.on('checkUsername', function(data){
		socket.usernameTaken = false;
		for(var key in players[socket.room]){
			if(players[socket.room][key].username == data){
				socket.usernameTaken = true;
				socket.emit('isUsernameTaken', socket.usernameTaken);
				return;
			}
		}
		socket.emit('isUsernameTaken', socket.usernameTaken);
	});

	function generateRandom(min, max){
		var num = Math.floor(Math.random() * (max - min + 1)) + min;
		for(var key in players[socket.room]){
			if(num == players[socket.room][key].arrID){
				return generateRandom(min, max);
			}
		}
		return num;
	}
	function joinRoom(room){
		if(room>=players.length) room=0;
		if(Object.keys(players[room]).length>=roomSize){
			joinRoom(room+1);
			return;
		}
		socket.room = room;
		socket.arrID = generateRandom(0,roomSize-1);
		console.log('arr id of ', socket.arrID, ' joined room ', room);
	}
	function leaveRoom(room){
		delete players[room][socket.arrID];
		console.log('arr id of ', socket.arrID, ' left room ', room);
	}

	socket.on('startGame', function(){
		joinRoom(0);
		socket.emit('startGame', socket.arrID);

		socket.on('update', function(data){
			players[socket.room][socket.arrID] = data;
			players[socket.room][socket.arrID].arrID = socket.arrID;
		});
		socket.on('disconnect', function(){
			leaveRoom(socket.room);
		});
		socket.on('switchRoom', function(data){
			leaveRoom(socket.room);
			joinRoom(data);
		});
		socket.roomInfo = function(){
			var otherRooms = {};
			for(var i=0; i<players.length; i++){
				if (i==socket.room) continue;
				otherRooms[i] = Object.keys(players[i]).length;
			}
			socket.emit('otherRoomsInfo', {
				otherRooms: otherRooms,
				currentRoom: {
					room: socket.room,
					length: Object.keys(players[socket.room]).length
				}
			});
		}
		setInterval(function(){
			socket.otherPlayers = Object.assign({},players[socket.room]);
			delete socket.otherPlayers[socket.arrID];
			socket.emit('updateOtherPlayers', socket.otherPlayers);
			socket.roomInfo();
		}, 1000/30);
	});
});

//count idle time
/*
socket.idle = 0;
setInterval(function(){
	socket.idle++;
	socket.emit('idle', socket.idle);
	if(socket.idle >= 5){
		socket.disconnect();
	}
},60000);
*/
