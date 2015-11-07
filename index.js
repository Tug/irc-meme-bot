var csv = require('csv');
var caption = require('caption');
var irc = require('irc');
var path = require('path');
var randomstring = require("randomstring");
var exec = require("child_process").exec;
var argv = require('yargs').argv;
var ircServer = argv.ircServer || 'irc.freenode.net';
var channel = argv.chan;
var nick = argv.nick || 'memegen';

var serverUrl= argv.host ? argv.host : 'http://'+require('os').hostname();

var client = new irc.Client(ircServer, nick, {
    channels: [channel],
    debug: true
});
console.log("Connecting to "+ircServer+" on channel", channel);


function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getExtension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
}

client.addListener('pm', function (from, message) {
  console.log('info: message received:', message + ' from:' + from);
  if(message == "help") {
    client.say(from, "list                                                list local files");
    client.say(from, "<local_filename|image_url> <caption1> [<caption2>]  generate the meme and print the image url in the public channel");
  } else if(message == "list") {
    exec("ls memes", function (error, stdout, stderr) {
      stdout = stdout.replace(/.jpg\n/g, ' ');
      stdout = stdout.replace(/\n/g, ' ');
      client.say(from, stdout);
    });
  } else {
    csv().from.string(message, { delimiter: ' ', escape: '"' }).to.array(function(data) {
      var message_parts = data[0];
      if(message_parts.length < 2) {
        client.say(from, "Give at least the image name and the top caption");
      }
      var imageUri = message_parts[0];
      var imageExt = getExtension(imageUri);
      var captionOptions = {
        caption: message_parts[1],
        bottomCaption: message_parts[2],
        outputFile: path.join("public", randomstring.generate(7)+(imageExt || '.jpg'))
      };
      var method = null;
      if(imageUri.indexOf("http") === 0) {
        method = caption.url;
      } else {
        method = caption.path;
        if(!imageExt || imageExt.length < 4 || imageExt.length > 5) {
          imageExt = ".jpg";
          imageUri += imageExt;
        }
        imageUri = path.join("memes", imageUri);
      }
      method(imageUri, captionOptions, function(err, captionedImage) {
        if(err) {
          console.log(err);
          client.say(from, err.message || err.toString());
          return;
        }
        client.say(channel, from+": "+serverUrl+"/"+captionOptions.outputFile);
      });
    });
  }
});

client.addListener('error', function(message) {
  console.log('error: ', message);
});

var url = require('url');
var express = require("express"),
    app     = express();

app.configure(function(){
    app.use("/public", express.static(__dirname + '/public'));
});

app.listen(13000);
