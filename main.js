// Initialize map and pull data
document.addEventListener("DOMContentLoaded", () => {
	Promise.all([initMap(), loadLocData(), loadCommData()]).then(data => {
		svgData = data[0];
		drawCoordData(svgData);
		drawContinentMasks(svgData);
	});
});

function startDive() {
	console.log("Starting dive at:", state.selectedLocation);

	d3.select("#dive-section").classed("hidden", false);
	
	const element = document.getElementById('dive-section');
	element.scrollIntoView({ behavior: 'smooth' });

	setupDiveVisualization();
}

function setupDiveVisualization() {
	const container = d3.select("#scroll-content");
	//clear container prev contents
	container.html("");
	
	state.layers.forEach(layer => {
		const step = container.append("div")
			.attr("class", "step")
			.attr("data-layer", layer.name);
			
		step.append("div")
			.attr("class", "step-content")
			.html(`
				<h2>${layer.name}</h2>
				<p>Depth: ${layer.depth}</p>
				<p>Diversity data visualization goes here.</p>
			`);
	});

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
}

function updateVisualization(layerName) {
	const layer = state.layers.find(l => l.name === layerName);
	const vis = d3.select("#vis-sticky");
	
	vis.transition().duration(1000)
		 .style("background-color", layer.color);
		 
	vis.text(`Visualizing: ${layer.name} (${state.selectedLocation})`);
	
	// TODO: Render specific D3 charts for this layer here
}
