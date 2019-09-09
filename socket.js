let express = require("express")
var app = express();
const bodyParser = require('body-parser');
var cors = require('cors')
let http = require("http")
let server = http.Server(app);
let socketIO = require("socket.io")
let io = socketIO(server);
var request = require("request");
var mongoose = require("mongoose")
var path = require('path')
app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, content-type, Accept");
	next();
});
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


//twilio 
const accountSid = 'AC63c0208777dda3473c3bacf6fef30deb'; 
const authToken = '5131fdf7e93307c2fa01ae7c59ac153c'; 
const client = require('twilio')(accountSid, authToken); 
// const SlackBot=require('slackbots')
// const bot = new SlackBot({
//     token: 'xoxb-146779288752-683170485095-gErMgbmCr1Rli41jItbl5XLJ', // Add a bot https://my.slack.com/services/new/bot and put the token 
//     name: 'facebookmiraclebot'
//     });
var userinput;
var botactive = true;
var res;
let fname
let lname
let pic
var token = 'EAAdnxGu0F5IBAB5zo4ZBO9txrD1Phe3LnfnZAodX0UxZCBwyyiZCULCCJZBaAK5ENco9aRxIZCtfZAe3Sds69ZAJIWPYvFQB05nZBZCLMU1ZBWZB4WcrhNZC2OpKVE92QkEn4i6NTckZB9k8W1pMgG0idr4cLMvFVhRebLydxoCShSlRdqJPJ3nVpPpeo0'
var FbUserId;
let user = [], index;
mongoose.connect('mongodb+srv://yagnes:mlab@cluster0-s1fce.mongodb.net/test?retryWrites=true&w=majority', { useNewUrlParser: true }, function (err, resp) {
  if (err)
    console.log(err)
  else
    console.log("connected")
});

