const canvas = document.querySelector(".myCanvas");
var width = canvas.clientWidth;
var height = canvas.clientHeight;
canvas.width = width;
canvas.height = height;
const c = canvas.getContext("2d");

let camera = {x: 0, y: 0};
let offset = {x: width/2, y: height/2};
let cameraNext = {x: camera.x, y: camera.y};

calculateCanvasResolution();

var slider = document.getElementById("myRange");
var timeLabel = document.getElementById("timeLabel");
slider.value = 0;

let isPlaying = true;

let mouseX = 0;
let mouseY = 0;



let trackedTargetId = undefined;

let zoom = 1.0;
let zoomNext = zoom;

let options = {
	showNames: true,
};

let recording;

let isAnimate = true;

function worldToScreen(x, y) {
	x = (x - camera.x) * zoom + offset.x;
	y = (y - camera.y) * zoom + offset.y;
	return {x, y};
}

function screenToWorld(x, y) {
	x = (x - offset.x) / zoom + camera.x;
	y = (y - offset.y) / zoom + camera.y;
	return {x, y};
}

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
  console.log("scc length " + scc.length);

  let startTime = null;
  let blocks = [];
  let rows = scc.split("\n");

  // Check if the file has at least two lines
  if (rows.length < 2) {
    console.warn("Invalid format: File should have at least two lines");
    return null;
  }

  // Check if the first line contains "version 1"
  if (rows[0].trim() !== "version 1") {
    console.warn("Invalid format: Missing 'version 1' in the first line");
    return null;
  }

  // Check if the second line contains the expected header
  const expectedHeader = "kind,name,owner,faction,entityId,health,position,rotation";
  if (rows[1].trim() !== expectedHeader) {
    console.warn("Invalid format: Incorrect header");
    return null;
  }

  let columnHeaders = rows[1].split(",");

  for (let i = 2; i < rows.length; i++) {
    let row = rows[i];
    let cols = row.split(",");
    let entry_kind = cols[0];

    switch (entry_kind) {
      case "start_block":
        let timestamp = Date.parse(cols[1]);
        if (startTime == null) startTime = timestamp;
        else timestamp -= startTime;
        blocks.push({ time: timestamp, entries: [] });
        break;
      case "grid":
        if (blocks.length <= 0) {
          console.warn("Invalid format: 'grid' entry found before 'start_block'");
          return null;
        }
        let grid = {};
        columnHeaders.forEach((key, i) => (grid[key] = cols[i]));
        grid["position"] = Vector3(grid["position"]);
        blocks[blocks.length - 1].entries.push(grid);
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
			f.text().then(t => {
			const result = parseSCC(t);
			if (result !== null) {
				let title = document.getElementById("title");
				title.innerText = f.name;
			} else {
				console.warn("Invalid file format. Playback stopped.");
				drawWarningMessage("Invalid file format. Playback stopped.");
			}
			});
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

function update(dt) {}

let scrubber = 0.0;

function lerp(v0, v1, t) {
	return v0*(1-t)+v1*t
}

function drawWarningMessage(message) {
  clear();
  c.fillStyle = "red";
  c.font = "24px Arial";
  c.textAlign = "center";
  c.fillText(message, canvas.width / 2, canvas.height / 2);
}

function drawGrid() {
	let S = worldToScreen(0, 0);
	let x = S.x;
	let y = S.y;
	c.strokeStyle = "green";
	// vertical
	c.beginPath();
	c.moveTo(x,0);
	c.lineTo(x,height);
	c.stroke();
	
	c.lineWidth = 1;
	// horizontal
	c.beginPath();
	c.moveTo(0,y);
	c.lineTo(width,y);
	c.stroke();
	
	// TODO: Bring back grid
	// return;
	
	// let meters = 100 * (1/zoom);
	// let spacing = meters * zoom;
	// c.lineWidth = 0.5;
	// for (let i = 0; x + i * spacing < width; ++i) {
		// c.beginPath();
		// c.moveTo(x+i*spacing, 0);
		// c.lineTo(x+i*spacing, height);
		// c.stroke();
	// }
	// for (let i = 0; x - i * spacing > 0; ++i) {
		// c.beginPath();
		// c.moveTo(x-i*spacing, 0);
		// c.lineTo(x-i*spacing, height);
		// c.stroke();
	// }
	
	
	
	// c.lineWidth = 0.5;
	// for (let i = 0; y + i * spacing < width; ++i) {
		// c.beginPath();
		// c.moveTo(0, y+i*spacing);
		// c.lineTo(width, y+i*spacing);
		// c.stroke();
	// }
	// for (let i = 0; y - i * spacing > 0; ++i) {
		// c.beginPath();
		// c.moveTo(0, y-i*spacing);
		// c.lineTo(width, y-i*spacing);
		// c.stroke();
	// }
	
	// // draw scale indicator
	// x = 0 + 10;
	// y = height - 20;
	// c.lineWidth = 2;
	// c.beginPath();
	// c.moveTo(x, y);
	// c.lineTo(x + spacing, y);
	// c.stroke();
	// c.fillStyle = "green";
	// c.fillText(Math.round(meters) + " m", x, y - 8);
}

function drawRings() {
	// draw distance rings (radii in meters)
	let rings = [100, 250, 500, 1000, 5000, 10000, 20000];
	let ringColor = "green";
	let p = worldToScreen(0, 0);
	let x = p.x;
	let y = p.y;
	
	c.strokeStyle = ringColor;
	for (radius of rings) {
		//if (radius * zoom > width / 1.5) break;
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

function secondsToTime(e){
    const h = Math.floor(e / 3600).toString().padStart(2,'0'),
          m = Math.floor(e % 3600 / 60).toString().padStart(2,'0'),
          s = Math.floor(e % 60).toString().padStart(2,'0');
    
    return h + ':' + m + ':' + s;
    //return `${h}:${m}:${s}`;
}


let cachedScreenPositions = [];

function draw(dt) {
	zoom = lerp(zoom, zoomNext, 0.05125);
	
	drawGrid();
	drawRings();
	
	if (recording) {
		let proportion = 1.0 / (recording.length - 1);
		let remapped = scrubber / proportion;
		let currentIndex = Math.floor(remapped);
		let nextIndex = currentIndex+1;
		
		if (nextIndex == recording.length) {
			nextIndex = currentIndex;
		}
		
		let currentData = recording[currentIndex];
		let nextData = recording[nextIndex];
		
		let radius = 5;
		
		let fill = "white";
		
		cachedScreenPositions = [];
		
		for (obj of currentData.entries) {
			let next = nextData.entries.find(e => e.entityId == obj.entityId);
			
			let nextPosition = {x: 0, y: 0};
			let amt = 0.0;
			if (next) {
				nextPosition = next.position;
				amt = remapped - Math.floor(remapped);
			}
			let wx = lerp(obj.position.x, nextPosition.x, amt);
			let wy = lerp(obj.position.y, nextPosition.y, amt);
			
			if (trackedTargetId === obj.entityId) {
				camera.x = wx;
				camera.y = wy;
			}
			
			let S = worldToScreen(wx, wy);
			let x = S.x;
			let y = S.y;
			S.entityId = obj.entityId;
			cachedScreenPositions.push(S);
			
			c.beginPath();
			c.arc(x, y, radius, 0, Math.PI * 2, false);
			c.fillStyle = fill;
			c.fill();
			
			let xoff = 4;
			let yoff = 4;
			// velocity as delta distance between two frames
			let velocity = Math.sqrt(sq(nextPosition.x - obj.position.x) + (nextPosition.y - obj.position.y));
			if (isNaN(velocity)) velocity = 0;
			if (options.showNames) {
				c.fillText(obj.name + " "+velocity.toFixed(0)+" m/s", x + xoff + radius, y + yoff - radius);
			}
		}
		if (isPlaying && !isSliding) {
		// NOTE: assumes recording samples are one second apart.
			scrubber += dt / (recording.length * 1000);
			slider.value = scrubber * 100;
			if (scrubber >= 1.0) scrubber = 0;
		}
		
		// timeLabel
		timeLabel.innerHTML = secondsToTime(Math.floor(scrubber * (recording.length)))+"/"+secondsToTime(recording.length);
	}
}

var isSliding = false;

slider.addEventListener('input', function () {
  isSliding = true;
  scrubber = slider.value / 100;
});

slider.addEventListener('mouseup', function () {
  isSliding = false;
  scrubber = slider.value / 100;
});

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
	offset = {x: width/2, y: height/2};
}

clear();
init();
animate();

function sq(n) { return n * n; }
let dragStartPosition = null;
let cameraPrv = camera;
canvas.addEventListener("mousedown", (e) => {
	let S = {x: mouseX, y: mouseY};
	let hitRadius = 100;
	for (let i = 0; i < cachedScreenPositions.length; ++i) {
		let p = cachedScreenPositions[i];
		let squaredDistance = sq(S.x-p.x) + sq(S.y-p.y);
		if (squaredDistance < hitRadius) {
			trackedTargetId = p.entityId;
			offset.x = width/2;
			offset.y = height/2;
			return;
		}
	}
	trackedTargetId = undefined;

	cameraPrv = {x: camera.x, y: camera.y};
	dragStartPosition = {x: mouseX, y: mouseY};
});

canvas.addEventListener("mouseup", (e) => {
	if (dragStartPosition) {
		camera.x = cameraPrv.x + (dragStartPosition.x - mouseX) / zoom;
		camera.y = cameraPrv.y + (dragStartPosition.y - mouseY) / zoom;
		dragStartPosition = null;
	}
});

let zoomIndex = 4;

canvas.addEventListener("wheel", e => {
    e.preventDefault();
    let scrollDelta = e.deltaY > 0 ? 1 : -1;
    let zoomLevels = [16, 8, 4, 2, 1, 0.5, 0.25, 0.125, 0.0625, 0.03125];
    let prvZoomIndex = zoomIndex;
    zoomIndex += scrollDelta;

    if (zoomIndex < 0) zoomIndex = 0;
    if (zoomIndex >= zoomLevels.length) zoomIndex = zoomLevels.length - 1;

    let prvZoom = zoom;
    zoomNext = zoomLevels[zoomIndex];

    if (prvZoomIndex === zoomIndex) return;
	
	// if the camera is tracking something, don't try to zoom-to-cursor
	if (trackedTargetId !== undefined) return;
	
	// Get the world point that is under the mouse
    let M = screenToWorld(mouseX, mouseY);

    // Set the offset to where the mouse is
    offset.x = mouseX;
	offset.y = mouseY;

    // Set the target to match, so that the camera maps the world space point 
    // under the cursor to the screen space point under the cursor at any zoom
    camera.x = M.x;
	camera.y = M.y;
	
}, { passive: false });

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
		camera.x = cameraPrv.x + (dragStartPosition.x - mouseX) / zoom;
		camera.y = cameraPrv.y + (dragStartPosition.y - mouseY) / zoom;
	}
});

