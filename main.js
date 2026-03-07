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

	document.getElementById("process-btn").addEventListener("click", () => {
		document.getElementById("process-section").scrollIntoView({ behavior: "smooth" });
	});

	document.getElementById("video-btn").addEventListener("click", () => {
		document.getElementById("video-section").scrollIntoView({ behavior: "smooth" });
	});

	document.getElementById("help-btn").addEventListener("click", () => {
		document.getElementById("help-content").classList.toggle("hidden");
	});

	loadProcessBook();
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

	const benthicResidents = [
		'Chrysogorgia', 'Acanella', 'Thenea', 'Ophiomusa', 
		'Ophiocten', 'Solenosmilia', 'Anthomastus', 'Hyalonema',
		'Desmophyllum', 'Hemicorallium', 'Stichopathes', 'Retaria', 
		'Phellia', 'Abyssopathes', 'Bathygorgia', 'Docosaccus', 'Tunicate', 
		'Strongylocentrotus', 'Mesocentrotus', 'Peniagone', 'Enypniastes',
		'Swiftia', 'Acantholaimus', 'Nematocarcinus', 'Amphiophiura', 
		'Stephanoscyphistoma', 'Axinodon', 'Propeamussium', 'Thouarella', 'Madrepora oculata', 'Enallopsammia rostrata', 'Paramuricea', 'Axinodon bornianus', 'Propeamussium meridionale', 'Ophiosphalma armigerum', 'Benthodytes', 'Muriceides', 'Anthomastus', 'Hemicorallium', 'Chrysogorgia', 'Narella', 'Chonelasma'
	];

	const SeaFloorResidents = [
		'Amphiophiura',
		'Ophiocten',
		'Ophiomusa',
		'Ophiosphalma armigerum'
	]

	const fishFacingRight = [
		'Pseudanthias bartlettorum', 'Sprattus sprattus', 'Hippoglossoides platessoides', 'Clupea harengus', 'Phalacrocorax sulcirostris', 'Microcarbo melanoleucos', 'Chelonia mydas'
	];

	const fishFacingUp = [
		'Temora longicornis', 'Acartia', 'Centropages typicus'
	];

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
		let hasBenthic = community.some(c => benthicResidents.some(r => c.species.includes(r)));

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

		// Add shelf to any Zone if it's not the last layer and has benthic species
		if (i !== validZones.length - 1 && hasBenthic) {
			step.append("div")
				.attr("class", "sea-floor")
				.style("height", "200px")
				.style("position", "absolute")
				.style("bottom", "0")
				.style("width", "100%")
				.html(`
					<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
						<defs>
							<linearGradient id="shelf-gradient" x1="0" x2="0" y1="1" y2="0">
								<stop offset="0%" stop-color="#3b3b3b" stop-opacity="0"/>
								<stop offset="100%" stop-color="#595959"/>
							</linearGradient>
						</defs>
						<path d="M0,40 Q50,20 100,40 V100 H0 Z" fill="url(#shelf-gradient)" />
					</svg>
				`);
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
			const pebbles = seaFloor.append("g").attr("id", "pebbles");
			for (let k = 0; k < 20; k++) {
				let w = Math.random() * 30 + 60;
				let h = Math.random() * 15 + 30;
				let l = Math.random() * 100;
				let b = Math.random() * 40
				let borderRadius = `${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}% / ${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}% ${randomInRange(40,60)}%`;
				pebbles.append("div")
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
		getCommonNames(community).then(nameData => {
			step.append("div")
				.attr("class", "step-content")
				.html(`
					<h2>${layer.name}</h2>
					<p>Depth: ${layer.depth}</p>
					<p>Common species at this depth include:</p>
					<ul>
						${[...Array(community.length).keys()].map(i => `<li style="--fish-color: ${fishColors[i]};">${nameData[i]} (<i>${community[i].species}</i>)</li>`).join('')}
					</ul>
				`);
		});

		// Draw background fish
		const svg = d3.create("svg")
			.attr("width", window.innerWidth)
			.attr("height", window.innerHeight)
			.attr("viewBox", [0, 0, window.innerWidth, window.innerHeight])
			.attr("style", "max-width: 100%; height: 100vh; position: absolute; top: 0; left: 0; z-index: -1;");

		// Get fish SVGs
		getClassificationInformation(community).then(taxonomyData => {
			Promise.all([...Array(community.length).keys()].map(i => getFishSVG(community[i].species, taxonomyData[i]))).then(data => {
				// Draw fish SVGs
				const fishGroup = svg.append("g").attr("id", "fish").style("pointer-events", "auto");
				let totalFish = Math.max(100, community.length);
				for (let j = 0; j < totalFish; j++) {
					let fishIndex;
					if (j < community.length) {
						fishIndex = j;
					} else {
						fishIndex = randomFish(community);
					}
					
					let taxonomy = taxonomyData[fishIndex];
					let size = getFishSize(taxonomy, community[fishIndex].species);

					if (data[fishIndex] != 'X') {
						let yPos, xPos;
						let isBenthic = benthicResidents.some(r => community[fishIndex].species.includes(r));
						let isSeaBed = SeaFloorResidents.some(r => community[fishIndex].species.includes(r));
						if (isBenthic) {
							xPos = randomInRange(0, window.innerWidth - size);

							if (i == validZones.length - 1) {
								let xCenter = xPos + size / 2;
								let xPct = (xCenter / window.innerWidth) * 100;
								let yPct = getFloorYPercent(xPct);
								let sandHeight = (100 - yPct) * 2.5; // Scale factor assuming ~250px floor height
								yPos = window.innerHeight - size - (sandHeight * (isSeaBed ? 0.4 : 1));
							} else if (i !== validZones.length - 1 && hasBenthic) {
								let xCenter = xPos + size / 2;
								let t = xCenter / window.innerWidth;
								// Bezier curve for shelf: M0,40 Q50,20 100,40 -> P0=40, P1=20, P2=40
								let y_svg = 40 * Math.pow(1-t, 2) + 20 * 2 * (1-t) * t + 40 * Math.pow(t, 2);
								let groundHeightPx = 200 * (1 - y_svg / 100);
								yPos = window.innerHeight - size - (groundHeightPx * (isSeaBed ? 0.6 : 1));
							} else {
								yPos = window.innerHeight - size;
							}
							yPos += randomInRange(0, 20); // Add some vertical randomness
						} else {
							xPos = randomInRange(0, window.innerWidth - size);
							yPos = randomInRange((i == 0 ? 100 : 0), window.innerHeight - size - (i == locationData.zones.length - 1 ? 100 : 0) - ((i != locationData.zones.length - 1 && hasBenthic) ? 150 : 0));
						}

						let fish = fishGroup.append("image")
							.attr("id", community[fishIndex].species)
							.attr("class", fishColorClasses[fishIndex])
							.attr("xlink:href", data[fishIndex])
							.attr("height", size)
							.attr("width", size)
							.attr("x", xPos)
							.attr("y", yPos);

						if (!isBenthic || isSeaBed) {
							fish.style("transform-box", "fill-box")
								.style("transform-origin", "center");
							animateFish(fish, fishFacingRight, fishFacingUp);
						}
					}
				}
			});
		});

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

function loadProcessBook() {
	d3.text("process_book.md").then(text => {
		document.querySelector("#process-section .content-wrapper").innerHTML = marked.parse(text);
	}).catch(e => console.warn("Process book markdown file not found."));
}
