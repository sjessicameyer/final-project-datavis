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

	let locationData = state.locationDataState[state.locationDataState.map(d => d.lat + ',' + d.lon).indexOf(state.selectedLocation[0]+','+state.selectedLocation[1])];
	let fishColors = ["#ffc265", "#ffafd1", "#68ba86", "#d5cce9", "#9fcf7f"]

	for (let i = 0; i < locationData.zones.length; i++) {
		let layer = state.layers[i];
		let community = state.communityDataState[locationData.zones[i].community_id-1].data;

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

		const fishGroup = svg.append("g").attr("id", "fish");
		for (let j = 0; j < 100; j++) {
			let fishIndex = randomFish(community);
			let size = 20;

			fishGroup.append("circle")
				.attr("id", community[fishIndex].species)
				.attr("cx", randomInRange(size, window.innerWidth-size))
				.attr("cy", randomInRange(size, window.innerHeight-size))
				.attr("r", size)
				.attr("fill", fishColors[fishIndex]);
		}

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
