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

var players = [ {},{} ];
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
		console.log('arr id of ', socket.arrID, ' joined room ', socket.room);
	}
	function leaveRoom(room){
		delete players[room][socket.arrID];
		//socket.room = false;
		console.log('arr id of ', socket.arrID, ' left room ', room);
	}

	socket.on('startGame', function(){
		joinRoom(0);
		socket.emit('startGame', socket.arrID);

		/*
		socket.idle = 0;
		socket.cached = {};
		socket.checkIdle = function(){
			socket.idle++;
			//console.log(socket.idle);
			//	socket.cached = players[socket.room][socket.arrID];
			if(socket.cached.vx != players[socket.room][socket.arrID].vx ||
				socket.cached.relationalX != players[socket.room][socket.arrID].relationalX ||
				socket.cached.relationalY != players[socket.room][socket.arrID].relationalY ||
				socket.cached.direction != players[socket.room][socket.arrID].direction ||
				socket.cached.messages[0].message != players[socket.room][socket.arrID].messages[0].message
			){
				socket.idle=0;
			}
			socket.cached = players[socket.room][socket.arrID];

			if(socket.idle>3){
				socket.disconnect();
			}
		}
		socket.interval = setInterval(socket.checkIdle,5000);
		*/

		socket.on('update', function(data){
			if(typeof socket.room == 'number') players[socket.room][socket.arrID] = data;
		});
		socket.on('disconnect', function(){
			leaveRoom(socket.room);
			//clearInterval(socket.interval);
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
