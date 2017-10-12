var express = require('express');
var app = express();

var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var dbUrl = process.env.DB_URL;

app.use(express.static('public'));
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get("/:seq", function (req, res){
  //console.log("/:seq " +req.params.seq);
  getDatabaseResult(req.params.seq, res); 
});

app.get("/new/*", function(req, res) {
  var url = req.params[0];
  if (isUrlValid(url)) {
    insertNewUrl(url, res);
  } else {
    res.send({"error":"Wrong url format, make sure you have a valid protocol and real site."});
  }
  
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

function isUrlValid(url){
  var pattern = /^((ht|f)tps?):\/\/([w]{3}\.)?([^\s]+(:[^\s]+)?@)?([\da-z\-]{2,}\.[a-z]{2,})(:[\d]+)?((\.[\da-z\-]{2,})|(\/[^\s]*))*$/i;
  
  if(pattern.test(url)){
    return true;
  } else {
    return false;
  }
}

function getDatabaseResult(id, res){
  
  MongoClient.connect(dbUrl, function(err, db){
    if(err) {
      //console.log('Unable to connect to the mongoDB server. Error:', err)
      res.send({'error':'Unable to connect to the mongoDB server.'});
    };
    console.log('Connection established to', dbUrl);

      db.collection('urls').findOne({_id:parseInt(id)},function(err, result){        
        if(err) {
          //console.log(err);
          res.send({'error':'Unable to access the DB collection.'});
        } else {
          if(result) {
            //console.log("result url: "+result.url);   
            res.redirect(result.url);
          } else {
            res.send({"error":"This url is not on the database."});
          }
        }
        return null;
        db.close();
     });  
    
  });
}

function getNextSequence() { 
  return new Promise(function (resolve, reject){
    MongoClient.connect(dbUrl, function(err, db){
      if (err) return reject(err);
      db.collection('counters').findOneAndUpdate(
         { _id: 'urlid' }, 
         { $inc: { seq: 1 } },
         { new: true },
          function (err, doc){
            if(err) {
              console.log('Error:' + err.message);
              return reject(err);
            }

            //console.log("*************" + doc.value.seq);
            db.close();
            return resolve(doc.value.seq);
          }
       );
    });
  });  
} 

function insertNewUrl(url, res){
  getNextSequence().then(function(seq){    
    //console.log("Sequence: " + seq);
    if(seq){
      MongoClient.connect(dbUrl, function(err, db){
        if(err) {
          res.send({'error':'Couldn\'nt connect to database.'});
          return console.log(err);
        }
        db.collection('urls').insertOne({_id: seq, url:url}, function(err, doc){
          if (err) {
            res.send({'error':'Couldn\'nt connect urls collection.'});
            return console.log(err);
          };

          //console.log(" 1 document inserted: " + doc); 
          db.close();
          res.send({"original_url":url, "short_url": "https://amusing-harmonica.glitch.me/" + seq});
        });
      });  
    } else {
      res.send({"error": "This url is not on the database."});
    }     
  });
  
}