var log = new mongoose.Schema({
  '_id': Number,
  'messages': Array,
  'status': String,
  'first_name': String,
  'last_name': String,
  'profile_pic': String
})
//console.log("outside mongoose schema")
var userlog = mongoose.model('userlog', log);
var socket;
io.set('origins', '*:*');
io.origins('*:*')
io.sockets.on("connection", function(socketClient) {
  console.log(socketClient.id)
  socket = "";
  console.log('connection established')
  socket = socketClient;

  socket.on("ack",function (userid, sid){
    console.log("when agent accepts " + userid, sid)
    console.log("ack", userid)
    index = user.findIndex(x => x.id === userid);
    user[index].skt = sid
    user[index].status = "accepted"
    io.sockets.emit('reqw', user)
    io.to(sid).emit('reqw', user);
  })
  socket.on("req", function(msg) {
    io.sockets.emit('reqw', user)
  });


  app.post('/webhook', function(req, res)  {


    if(req.body.originalDetectIntentRequest.source == 'twilio'){

      if(req.body.queryResult.action=='input.welcome')
      {
          client.messages 
.create({ 
  body: 'Hello, I am Amelia. I can help you to answer any question that you might have about our company', 
   from: 'whatsapp:+14155238886',       
   to: 'whatsapp:+918331813965'
 }) 
.then(message => console.log(message.body)) 
.done();
      }


      else if(req.body.queryResult.action=="capabilities"){
          client.messages 
          .create({ 
            body: 'My name is Amelia and I was built by Miracle’s Innovation Labs! I can help with some of the following about Miracle, Job Search, Internship, Something else', 
             from: 'whatsapp:+14155238886',       
             to: 'whatsapp:+918331813965'
           }) 
          .then(message => console.log(message.body)) 
          .done();
      }
  }

  else if(req.body.originalDetectIntentRequest.source=="facebook") {

    

  
    
    console.log(JSON.stringify(req.body))
    console.log("inside webhook")
    
    FbUserId = req.body.originalDetectIntentRequest.payload.data.sender.id
    message = req.body.queryResult.queryText
    index =    user.findIndex(obj => obj.id == FbUserId);
    if (index == -1) {
      user.push({
        'id': FbUserId,
        'botactive': true,
        'status': "none",
        'first_name': "",
        'profile_pic': "",
        'skt': "",
        'count': 0
      })
    }
    index =    user.findIndex(obj => obj.id == FbUserId);
    console.log('**********************' + user[index].id + '' + user[index].botactive)
    
    userlog.find({ "_id": FbUserId },   function (err, resp) {
      if (resp) {
        if (resp.length == 0) {
             createlog(FbUserId, message)
        } else {
          user[index].first_name = resp[0].first_name
          user[index].profile_pic = resp[0].profile_pic
             updatelog(FbUserId, message, "user")
          console.log(user, "//////////////////////////////////////////")
        }
      }
    })
    if (user[index].botactive == false) {
      console.log(user[index].botactive)
         agent(FbUserId, message, req)
    }
    else {
      if (req.body.queryResult.action == "agent") {
        userlog.update({ "_id": req.body._id }, { "status": "requested" },function (err, res) {
          console.log('status requested')
          user[index].status = 'requested'
          user[index].botactive = false
          console.log(user)
          io.sockets.emit('reqw', user)
          

        })

        res.json({
          "fulfillmentText": "Please wait while I connect you to an agent",
          "source": 'webhook-sample'
        });
        console.log("agent");
           agent(FbUserId, message, req);
        user[index].botactive = false;
        console.log(user)
      }


      else {
        setTimeout(() => {
          console.log("bot response")
          console.log(req.body.queryResult.action)
          console.log(user[index].botactive)
          if (req.body.queryResult.action == "Greetings") {
            id = FbUserId
            request('https://graph.facebook.com/v3.2/' + id + '?fields=id,first_name,last_name,profile_pic&access_token=EAAdnxGu0F5IBAB5zo4ZBO9txrD1Phe3LnfnZAodX0UxZCBwyyiZCULCCJZBaAK5ENco9aRxIZCtfZAe3Sds69ZAJIWPYvFQB05nZBZCLMU1ZBWZB4WcrhNZC2OpKVE92QkEn4i6NTckZB9k8W1pMgG0idr4cLMvFVhRebLydxoCShSlRdqJPJ3nVpPpeo0',
              function (err, response, body) {
                var res = JSON.parse(body)
                loginSend(FbUserId, "Hello " + res.first_name + " " + res.last_name)

                setTimeout(() => {
                  loginSend(FbUserId, "I'm Amelia. I can answer any of your questions concerning our company, Miracle Software Systems, Inc.")
                }, 2000);

              })

            updatelog(FbUserId, "I'm Amelia. I can answer any of your questions concerning our company, Miracle Software Systems, Inc.", "bot")
          }
          else if (req.body.queryResult.action == "capabilities") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "I can help you get your questions answered about Miraclesoft, search for job opportunities in Miraclesoft, both full-time and internship positions and also answer any questions that you have down the line.", "bot")

            res.json({
              "fulfillmentText": "I can help you get your questions answered about Miraclesoft, search for job opportunities in Miraclesoft, both full-time and internship positions and also answer any questions that you have down the line.",
              "source": 'webhook-sample'
            });


          }
          else if (req.body.queryResult.action == "about_company") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "We are a 25-year-old Global Systems Integrator and Private Minority firm headquartered in Novi, MI – USA.  http://www.miraclesoft.com/company/about-us", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/company/about-us",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "We are a 25-year-old Global Systems Integrator and Private Minority firm headquartered in Novi, MI – USA."
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });


          }
          else if (req.body.queryResult.action == "about_digitalsummit") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Digital Summit is a 5-day technical extravaganza that takes place in Vizag every year.", "bot")
            res.json({
              "fulfillmentText":"Digital Summit is a 5-day technical extravaganza that takes place in Vizag every year.",
              "source":"webhook-sample"
            })
          }

          else if(req.body.queryResult.action=="About_DigitalSummit.About_DigitalSummit-custom"){
            updatelog(FbUserId,"click here http://www.miraclesoft.com/digitalsummit/")
          res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/digitalsummit/",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "click here"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            })
          }

          else if (req.body.queryResult.action == "about_event") {

            updatelog(FbUserId, "Can you let us know for which event you are looking for ?", "bot")


            res.json({
              "fulfillmentMessages": [
                {
                  "quickReplies": {
                    "title": "Can you let us know for which event you are looking for ?",
                    "quickReplies": [
                      "AP Cloud",
                      "Digital Summit",
                      "Internship"
                    ]
                  },
                  "platform": "FACEBOOK"
                },
                {
                  "text": {
                    "text": [
                      ""
                    ]
                  }
                }
              ]
            });
          }

          else if (req.body.queryResult.action == "About_Events.About_Events-Digital_summit") {

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/digitalsummit/",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "Digital Summit is a 5-day technical extravaganza that takes place in Vizag every year."
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            })

          }


          else if (req.body.queryResult.action == "About_Events.About_Events-APCloud") {
            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.apcloud.in/ac/",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "The AP Cloud initiative strives to create 100,000 Digital Transformation Professionals in Andhra Pradesh. Get more details on "
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            })

          }

          else if (req.body.queryResult.action == "About_Events.About_Events-Internship") {

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "https://www.miraclesoft.com/events/internship-2017.php",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "We are providing internships every year in Summer. For more details"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });


          }
          else if (req.body.queryResult.action == "about_internships") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "We are providing internships every year in Summer. For more details visit https://www.miraclesoft.com/events/internship-2017.php", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "https://www.miraclesoft.com/events/internship-2017.php",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "We are providing internships every year in Summer. For more details"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });


          }
          else if (req.body.queryResult.action == "AP_Cloud_Register") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Please visit http://www.miraclesoft.com/ac/about-us.action for registration", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/ac/about-us.action",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "Please click below option for registration"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });
          }

          else if (req.body.queryResult.action == "AP_Cloud_Tech") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "The program will be mainly focusing on trending technologies like MEAN, Cognitive, IOT, etc.", "bot")


            res.json({
              "fulfillmentText": "The program will be mainly focusing on trending technologies like MEAN, Cognitive, IOT, etc.",
              "source": 'webhook-sample'
            });


          }

          else if (req.body.queryResult.action == "AP_Cloud_Training") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "We are providing the training sessions to different colleges all over Andhra Pradesh and the time period and technologies would be based upon your choice.", "bot")


            res.json({
              "fulfillmentText": "We are providing the training sessions to different colleges all over Andhra Pradesh and the time period and technologies would be based upon your choice.",
              "source": 'webhook-sample'
            });


          }

          else if (req.body.queryResult.action == "APCloud") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "AP Cloud Initiative strives to create a hundred thousand digital transformation professionals in Andhra Pradesh. Would you like to enroll?", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "quickReplies": {
                    "title": "AP Cloud Initiative strives to create a hundred thousand digital transformation professionals in Andhra Pradesh. Would you like to enroll?",
                    "quickReplies": [
                      "Yes",
                      "No"
                    ]
                  },
                  "platform": "FACEBOOK"
                },
                {
                  "text": {
                    "text": [
                      ""
                    ]
                  }
                }
              ]
            })

          }
          else if (req.body.queryResult.action == "APcloud.APcloud-no") {
            updatelog(FbUserId, "Thank you for reaching out to us. Let me know if you need anything else")
            res.json({
              "fulfillmentText": "Thank you for reaching out to us. Let me know if you need anything else",
              "source": 'webhook-sample'
            });

          }

          else if (req.body.queryResult.action == "APcloud.APcloud-yes") {
            updatelog(FbUserId, "Please visit www.apcloud.in and enroll today!")
            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.apcloud.in/ac/",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "Please visit apcloud.in and enroll today"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });
          }


          else if (req.body.queryResult.action == "Dates_Internship") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "It will be held in the month of May or June but the dates are not yet finalized. We will release an official notice soon.", "bot")

            res.json({
              "fulfillmentText": "It will be held in the month of May or June but the dates are not yet finalized. We will release an official notice soon.",
              "source": 'webhook-sample'
            });


          }



          else if (req.body.queryResult.action == "offtopic") {
            if (user[index].count >= 1) {
              // loginSend(FbUserId,"Would you like to speak with live agent Yes/No"
              console.log('status requested')
              user[index].status = 'requested'
              user[index].botactive = false
              console.log(user)
              io.sockets.emit('reqw', user)

              res.json({
                "fulfillmentText": "Please wait while I connect you to an agent",
                "source": 'webhook-sample'
              });
              user[index].count = 0;

              // else{
              //   loginSend(FbUserId,"Have a great day")
              // }
            }


            else {

              user[index].count++;
              console.log(user[index].botactive)
              updatelog(FbUserId, "I might not be trained to answer about that. Can you please try asking again (or) rewording your question.", "bot")

              res.json({
                "fulfillmentText": "I might not be trained to answer about that. Can you please try asking again (or) rewording your question.",
                
                "source": 'webhook-sample'
              });
            }




          }




          else if (req.body.queryResult.action == "H1B_Sponsorship") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "We have limited response in social media channels. Please send an email to info@miraclesoft.com with all the details and we will be able to help you out from there.", "bot")


            res.json({
              "fulfillmentText": "We have limited response in social media channels. Please send an email to info@miraclesoft.com with all the details and we will be able to help you out from there.",
              "source": 'webhook-sample'
            });


          }

          else if (req.body.queryResult.action == "Internship_Registration") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Please visit https://www.miraclesoft.com/events/internship-2017.php", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "https://www.miraclesoft.com/events/internship-2017.php",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "Please click below option for registration"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]

            });


          }

          else if (req.body.queryResult.action == "Interview_Process") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "We have 4 rounds Aptitude, Java Programming, Technical and HR rounds", "bot")

            res.json({
              "fulfillmentText": "We have 4 rounds Aptitude, Java Programming, Technical and HR rounds",
              "source": 'webhook-sample'
            });


          }

          else if (req.body.queryResult.action == "Job_Interviews") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "We have job fair every Friday at Indian Operations location - Miracle Software Systems (I) Pvt. Ltd. MIG-49 Lawsons Bay Colony Visakhapatnam, AP - 530017, India. You can attend an interview if possible", "bot")


            res.json({
              "fulfillmentText": "We have job fair every Friday at Indian Operations location - Miracle Software Systems (I) Pvt. Ltd. MIG-49 Lawsons Bay Colony Visakhapatnam, AP - 530017, India. You can attend an interview if possible",
              "source": 'webhook-sample'
            });


          }


          else if (req.body.queryResult.action == "Job_Openings") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "What is your highest educational qualification", "bot")


            res.json({
              "fulfillmentMessages": [
                {
                  "quickReplies": {
                    "title": "What is your highest educational qualification",
                    "quickReplies": [
                      "BTech",
                      "MTech",
                      "MBA",
                      "MCA",
                      "Other"
                    ]
                  },
                  "platform": "FACEBOOK"
                },
                {
                  "text": {
                    "text": [
                      ""
                    ]
                  }
                }
              ]
            });


          }

          else if (req.body.queryResult.action == "Job_Openings.Job_Openings-custom") {
            updatelog(FbUserId, "Please send your resume to vspjobs@miraclesoft.com. So that our team can contact you.")
            res.json({
              "fulfillmentText": "Please send your resume to vspjobs@miraclesoft.com. So that our team can contact you.",
              "platform": "FACEBOOK"
            })

          }


          else if (req.body.queryResult.action == "Job_Openings.Job_Openings-Other") {
            updatelog(FbUserId, "We are not currently providing any job openings for you. Thank you for reaching us")
            res.json({
              "fulfillmentText": "We are not currently providing any job openings for you. Thank you for reaching us",
              "platform": "FACEBOOK"
            })

          }







          else if (req.body.queryResult.action == "Job_Position") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Please send your resume to vspjobs@miraclesoft.com.", "bot")


            res.json({
              "fulfillmentText": "Please send your resume to vspjobs@miraclesoft.com",
              "source": 'webhook-sample'
            });
          }



          else if (req.body.queryResult.action == "Job_Vacancies_Issue") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Your profile might have been missed in the process. Can you please send us your resume to vspjobs@miraclesoft.com and we'll look through it. Looking forward to hearing from you soon", "bot")

            res.json({
              "fulfillmentText": "Your profile might have been missed in the process. Can you please send us your resume to vspjobs@miraclesoft.com and we'll look through it. Looking forward to hearing from you soon",
              "source": 'webhook-sample'
            });


          }

          else if (req.body.queryResult.action == "Methodologies") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Miracle follows multiple methodologies such as RING and POWER to provide quality and innovative services. Get more details on http://www.miraclesoft.com/why/methodologies", "bot")

            res.json({
              "fulfillmentText": "Miracle follows multiple methodologies such as RING and POWER to provide quality and innovative services. Get more details on http://www.miraclesoft.com/why/methodologies",
              "source": 'webhook-sample'
            });


          }


          else if (req.body.queryResult.action == "MIL_team") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "MIL is a team of researchers focusing on Next Gen technologies like Chat bots, Big Data, Cloud Computing, DevOps and many more. Read More on http://www.miraclesoft.com/why/innovation", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/why/innovation",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "MIL is a team of researchers focusing on Next Gen technologies like Chat bots, Big Data, Cloud Computing, DevOps and many more"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });


          }

          else if (req.body.queryResult.action == "Miracle_Founded") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Miracle was founded in 1994 and has over 25 years of experience servicing numerous Fortune 500 companies.", "bot")

            res.json({
              "fulfillmentText": "Miracle was founded in 1994 and has over 25 years of experience servicing numerous Fortune 500 companies.",
              "source": 'webhook-sample'
            });


          }

          else if (req.body.queryResult.action == "Miracle_Founder") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Prasad Lokam is our beloved CEO and founded Miracle Software Systems in 1994", "bot")

            res.json({
              "fulfillmentText": "Prasad Lokam is our beloved CEO and founded Miracle Software Systems in 1994",
              "source": 'webhook-sample'
            });


          }
          else if (req.body.queryResult.action == "Miracle_Gallery") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "We love taking pictures of our events, you can check out all the memories in our gallery.Here you go http://www.miraclesoft.com/gallery/", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/gallery/",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "We love taking pictures of our events, you can check out all the memories in our gallery.Here you go"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });
          }

          else if (req.body.queryResult.action == "Miracle_Headquarters") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Our headquarters is in Novi, MI – USA with offices across the globe. Find us on http://www.miraclesoft.com/contact/locations", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/contact/locations",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "Our headquarters is in Novi, MI – USA with offices across the globe. Find us on"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });


          }

          else if (req.body.queryResult.action == "Miracle_Headquarters.Miracle_Headquarters-custom") {

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "http://www.miraclesoft.com/contact/locations",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "Please click below link"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            });

          }
          else if (req.body.queryResult.action == "NeverMind") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Sure, is there anything else that you need help with?", "bot")

            res.json({
              "fulfillmentText": "Sure, is there anything else that you need help with?",
              "source": 'webhook-sample'
            });


          }
          else if (req.body.queryResult.action == "Queries_Internship") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Please do register again with correct details", "bot")

            res.json({
              "fulfillmentText": "Please do register again with correct details",
              "source": 'webhook-sample'
            });


          }
          else if (req.body.queryResult.action == "Queries_Interviews") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Please bring 2 copies of resume and passport size photos. If there are any study certificates you can bring them too", "bot")

            res.json({
              "fulfillmentText": "Please bring 2 copies of resume and passport size photos. If there are any study certificates you can bring them too",
              "source": 'webhook-sample'
            });


          }


          else if (req.body.queryResult.action == "Targeted_Employees") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Today, Miracle’s team includes 2600 IT Professionals and Miracle envisions itself to be at 50,000 IT professionals by 2020 and become a pioneer and specialist in niche IT spaces", "bot")

            res.json({
              "fulfillmentText": "Today, Miracle’s team includes 2600 IT Professionals and Miracle envisions itself to be at 50,000 IT professionals by 2020 and become a pioneer and specialist in niche IT spaces",
              "source": 'webhook-sample'
            });


          }


          else if (req.body.queryResult.action == "Technical_Expertise") {
            console.log(user[index].botactive)
            var contacts = req.body.queryResult.parameters.Contacts
            console.log("req body paramete", req.body.queryResult.parameters)
            console.log("req body query result parameters contacts", req.body.queryResult.parameters.Contacts)

            updatelog(FbUserId, "Sure, I can connect you with our " + contacts + "  Team. Would you like for me to reply a message back to them?", "bot")

           res.json({
            "fulfillmentMessages": [
              {
                "quickReplies": {
                  "title": "Sure, I can connect you with our " + contacts + "  Team. Would you like for me to reply a message back to them?",
                  "quickReplies": [
                    "YES",
                    "NO"
                  ]
                },
                "platform": "FACEBOOK"
              },
              {
                "text": {
                  "text": [
                    ""
                  ]
                }
              }
            ]
          })

          }


