const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const rooms_data = require('./data/rooms_data')


const app = express()
const port = process.env.PORT || 4001
const server = http.createServer(app)
const io = socketIo(server)



io.on('connect', (socket) => {
	subscribeToCao(socket)
})

const subscribeToCao = (socket) => {
	socket.on('join_room', (playerName, roomId) =>
		newConnection(socket, playerName, roomId)
	)
	socket.on('disconnect', (room) => handleDisconnection(socket, room))
	socket.on('play_card', (room,card) => handlePlayCard(socket, room, card))
	socket.on('play_game', (room) => handlePlayGame(socket, room))
	socket.on('next_round', (room) => handleNextRound(socket, room))
	socket.on('round_finished', (room, card) => handleRoundFinished(socket, room, card))
}

const handleRoundFinished = (socket, room, card) => {
	const isValid = rooms_data.isValidGame(room.id)
	if(isValid){
		try {

			// room.players = room.players.map(p => {
			// 	if(p.id == card.playedBy){
			// 		p.points++
			// 	}
			// })
			const winnerId = card.playedBy
			console.log(winnerId)
			const players = room.players
			console.log(players)
			const winner = players.find(p => p.id == winnerId)
			console.log(winner)
			winner.points = winner.points + 1
			console.log(winner.points)
			const newUserStatus = {
				points: winner.points
			}
			socket.to(winnerId).emit('user_status', newUserStatus)
			updateRoom(room)
			io.to(room.id).emit('new_round', room)
		} catch (err) {
			console.warn(err)
		}
	}
	else
	{
		io.to(room.id).emit('show_winner')
	}
}

const handleNextRound = (socket, room) => {
	try {
		const myRoom = rooms_data.getRoomById(room.id)
		const players = getUserStatus(socket, myRoom.id)
		const zar = players.find(p => p.isZar == true)
		if(socket.id == zar.id)
		{
			rooms_data.createRound(myRoom.id)
			const blackCard = rooms_data.getBlackCard(myRoom.id)
			io.to(myRoom.id).emit('next_black_card', blackCard)
			updateRoom(myRoom)
		}
		else
		{
			const whites = rooms_data.getWhiteCardsPlayer(myRoom.id)
			socket.emit('next_card_array', whites)
		}
	} catch (err) {
		console.warn(err)
	}	
}

const getUserStatus = (socket, roomId) => {
	rooms_data.setZar(roomId)
	const nRoom = rooms_data.getRoomById(roomId)
	const players = rooms_data.getPlayersByRoomId(nRoom.id)
	const player = players.find(p => p.id == socket.id)
	const newUserStatus = {
		points: player.points,
		isZar: player.isZar
	}
	socket.emit('user_status', newUserStatus)
	return players;
}

const handlePlayGame = (socket, room) => {
	let roomId = room.id
	io.to(roomId).emit('play_room', room)
}

const newConnection = (socket, playerName, roomId) => {
	const newUser = {
		name: playerName,
		id: socket.id,
		points: 0,
		isZar: false
	}
	let myRoom
	if (roomId) {
		myRoom = rooms_data.connectToRoom(newUser, roomId)
	} else {
		myRoom = rooms_data.createRoom(newUser)
	}

	socket.join(myRoom.id)
	updateRoom(myRoom)
}

// handlePlayCard => agrega la card al set de cartas jugadas en esta ronda.
// NO SE ENCARGA de mandar las cartas con la ronda terminada
const handlePlayCard = (socket, room, card) => {
	const roomId = room.id
	const playerId = socket.id
	rooms_data.submitCard(roomId, card, playerId)
	io.to(roomId).emit('submit_card', card)
}

const handleDisconnection = (socket, room) => {
	rooms_data.deletePlayerOfRoom(socket.id)
}

const updateRoom = (room) => {
	 io.to(room.id).emit('update_room', room)
}





server.listen(port, () => console.log(`Listening on port ${port}`))
