const canvas = document.querySelector(".myCanvas");
var width = canvas.clientWidth;
var height = canvas.clientHeight;
canvas.width = width;
canvas.height = height;
const c = canvas.getContext("2d");

calculateCanvasResolution();

let mouseX = 0;
let mouseY = 0;

let camera = {x: 0, y: 0};
let cameraNext = camera;

let zoom = 1.5;
let zoomNext = zoom;

let recording;

let isAnimate = true;

function clear() {
	loaded = false;
	if (loaded) {
		c.drawImage(starfield, 0, 0);
		c.fillStyle = "rgba(0, 0, 0, 0.5)";
		c.fillRect(0, 0, width, height);
	} else {
		c.fillStyle = "#003";
		c.fillRect(0, 0, width, height);
	}
}

function init() {
}

function Vector3(str) {
	let f = str.split(" ").map(e => Number(e));
	return {x: f[0], y: f[1], z: f[2]};
}

function parseSCC(scc) {
	const startTag = "start_block";
	const gridTag = "grid";
	console.log("scc length "+scc.length);
	let startTime = null;
	let blocks = [];
	let rows = scc.split("\n");
	let columnHeaders = rows[1].split(",");
	for (let row of rows) {
		let cols = row.split(",");
		let entry_kind = cols[0];
		switch (entry_kind) {
			case "start_block":
				let timestamp = Date.parse(cols[1]);
				if (startTime == null) startTime = timestamp; else timestamp -= startTime;
				blocks.push({time: timestamp, entries: []});
			break;
			case "grid":
				if (blocks.length <= 0) {
					console.log("error: expected start_block before first grid entry");
					return;
				}
				let grid = {};
				columnHeaders.forEach((key, i) => grid[key] = cols[i]);
				grid["position"] = Vector3(grid["position"]);
				blocks[blocks.length-1].entries.push(grid);
			break;
		}
	}
	console.log(blocks);
	recording = blocks;
	return blocks;
}

function dragOverHandler(e) {
	e.preventDefault();
}
function dropHandler(e) {
	console.log('File(s) dropped');
	// Prevent default behavior (Prevent file from being opened in new tab)
	e.preventDefault();
	let files = [];
	if (e.dataTransfer?.items) {
		// Use DataTransferItemList interface to access the file(s)
		for (var i = 0; i < e.dataTransfer.items.length; i++) {
			// If dropped items aren't files, reject them
			if (e.dataTransfer.items[i].kind === 'file') {
				let file = e.dataTransfer.items[i].getAsFile();
				if (file)
					files.push(file);
			}
		}
	}
	else {
		// Use DataTransfer interface to access the file(s)
		if (e.dataTransfer) {
			for (var i = 0; i < e.dataTransfer.files.length; i++) {
				files.push(e.dataTransfer.files[i]);
			}
		}
	}
	files.forEach(f => console.log(f.name));
	files.forEach(f => {
		if (f.name.toLowerCase().includes(".scc")) {
			f.text().then(t => parseSCC(t));
		}
	});
}

let previousTimeStamp;
function animate(timeStamp) {
	if (previousTimeStamp === undefined) {
		previousTimeStamp = timeStamp;
	}
	const dt = timeStamp - previousTimeStamp;
	requestAnimationFrame(animate);
	clear();
	if(isAnimate)
		update(dt);
	draw(dt);
	previousTimeStamp = timeStamp;
}

function update(dt) {
}

let scrubber = 0.0;

function lerp(v0, v1, t) {
	return v0*(1-t)+v1*t
}

function drawGrid() {
	let x = width/2 + camera.x;
	let y = height/2 + camera.y;
	c.strokeStyle = "green";
	// vertical
	c.beginPath();
	c.moveTo(x,0);
	c.lineTo(x,height);
	c.stroke();
	
	let meters = 100 * (1/zoom);
	let spacing = meters * zoom;
	c.lineWidth = 0.5;
	for (let i = 0; x + i * spacing < width; ++i) {
		c.beginPath();
		c.moveTo(x+i*spacing, 0);
		c.lineTo(x+i*spacing, height);
		c.stroke();
	}
	for (let i = 0; x - i * spacing > 0; ++i) {
		c.beginPath();
		c.moveTo(x-i*spacing, 0);
		c.lineTo(x-i*spacing, height);
		c.stroke();
	}
	
	c.lineWidth = 1;
	// horizontal
	c.beginPath();
	c.moveTo(0,y);
	c.lineTo(width,y);
	c.stroke();
	
	c.lineWidth = 0.5;
	for (let i = 0; y + i * spacing < width; ++i) {
		c.beginPath();
		c.moveTo(0, y+i*spacing);
		c.lineTo(width, y+i*spacing);
		c.stroke();
	}
	for (let i = 0; y - i * spacing > 0; ++i) {
		c.beginPath();
		c.moveTo(0, y-i*spacing);
		c.lineTo(width, y-i*spacing);
		c.stroke();
	}
	
	// draw scale indicator
	x = 0 + 10;
	y = height - 20;
	c.lineWidth = 2;
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x + spacing, y);
	c.stroke();
	c.fillStyle = "green";
	c.fillText(Math.round(meters) + " m", x, y - 8);
}

