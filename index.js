var fs = require("fs");
var express = require("express");
var app = express();
var api = express();
var http = require('http').Server(app);
var events = require("events");
var rl = require("readline");
var bodyParser = require("body-parser")
var url = require("url");
var io = require("socket.io")(http);
var xml = require("xml2js");
var eventEmitter = new events.EventEmitter();

app.get("/", function (req, res) {
    res.sendFile(__dirname + '/content/' + '/index.html');
});

app.get("/:file", function (req, res) {
    try {
        res.sendFile(__dirname + '/content/' + req.params.file);
    }
    catch (err) {

    }
});

app.get("/:folder/:file", function (req, res) {
    try {
        res.sendFile(__dirname + '/content/' + req.params.folder + "/" + req.params.file);
    }
    catch (err) {

    }
});

http.listen("8000", function () {
    console.log("listening on port: 8000");
});

/*var date = new Date();
var bmin = date.getMinutes();
setInterval(function () {
    date = new Date();
    if (date.getMinutes() != bmin) {
        bmin = date.getMinutes();
        eventEmitter.emit("time change");
    }
}, 2000)*/

eventEmitter.on("time change", function () {
    fs.readFile("./questions.json", function (err, data) {
        if (err) throw err;
        if (data != "") {
            data = JSON.parse(data);
            var question = data.shift();
            fs.writeFile("./questions.json", JSON.stringify(data), function (err) {
                question = data.shift();
                io.emit("page loaded", question);
            });
        }
    });
});

function submitedToday(ip, xml) {
    for (var i = 0; i < xml.length; i++) {
        if (xml[i].ip == ip) {
            return true;
        }
    }
    return false;
}

function averageDataValues(data) {
    var averagevals = {};
    for (e in data) {
        if (averagevals[data[e][0].value.replace(":", "")]) {
            averagevals[data[e][0].value.replace(":", "")] += 1;
            averagevals["total"] += 1;
        }
        else {
            averagevals[data[e][0].value.replace(":","")] = 1;
            averagevals["total"] = 1;
        }
    }
    console.log(averagevals);
}

io.on("connection", function (socket) {

    var ipaddress;
    if (socket.request.client._peername.address.length > 5) {
        ipaddress = socket.request.client._peername.address.substring(7, socket.request.client._peername.address.length);
    }
    else {
        ipaddress = socket.request.client._peername.address;
    }

    socket.on("page loaded", function () {
        fs.readFile("./questions.json", function (err, data) {
            if (err) throw err;
            if (data != "") {
                data = JSON.parse(data);
                var question = data.shift();
                socket.emit("page loaded", question);
            }
        });
    });
    socket.on("submit", function (value) {
        var xmlparser = new xml.Parser();
        var xmlbuilder = new xml.Builder();
        fs.readFile("./db.xml", function (err, result) {
            if (!err) {
                xmlparser.parseString(result, function (err, data) {
                    /*if (submitedToday(ipaddress, data.data.submited_today[0].user)) {

                    } else {
                        data.data.submited_today[0].user.push({ ip: [ipaddress] });
                        fs.writeFile("./db.xml", xmlbuilder.buildObject(data), function (err) {});
                    }*/
                    var cdate = new Date();
                    if (data.data.cdata[0].data) {
                        data.data.cdata[0].data.push({ ip: ipaddress, day: cdate.getDate(), month: cdate.getMonth(), year: cdate.getFullYear(), milisectime: cdate.getTime(), time: `${cdate.getHours()}:${cdate.getMinutes()}`, value: value[0], textval: value[1]});
                    }
                    else {
                        data.data.cdata[0] = { data: [{ ip: ipaddress, day: cdate.getDate(), month: cdate.getMonth(), year: cdate.getFullYear(), milisectime: cdate.getTime(), time: `${cdate.getHours()}:${cdate.getMinutes()}`, value: value[0], textval: value[1]}] };
                    }
                    console.log(data);
                    data.data.submited_today[0].user.push({ ip: [ipaddress] });
                    //averageDataValues(data.data.cdata[0])
                    fs.writeFile("./db.xml", xmlbuilder.buildObject(data), function (err) {});
                });
            }
            else {
                console.error(err);
            }
        });
    });
});