else if(req.body.queryResult.action=="Technical_Expertise.Technical_Expertise-yes"){
   res.json({
     
    "fulfillmentMessages": [
      {
        "payload": {
          "facebook": {
            "attachment": {
              "payload": {
                "buttons": [
                  {
                    "type": "web_url",
                    "url": "http://www.miraclesoft.com/contact/",
                    "title": "Read More"
                  }
                ],
                "template_type": "button",
                "text": "Okay! Please fill the contact form, So we could send a message. Click here"
              },
              "type": "template"
            }
          }
        },
        "platform": "FACEBOOK"
      }
    ]

   })
}
          else if (req.body.queryResult.action == "Technologies_DigitalSummit") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "The program mainly focuses on trending technologies like IoT, Blockchain, DevOps, Big Data, Machine Learning, Chatbots, etc", "bot")

            res.json({
              "fulfillmentText": "The program mainly focuses on trending technologies like IoT, Blockchain, DevOps, Big Data, Machine Learning, Chatbots, etc",
              "source": 'webhook-sample'
            });


          }


          else if (req.body.queryResult.action == "Thankyou") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "Hope you found everything you were looking for. Have a great day!", "bot")

            res.json({
              "fulfillmentText": "Hope you found everything you were looking for. Have a great day!",
              "source": 'webhook-sample'
            });


          }
          else if (req.body.queryResult.action == "When_DigitalSummit") {
            console.log(user[index].botactive)

            updatelog(FbUserId, "This event is held every year in the month of December at Miracle Valley, Vizag.", "bot")

            res.json({
              "fulfillmentText": "This event is held every year in the month of December at Miracle Valley, Vizag.",
              "source": 'webhook-sample'
            });
          }

          else if(req.body.queryResult.action=="webinars"){
            
            updatelog(FbUserId, "https://www.miraclesoft.com/events/internal-webinar-depot", "bot")

            res.json({
              "fulfillmentMessages": [
                {
                  "payload": {
                    "facebook": {
                      "attachment": {
                        "payload": {
                          "buttons": [
                            {
                              "type": "web_url",
                              "url": "https://www.miraclesoft.com/events/internal-webinar-depot",
                              "title": "Read More"
                            }
                          ],
                          "template_type": "button",
                          "text": "Below is the link to find webinars in miracle"
                        },
                        "type": "template"
                      }
                    }
                  },
                  "platform": "FACEBOOK"
                }
              ]
            })
          }

        }, 2000);
      }
    }
  }
  })


  socket.on("sendReq",function (message, userid) {
    console.log("Message Received: " + message);
    if (getRequest != message) {
      console.log("Message Received: " + message);

      loginSend(userid, message);
      getRequest = message;
    }

  });

  socket.on("end", function(uid) {
    console.log("ended", uid)
    loginSend(uid, "Your chat has been ended by live agent");
    index = user.findIndex(x => x.id === uid);
    user[index].botactive = true;
    user[index].status = 'none'
    user[index].skt = ''    
      io.sockets.emit('reqw', user)
  })

  function loginSend(id, text) {

    var dataPost = {
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {
        access_token: token
      },
      method: 'POST',
      json: {
        recipient: {
          id: id
        },
        message: {
          "text": text
        }
      }
    };
    requestFunction(dataPost)
  }

  function requestFunction(dataPost) {

    request(dataPost, function(error, response, body) {
      if (error) {
        console.log('Error when we try to sending message: ', error);
      } else if (response.body.error) {
        console.log('Error: ', response.body.error);
      } else {
        console.log("Successfully Sent the message");
      }
    });

  }

  var getRequest;
  function agent(FbUserId, message) {
    index = user.findIndex(x => x.id === FbUserId);
    console.log(index, FbUserId, "sending messag")
    io.to(user[index].skt).emit('message', message, FbUserId);
  }
});

