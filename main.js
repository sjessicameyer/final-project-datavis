// Initialize map and pull data
document.addEventListener("DOMContentLoaded", () => {
	Promise.all([initMap(), loadLocData(), loadCommData()]).then(data => {
		svgData = data[0];
		drawCoordData(svgData);
		drawContinentMasks(svgData);
	});

	document.getElementById("info-btn").addEventListener("click", () => {
		document.getElementById("methodology-section").scrollIntoView({ behavior: "smooth" });
	});

	document.getElementById("help-btn").addEventListener("click", () => {
		document.getElementById("help-content").classList.toggle("hidden");
	});
});

function randomInRange(min, max) {
	return(Math.floor((Math.random() * (max - min) + 1) + min));    
}

function randomFish(species) {
	let total = species.reduce((acc, curr) => acc + (curr.avg_abundance || curr.rate || 0), 0);
	let rand = Math.random() * total;
	let runningTotal = 0;

	for (let i = 0; i < species.length; i++) {
		let val = species[i].avg_abundance || species[i].rate || 0;
		if (val + runningTotal >= rand) {
			return i;
		}
		runningTotal += val;
	}
	return 0;
}

function startDive() {
	console.log("Starting dive at:", state.selectedLocation);

	d3.select("#dive-section").classed("hidden", false);
	
	const element = document.getElementById('dive-section');
	element.scrollIntoView({ behavior: 'smooth' });

	setupDiveVisualization();
	createBubbles();
}