function drawRings() {
	// draw distance rings (radii in meters)
	let rings = [100, 250, 500, 1000, 5000, 10000, 20000];
	let ringColor = "green";
	let x = camera.x + width/2;
	let y = camera.y + height/2;
	
	c.strokeStyle = ringColor;
	for (radius of rings) {
		if (radius * zoom > width / 1.5) break;
		c.beginPath();
		c.lineWidth = 1;
		c.arc(x, y, radius * zoom, 0, Math.PI * 2, false);
		c.stroke();
		let pad = 4;
		c.fillStyle = ringColor
		if (zoom*radius > 50) {
			c.fillText(radius+" m", x + radius*zoom + pad, y - pad);
		}
	}
	c.setLineDash([]);
}

function draw(dt) {
	zoom = lerp(zoom, zoomNext, 0.05125);
	camera.x = lerp(camera.x, cameraNext.x, 0.05125);
	camera.y = lerp(camera.y, cameraNext.y, 0.05125);
	
	drawGrid();
	drawRings();
	
	if (recording) {
		let proportion = 1.0 / recording.length;
		let remapped = scrubber / proportion;
		let currentIndex = Math.floor(remapped);
		let nextIndex = currentIndex+1;
		
		if (nextIndex == recording.length) {
			scrubber = 0;
			return;
		}
		
		let currentData = recording[currentIndex];
		let nextData = recording[nextIndex];
		
		let radius = 5;
		
		let fill = "white";
		
		for (obj of currentData.entries) {
			let next = nextData.entries.find(e => e.name == obj.name);
			let nextPosition = {x: 0, y: 0};
			let amt = 0.0;
			if (next) {
				nextPosition = next.position;
				amt = remapped - Math.floor(remapped);
			}
			let x = (lerp(obj.position.x, nextPosition.x, amt) * zoom) + width/2;
			let y = (lerp(obj.position.y, nextPosition.y, amt) * zoom) + height/2;
			
			x = x + camera.x;
			y = y + camera.y;
			
			c.beginPath();
			c.arc(x, y, radius, 0, Math.PI * 2, false);
			c.fillStyle = fill;
			c.fill();
			
			let xoff = 4;
			let yoff = 4;
			c.fillText(obj.name, x + xoff + radius, y + yoff - radius);
		}
		// NOTE: assumes recording samples are one second apart.
		scrubber += dt / (recording.length * 1000);
		if (scrubber >= 1.0) scrubber = 0;
	}
}

function polarToCart(radius, theta) {
	return {
		x: radius * Math.cos(theta),
		y: radius * Math.sin(theta)
	}
}

function cartToPolar(x, y) {
	return {
		theta: Math.atan2(x, y),
		radius: Math.sqrt(x * x + y * y)
	}
}

function calculateCanvasResolution() {
	width = canvas.clientWidth;
	height = canvas.clientHeight;
	canvas.width = width;
	canvas.height = height;
}

clear();
init();
animate();

let dragStartPosition = null;
let cameraPrv = camera;
canvas.addEventListener("mousedown", (e) => {
	cameraPrv = {x: camera.x, y: camera.y};
	dragStartPosition = {x: mouseX, y: mouseY};
});

canvas.addEventListener("mouseup", (e) => {
	if (dragStartPosition) {
		camera.x = cameraPrv.x + mouseX - dragStartPosition.x;
		camera.y = cameraPrv.y + mouseY - dragStartPosition.y;
		dragStartPosition = null;
	}
});

let zoomIndex = 4;

canvas.addEventListener("wheel", e => {
	let scrollDelta = e.deltaY > 0 ? 1 : -1;
	let zoomLevels = [16, 8, 4, 2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125];
	zoomIndex += scrollDelta;
	if (zoomIndex < 0) zoomIndex = 0;
	if (zoomIndex >= zoomLevels.length) zoomIndex = zoomLevels.length-1;
	zoomNext = zoomLevels[zoomIndex];
	// TODO: zoom to cursor
}, { passive: true });

window.onresize = calculateCanvasResolution;

canvas.addEventListener("mousemove", function(e) { 
	let cRect = canvas.getBoundingClientRect();
	let canvasX = Math.round(e.clientX - cRect.left);
	let canvasY = Math.round(e.clientY - cRect.top);
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.fillStyle = "green";
	c.fillText("X: "+canvasX+", Y: "+canvasY, 10, 20);
	mouseX = canvasX;
	mouseY = canvasY;
	if (dragStartPosition) {
		camera.x = cameraPrv.x + mouseX - dragStartPosition.x;
		camera.y = cameraPrv.y + mouseY - dragStartPosition.y;
		console.log(camera);
	}
});