server.listen(process.env.PORT || 5000,function  ()  {
  console.log("started on port 5000");
});

function createlog(FbUserId, message) {
  request('https://graph.facebook.com/v3.2/' + FbUserId + '?fields=id,first_name,last_name,profile_pic&access_token=EAAdnxGu0F5IBAB5zo4ZBO9txrD1Phe3LnfnZAodX0UxZCBwyyiZCULCCJZBaAK5ENco9aRxIZCtfZAe3Sds69ZAJIWPYvFQB05nZBZCLMU1ZBWZB4WcrhNZC2OpKVE92QkEn4i6NTckZB9k8W1pMgG0idr4cLMvFVhRebLydxoCShSlRdqJPJ3nVpPpeo0',
      function (err, response, body) {
      var res = JSON.parse(body)
      var i =    user.findIndex(obj => obj.id == FbUserId);
      user[i].first_name = res.first_name
      user[i].profile_pic = res.profile_pic
      userlog.create({
        '_id': FbUserId,
        'messages': [
          {
            'type': 'received',
            'message': message,
            'timestamp': Date.now()
          }
        ],
        'status': 'none',
        'first_name': res.first_name,
        'last_name': res.last_name,
        'profile_pic': res.profile_pic
      }, (err, data) => {
        console.log('data created')
      })
    })


}
function updatelog(FbUserId, message, t) {

  console.log('update')
  console.log(t)
  if (t == 'user')
    typ = 'received'
  else
    typ = 'sent'
  userlog.update({ "_id": FbUserId }, {
    $push: {
      'messages': [
        {
          'type': typ,
          'message': message,
          'timestamp': Date.now()
        }
      ]
    }
  }, function (err, data) {
    console.log('data update')
  })
}

app.post('/getrequests', function (req, res) {
  userlog.find({ "_id": req.body._id }, function(err, data) {
    if (err)
      console.log(err)
    else
      console.log("/getrequests")
    // console.log(data[0])
    res.json(data[0])
  }).sort({ timestamp: -1 })
})

app.post('/update', function(req, res) {
  console.log(req.body)
  userlog.update({ "_id": req.body._id }, { "status": req.body.status }, function(err, res) {
    console.log('updated')
  })
})


app.get('/',function(req, res)  {
  console.log('file send')
  res.sendFile(path.join(__dirname, '/views', 'index.html'));
})
app.post('/login', function(req, res) {
  console.log((req.body.username+''+req.body.pwd))
  request( {url:'http://192.168.1.119:8080/HubbleServices/hubbleresources/helpdesk-service/helpdesk-login',    
  method: 'POST',
 headers:{'Content-Type':'application/json'},
  body:{
    "LoginId":req.body.username,
    "Password":req.body.pwd,
    "Authorization":"YWRtaW46YWRtaW4="
    },
      json:true},function(err,resp,body){
    if(err)    
    console.log(err)
    else {
    console.log(resp.body)
    console.log(body)
      res.send(resp.body)
    }
  })
})