function setupDiveVisualization() {
	const container = d3.select("#scroll-content");
	//clear container prev contents
	container.html("");

	// Clear any legacy sea floor from sticky container
	d3.select("#vis-sticky").selectAll(".sea-floor").remove();

	let locationData = state.locationDataState[state.locationDataState.map(d => d.lat + ',' + d.lon).indexOf(state.selectedLocation[0]+','+state.selectedLocation[1])];
	let fishColors = ["#d5cce9", "#9fcf7f", "#ffc265", "#ffafd1", "#68ba86"]
	let fishColorClasses = ["filter-d5cce9", "filter-9fcf7f", "filter-ffc265", "filter-ffafd1", "filter-68ba86"]

	// Match zones to layers by name to ensure correct order and mapping
	let validZones = [];
	state.layers.forEach(layer => {
		let zone = locationData.zones.find(z => layer.name.startsWith(z.layer));
		if (zone) {
			validZones.push({layer: layer, zone: zone});
		}
	});

	for (let i = 0; i < validZones.length; i++) {
		let layer = validZones[i].layer;
		let community = state.communityDataState[validZones[i].zone.community_id-1].data;

		const step = container.append("div")
			.attr("id", layer.name)
			.attr("class", "step")
			.attr("data-layer", layer.name);

		// Add waves to the first layer (surface)
		if (i === 0) {
			step.append("div")
				.attr("class", "wave-container")
				.html(`
					<svg class="waves" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 15 150 40" preserveAspectRatio="none" shape-rendering="auto">
						<defs><path id="gentle-wave" d="M-160 44c30 0 58-25 88-25s 58 25 88 25 58-25 88-25 58 25 88 25 v44h-352z" /></defs>
						<g class="wave-group">
							<use xlink:href="#gentle-wave" x="48" y="7" fill="#dcf4ff" />
						</g>
					</svg>`);
		}

		// Add sea floor to the last layer
		if (i === validZones.length - 1) {
			const seaFloor = step.append("div")
				.attr("class", "sea-floor")
				.html(`
					<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
						<defs>
							<linearGradient id="sand-gradient" x1="0" x2="0" y1="1" y2="0">
								<stop offset="0%" stop-color="#b3a270"/>
								<stop offset="100%" stop-color="#c2b280"/>
							</linearGradient>
						</defs>
						<path d="M0,60 Q16,50 33,60 T66,70 T100,60 V100 H0 Z" fill="url(#sand-gradient)" />
					</svg>
				`);

			// Add pebbles
			for (let k = 0; k < 20; k++) {
				let w = Math.random() * 30 + 60;
				let h = Math.random() * 15 + 30;
				let l = Math.random() * 100;
				let b = Math.random() * 40
				let borderRadius = `${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}% / ${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}%`;
				step.append("div")
					.attr("class", "pebble")
					.style("left", `calc(${l}% - ${w/2}px)`)
					.style("width", w + "px")
					.style("height", h + "px")
					.style("bottom", b + "px")
					.style("background-color", ["#615a5a", "#5a5353", "#706666", "#4a4545"][Math.floor(Math.random() * 4)])
					.style("border-radius", borderRadius);
			}
		}

		// Draw info box
		step.append("div")
			.attr("class", "step-content")
			.html(`
				<h2>${layer.name}</h2>
				<p>Depth: ${layer.depth}</p>
				<p>Common species at this depth include:</p>
				<ul>
					${[...Array(community.length).keys()].map(i => `<li style="--fish-color: ${fishColors[i]};">`+community[i].species+'</li>').join('')}
				</ul>
			`);

		// Draw background fish
		const svg = d3.create("svg")
			.attr("width", window.innerWidth)
			.attr("height", window.innerHeight)
			.attr("viewBox", [0, 0, window.innerWidth, window.innerHeight])
			.attr("style", "max-width: 100%; height: 100vh; position: absolute; top: 0; left: 0; z-index: -1;");

		// Get fish SVGs
		Promise.all([...Array(community.length).keys()].map(i => getFishSVG(community[i].species))).then(data => {
			// Draw fish SVGs
			const fishGroup = svg.append("g").attr("id", "fish").style("pointer-events", "auto");
			for (let j = 0; j < 100; j++) {
				let fishIndex = randomFish(community);
				let size = 80;

				if (data[fishIndex] != 'X') {
					let yPos, xPos;
					const benthicResidents = [
						'Chrysogorgia', 'Acanella', 'Thenea', 'Ophiomusa', 
						'Ophiocten', 'Solenosmilia', 'Anthomastus', 'Hyalonema',
						'Desmophyllum', 'Hemicorallium', 'Stichopathes', 'Retaria'
					];
					if (community[fishIndex].kingdom == 'Plantae' || benthicResidents.includes(community[fishIndex].species)) {
						size = 30 + randomInRange(0, 30);
						xPos = randomInRange(0, window.innerWidth - size);

						if (i == validZones.length - 1) {
							let xCenter = xPos + size / 2;
							let xPct = (xCenter / window.innerWidth) * 100;
							let yPct = getFloorYPercent(xPct);
							let sandHeight = (100 - yPct) * 2.5; // Scale factor assuming ~250px floor height
							yPos = window.innerHeight - size - sandHeight;
						} else {
							yPos = window.innerHeight - size;
						}
						yPos += randomInRange(0, 20); // Add some vertical randomness
					} else {
						xPos = randomInRange(0, window.innerWidth - size);
						yPos = randomInRange((i == 0 ? 100 : 0), window.innerHeight - size - (i == locationData.zones.length - 1 ? 100 : 0));
					}

					fishGroup.append("image")
						.attr("id", community[fishIndex].species)
						.attr("class", fishColorClasses[fishIndex])
						.attr("xlink:href", data[fishIndex])
						.attr("height", size)
						.attr("width", size)
						.attr("x", xPos)
						.attr("y", yPos);
				}
				else {
					fishGroup.append("circle")
						.attr("id", community[fishIndex].species)
						.attr("cx", randomInRange(size/4, window.innerWidth - size/4))
						.attr("cy", randomInRange(size/4, window.innerHeight - size/4))
						.attr("r", size/4)
						.attr("fill", fishColors[fishIndex]);
				}
			}
		})

		// Attach SVG to document
		document.getElementById(layer.name).append(svg.node())
	}

	// Intersection Observer for scrollytelling
	const observer = new IntersectionObserver((entries) => {
		entries.forEach(entry => {
			if (entry.isIntersecting) {
				const layerName = entry.target.getAttribute("data-layer");
				updateVisualization(layerName);
			}
		});
	}, {
		threshold: 0.5 // Trigger when 50% of the element is visible
	});

	document.querySelectorAll('.step').forEach(step => {
		observer.observe(step);
	});

	// Manually trigger update for the first layer to ensure correct initial state
	if (locationData && locationData.zones.length > 0) {
		updateVisualization(state.layers[0].name);
	}
}

function updateVisualization(layerName) {
	const layer = state.layers.find(l => l.name === layerName);
	const vis = d3.select("#vis-sticky");
	
	vis.transition().duration(1000)
		 .style("background-color", layer.color);
	
	// TODO: Render specific D3 charts for this layer here
}

function createBubbles() {
	const container = d3.select("#vis-sticky");
	container.selectAll(".bubble-container").remove();

	const bubbleContainer = container.append("div")
		.attr("class", "bubble-container");

	for (let i = 0; i < 100; i++) {
		let size = (Math.random() * 15 + 5) + "px";
		bubbleContainer.append("div")
			.attr("class", "bubble")
			.style("left", Math.random() * 100 + "%")
			.style("width", size)
			.style("height", size)
			.style("animation-duration", (Math.random() * 10 + 10) + "s")
			.style("animation-delay", (Math.random() * 10) + "s")
			.style("opacity", Math.random() * 0.5 + 0.4);
	}
}

function getFloorYPercent(t) {
	if (t < 33) {
		let local_t = t / 33;
		return 20 * local_t * local_t - 20 * local_t + 60;
	} else if (t < 66) {
		let local_t = (t - 33) / 33;
		return -10 * local_t * local_t + 20 * local_t + 60;
	} else {
		let local_t = (t - 66) / 34;
		return 70 - 10 * local_t * local_t;
	}
}
