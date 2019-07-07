const moment = require('moment')
const functions = require('firebase-functions');
const request = require('request-promise');
const firebase = require('firebase')
require('firebase/storage')
const config = require('./config.json')

global.XMLHttpRequest = require("xhr2");

firebase.initializeApp(config);
var storage = firebase.storage()
var storageRef = storage.ref();


// exports.LineBot = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const accessToken = config.accessToken
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';
const LINE_HEADER = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
};

exports.LineBot = functions.https.onRequest((req, res) => {
  if (req && req.body && req.body.events[0] && req.body.events[0].message.type == 'text') {
    reply(req.body);
  }else if(req && req.body && req.body.events[0] && req.body.events[0].message.type == 'image'){
    getImage(req.body.events[0])
  }
  else
    res.send("Hello from Firebase!");
});


const getImage = (event) => {
  const url = `https://api.line.me/v2/bot/message/${event.message.id}/content`
  const metadata = {
    contentType: 'image/jpeg'
  };
  return request({
    method: `GET`,
    uri: `${url}`,
    headers: LINE_HEADER,
    encoding: null 
  }).then(async buffer => {
    let date = moment(event.timestamp).utcOffset('+0700').format('DD-MM-YYYY')
    var imagesRef = storageRef.child(`${date}/images/${event.message.id}.jpg`).put(buffer,metadata);
    await imagesRef.on('state_changed', function(snapshot){
      var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Upload is ' + progress + '% done');
      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED: // or 'paused'
          console.log('Upload is paused');
          break;
        case firebase.storage.TaskState.RUNNING: // or 'running'
          console.log('Upload is running');
          break;
      }
    },function(error) {
      console.log('ERROR::',error)
    }, function() {
      imagesRef.snapshot.ref.getDownloadURL().then(function(downloadURL) {
        console.log('File available at', downloadURL);
        replyImage({
          replyToken : event.replyToken,
          message: downloadURL
        })
      });
    });
  })

}

const reply = (bodyResponse) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: bodyResponse.events[0].replyToken,
      messages: [
        {
          type: `text`,
          text: bodyResponse.events[0].message.text
        }
	  ]
    })
  });
};

const replyImage = (bodyResponse) => {
  return request({
    method: `POST`,
    uri: `${LINE_MESSAGING_API}/reply`,
    headers: LINE_HEADER,
    body: JSON.stringify({
      replyToken: bodyResponse.replyToken,
      messages: [
        {
          type: `text`,
          text: bodyResponse.message
        }
	  ]
    })
  });
};