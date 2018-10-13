var XLSX = require('xlsx');
const nanp = require('./region/nanp-script');
var path = require('path');
var SocketIOFileUpload = require('socketio-file-upload');
var socketio = require('socket.io');
var express = require('express');
var bodyParser = require('body-parser');
const port = 9999;
var app = express();
var server  = require('http').createServer(app);
app.use(SocketIOFileUpload.router).use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'uploads')));
var urlencodedParser = bodyParser.urlencoded({ extended: false });
var io = socketio.listen(server);

const indexFile = path.join(__dirname, 'assets','index.html');

app.get('/', function(req, res) {
  res.sendFile(indexFile);
});

app.post('/download',urlencodedParser,function(req,res) {
	const fullpath = path.join(__dirname,req.body.fileName)
	res.download(fullpath);
});

io.sockets.on("connection", function(socket){
 
    var uploader = new SocketIOFileUpload();
    uploader.dir = "uploads";
    uploader.listen(socket);
 
    uploader.on("saved", function(event){
		const fileName = event.file.pathName;
        //console.log(event.file.pathName);
		var workbook = XLSX.readFile(fileName);
		const sheet = workbook.Sheets[workbook.SheetNames[0]];
		var range = XLSX.utils.decode_range(sheet['!ref']);
		var phone_numbers = [];
		var region = [];
		for (let rowNum = range.s.r+1; rowNum <= range.e.r; rowNum++) 
		{
			const secondCell = sheet[XLSX.utils.encode_cell({r: rowNum, c: 0})];
			phone_numbers.push(secondCell.v)
		}
		region = nanp.compareNumber(phone_numbers);
		console.log(region.length);
		var cell_address = {r:0,c:3};
		add_cell_to_sheet(sheet,cell_address,'Region');
		for(let i=0;i<region.length;i++)
		{
			var cell_address = {r:i+1,c:3};
			add_cell_to_sheet(sheet,cell_address,region[i]);
		}
		var range = XLSX.utils.decode_range(sheet['!ref']);
		XLSX.writeFile(workbook,event.file.pathName);
		console.log("sending fileName");
		socket.send(fileName);
    });
 
    uploader.on("error", function(event){
        console.log("Error from uploader", event);
    });
});

function add_cell_to_sheet(worksheet, address, value) {
	
	var cell = {t:'s', v:value};
	
	worksheet[XLSX.utils.encode_cell(address)] = cell;
	var range = XLSX.utils.decode_range(worksheet['!ref']);
	
	if(range.s.c > address.c) range.s.c = address.c;
	if(range.s.r > address.r) range.s.r = address.r;
	if(range.e.c < address.c)
	{
		range.e.c = address.c;
	}
	if(range.e.r < address.r)
	{	
		range.e.r = address.r;
	}

	worksheet['!ref'] = XLSX.utils.encode_range(range);
}

server.listen(port,function(){
	console.log("listening on port"+port);
	nanp.readFile();
});