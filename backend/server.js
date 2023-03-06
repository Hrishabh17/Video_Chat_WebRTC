const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const socketIO = require('socket.io')
const http = require('http')
const PORT = 4000

const app = express()
const server = http.createServer(app)

const io = socketIO(server, {
    cors:{
        origin:'https://chat-n-chill.netlify.app',
        methods:['GET', 'POST']
    }
})
let creatorName
let peerName 


io.on('connection', (socket)=>{
    console.log(`Client with ${socket.id} just connected`)
    socket.on('disconnect', ()=>{
        console.log(`${socket.id} just disconnected from server.`)
    })
    
    socket.on('join', (name, roomNumber)=>{
        let rooms = io.sockets.adapter.rooms
        
        let room = rooms.get(roomNumber)
        if(room===undefined){
            console.log('creating new room')
            socket.join(roomNumber)
            creatorName = name
            socket.emit('created')
        }
        else if(room.size === 1){
            console.log('room has only one')
            socket.join(roomNumber)
            peerName = name
            socket.emit('joined',creatorName)
        }
        else{
            console.log('room is full')
            socket.emit('full')
        }
        console.log(roomNumber, rooms)
    })

    socket.on('ready', (roomNumber)=>{
        console.log('ready \n')
        socket.broadcast.to(roomNumber).emit('ready', peerName)
    })

    socket.on('candidate', (candidate, roomNumber)=>{
        console.log('candidate\n')
        socket.broadcast.to(roomNumber).emit('candidate', candidate)
    })

    socket.on('offer', (offer, roomNumber)=>{
        console.log('offer\n')
        socket.broadcast.to(roomNumber).emit('offer', offer)
    })

    socket.on('answer', (answer, roomNumber)=>{
        console.log('answer\n')
        socket.broadcast.to(roomNumber).emit('answer', answer)
    })

})

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:true}))

server.listen(PORT, ()=>{
    console.log('Server listening on ', PORT)
})
