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
		for(var i=0; i<players.length; i++){
			for(var key in players[i]){
				if(players[i][key].username == data){
					socket.usernameTaken = true;
					socket.emit('isUsernameTaken', socket.usernameTaken);
					return;
				}
			}
		}
		socket.emit('isUsernameTaken', socket.usernameTaken);
	});

	function generateRandom(min, max){
		var num = Math.floor(Math.random() * (max - min + 1)) + min;
		for(var key in players[socket.room]){
			if(num == Number(key)) return generateRandom(min, max);
		}
		return num;
	}
	function joinRoom(room){
		if(room>players.length) rooms=0;
		if(Object.keys(players[room]).length>=roomSize){
			joinRoom(room+1);
			return;
		}
		socket.room = room;
		socket.arrID = generateRandom(0,roomSize-1);
		console.log('arr id of ', socket.arrID, ' joined room ', socket.room);
	}
	function joinFullestRoom(){
		socket.fullestRoom = 0;
		socket.fullestRoomNum = 0;
		for(var i=0; i<players.length; i++){
			if(Object.keys(players[i]).length>socket.fullestRoom){
				socket.fullestRoom = Object.keys(players[i]).length;
				socket.fullestRoomNum = i;
			}
		}
		joinRoom(socket.fullestRoomNum);
	}
	function leaveRoom(room){
		if(typeof socket.room == 'number') delete players[room][socket.arrID];
		socket.room = false;
		clearTimeout(socket.idleTimeout);
		console.log('arr id of ', socket.arrID, ' left room ', room);
	}
	socket.on('startGame', function(){
		socket.emit('startGame', socket.arrID);
		joinFullestRoom();
		function idle(){
			leaveRoom(socket.room);
			socket.room = 'idle';
			socket.emit('idle');
		}
		socket.on('update', function(data){
			if(typeof socket.room == 'number'){
				players[socket.room][socket.arrID] = data;
				clearTimeout(socket.idleTimeout);
				socket.idleTimeout = setTimeout(idle,120000);
			} else {
				joinFullestRoom();
				socket.emit('wakeup');
			}
		});
		socket.on('disconnect', function(){
			leaveRoom(socket.room);
		});
		socket.on('switchRoom', function(data){
			leaveRoom(socket.room);
			joinRoom(data);
		});
		socket.on('fetchRoomsInfo', function(){
			var otherRoomsInfo = {};
			for(var i=0; i<players.length; i++){
				if (i==socket.room) continue;
				otherRoomsInfo[i] = Object.keys(players[i]).length;
			}
			socket.emit('roomsInfo', otherRoomsInfo);
		});
		setInterval(function(){
			socket.otherPlayers = Object.assign({},players[socket.room]);
			delete socket.otherPlayers[socket.arrID];
			socket.emit('updateOtherPlayers', {
				otherPlayers: socket.otherPlayers,
				room: socket.room,
			});
		}, 1000/30);
	});
});
