import React, { useEffect, useState } from 'react'
import socketIO from 'socket.io-client'

const socket = socketIO.connect('https://video-chat-59d90.web.app')

function App() {

  const [roomNumber, setRoomNumber] = useState('')
  const [userName, setUserName] = useState('')
  const [hasPeerJoined, setHasPeerJoined] = useState(false)
  const [peerName, setPeerName] = useState('')
  const [creator, setCreator] = useState(false)
  const [userStream, setUserStream] = useState()
  const [rtcPeerConn, setRtcPeerConn] = useState()

  const userVideoRef = React.useRef()
  const peerVideoRef = React.useRef()
  const [inLobby, setInLobby] = useState(true)
  const [gotOffer, setGotOffer] = useState(false)
  const [offers, setOffers] = useState()
  
  socket.on('connect', ()=>{
    console.log('Connected to ', socket.id)
  })

  let iceServers = {
    iceServers: [
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };  
  
  const handleRoomNumberChange = (e)=>{
    const roomNumber = e.target.value
    setRoomNumber(roomNumber)
  }

  const handleNameChange = (e)=>{
    const userName = e.target.value
    setUserName(userName)
  }

  const handleJoin = ()=>{
    if(userName!=='' && roomNumber!==''){
      console.log(userName, roomNumber)
      socket.emit('join', userName, roomNumber)
    }
  }

  socket.off('created').on('created', ()=>{
    setInLobby(false)
    setCreator(true)
  })

  socket.off('joined').on('joined', (namePeer)=>{
    setInLobby(false)
    setHasPeerJoined(true)
    setPeerName(namePeer)
    setCreator(false)
    socket.emit('ready', roomNumber)
  })

  socket.off('full').on('full', ()=>{
    setInLobby(true)
    alert('Room is full!')
  })

  useEffect(()=>{
    if(!inLobby){
      navigator.mediaDevices.getUserMedia({audio:true, video:{width:1280, height:720}}).then((stream)=>{
        setUserStream(stream)
        if(userVideoRef.current){
          userVideoRef.current.srcObject = stream
          userVideoRef.current.muted = true
        }
      }).catch((err)=>{
        console.log(err)
      })
    }
    // eslint-disable-next-line
  }, [inLobby])

  socket.off('ready').on('ready', (peerName)=>{
    if(creator){
      setHasPeerJoined(true)
      setPeerName(peerName)
      console.log('Peer joined')
      let rtcPeerConnection = new RTCPeerConnection(iceServers)
      setRtcPeerConn(rtcPeerConnection)
      rtcPeerConnection.onicecandidate = onIceCandidateFn
      rtcPeerConnection.ontrack = onTrackFn
      if(userStream){
        console.log('userStream in ready', userStream)
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream)
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream)
      }
      // rtcPeerConnection.onnegotiationneeded = ()=>{
        rtcPeerConnection.createOffer().then((offer)=>{
          console.log('created offer : creator-to-peer', offer)
          rtcPeerConnection.setLocalDescription(new RTCSessionDescription(offer))
          socket.emit('offer', offer, roomNumber)
        }).catch((err)=>{
          console.log(err)
        })
      // }
    }
  })

  socket.on('candidate', (candidate)=>{
    if(rtcPeerConn){
      let iceCandidate = new RTCIceCandidate(candidate)
      rtcPeerConn.addIceCandidate(iceCandidate)
      console.log('received candidate ', rtcPeerConn)
    }
  })

  const onIceCandidateFn = (event)=>{
    if (event.candidate) {
      console.log('sending candidate ',event.candidate)
      socket.emit("candidate", event.candidate, roomNumber);
    }
  }

  const onTrackFn = (event)=>{
    console.log('On track event triggered', event.streams)
    if(peerVideoRef.current){
      peerVideoRef.current.srcObject = event.streams[0]
      peerVideoRef.current.muted = true
      console.log('peervideo', peerVideoRef)
    }
  }



  useEffect(()=>{
    if(!creator && userStream && gotOffer){
      console.log('received offer by peer ', offers)
      let rtcPeerConnection = new RTCPeerConnection(iceServers)
      
      setRtcPeerConn(rtcPeerConnection)
      rtcPeerConnection.onicecandidate = onIceCandidateFn
      rtcPeerConnection.ontrack = onTrackFn
      if(userStream){
        console.log('in offer userStream', userStream)
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream)
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream)
      }
      rtcPeerConnection.setRemoteDescription(offers).then(()=>{
        rtcPeerConnection.createAnswer().then((answer)=>{
          console.log('sending answer: peer-to-creator', answer)
          rtcPeerConnection.setLocalDescription(new RTCSessionDescription(answer))
          if(!rtcPeerConnection.localDescription && rtcPeerConnection.remoteDescription){
            socket.emit('answer', answer, roomNumber)
          }
        })
      })
    }
    // eslint-disable-next-line
  }, [gotOffer, creator, offers, userStream])

  socket.off('offer').on('offer', (offer)=>{
    setGotOffer(true)
    setOffers(offer)
  })

  socket.off('answer').on('answer', (answer)=>{
    if(rtcPeerConn){
      console.log(
        'rtcPeerConn in answer received ',rtcPeerConn 
      )
      console.log('received answer', answer)
      rtcPeerConn.setRemoteDescription(answer)
    }
  })


  return (
    <div className='h-[100vh] w-full bg-[#313131]'>
      <div className='flex flex-col items-center justify-center py-8  mx-auto'>
        <h1 className='font-[Poppins] text-white font-medium text-2xl first-letter:text-3xl w-9/12 border-b-[3px] border-orange-400 text-center py-2'>Chat and Chill</h1>
      </div>

      {
        inLobby && 
        <div className='flex flex-col items-center justify-center w-5/12 mx-auto gap-8 bg-[#454545] rounded-lg py-12 drop-shadow-lg select-none'>
          <input type='text' placeholder='Enter Your Name' name='userName' value={userName} onChange={handleNameChange} 
            className='w-9/12 py-2 font-[Poppins] font-medium text-lg px-8 rounded-lg outline-none focus:ring-4 ring-orange-400'>
          </input>
          <input type='text' placeholder='Enter Room Number' name='roomNumber' value={roomNumber} onChange={handleRoomNumberChange} 
            className='w-9/12 py-2 font-[Poppins] font-medium text-lg px-8 rounded-lg outline-none focus:ring-4 ring-orange-400'>
          </input>
          <h1 onClick={handleJoin} className='font-[Poppins] text-white font-medium text-xl rounded-lg bg-orange-500 py-1 px-4 text-center cursor-pointer'>Join</h1>
        </div>
      }

      {
        !inLobby &&
        <div className='flex flex-row items-center justify-center container h-[80vh] mx-auto rounded-md bg-[#454545]'>

          <div className='flex flex-col items-center justify-center w-max h-max gap-6 ring-1 ring-white p-2 rounded-xl bg-red-50 mx-auto drop-shadow-xl'>
            <video id='userVideo' ref={userVideoRef} className={`${hasPeerJoined?'h-[50%]':'h-[90%]  object-contain self-center mt-4'}`} autoPlay></video>
            <h1 className='font-[Poppins] text-white font-medium text-xl rounded-lg bg-orange-500 py-1 px-16 text-center'>{userName}</h1>
          </div>
          {
            hasPeerJoined && 
            <div className='flex flex-col items-center justify-center w-max h-max gap-6 ring-1 ring-white p-2 rounded-xl bg-red-50 mx-auto drop-shadow-xl'>
              <video id='peerVideo' ref={peerVideoRef} className={`${hasPeerJoined?'h-[50%]':'h-[90%] object-contain self-center mt-4'}`} autoPlay></video>
              <h1 className='font-[Poppins] text-white font-medium text-xl rounded-lg bg-orange-500 py-1 px-16 text-center'>{peerName}</h1>
            </div>
          }

        </div>
      }

    </div>
  );
}

export default App;
