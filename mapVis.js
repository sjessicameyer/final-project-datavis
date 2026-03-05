// Global state
let state = {
	selectedLocation: null,
	locationDataState: null,
	communityDataState: null,
	maxCommunityId: 0,
	currentMapLayer: "Epipelagic Zone",
	layers: [
		{ name: "Epipelagic Zone", depth: "0-200m", color: "#66ccff" },
		{ name: "Mesopelagic Zone", depth: "200-1000m", color: "#3399cc" },
		{ name: "Bathypelagic Zone", depth: "1000-4000m", color: "#006699" },
		{ name: "Abyssopelagic Zone", depth: "4000m+", color: "#003366" }
	]
};

// SVG Constants
const width = d3.select("#map-container").node().clientWidth;
const height = d3.select("#map-container").node().clientHeight;

const projection = d3.geoEqualEarth().fitExtent(
	[
		[2, 2],
		[width - 2, height - 2]
	],
	{ type: "Sphere" }
).rotate([-180,0]);

// Load filtered location data
async function loadLocData() {
	// Pull filtered location data from filtered file
	return d3.json("data/predicted_community_data.json").then(data => {
		state.locationDataState = data;
		// Calculate max community ID for color scale
		data.forEach(d => {
			if (d.zones) {
				d.zones.forEach(z => {
					if (z.community_id > state.maxCommunityId) state.maxCommunityId = z.community_id;
				});
			}
		});
		return;
	});
};

// Load normalized community data
async function loadCommData() {
	// Pull filtered location data from filtered file
	return d3.json("data/community_composition.json").then(data => {
		state.communityDataState = data;
		return;
	});
};

// Initialize svg and map border
async function initMap() {
	// Pull topojson data from provided file
	return d3.json("data/countries-50m.json").then((world) => {
		const land = topojson.feature(world, world.objects.land);

		const path = d3.geoPath(projection);

		// Create SVG
		const svg = d3.create("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("viewBox", [0, 0, width, height])
			.attr("style", "max-width: 100%; height: auto;");

		document.getElementById("map-container").append(svg.node());

		// Create a group element for all map features to apply zoom transformations
		const mapGroup = svg.append("g");

		// Define zoom behavior
		const zoom = d3.zoom()
			.scaleExtent([1, 8]) // Allow zooming from 1x to 8x
			.on("zoom", (event) => {
				mapGroup.attr("transform", event.transform);
			});
		svg.call(zoom); // Apply zoom behavior to the SVG

		// Add Zoom Buttons
		const controls = d3.select("#map-container")
			.append("div")
			.attr("class", "zoom-controls");

		controls.append("button")
			.text("+")
			.on("click", (e) => {
				e.stopPropagation();
				svg.transition().call(zoom.scaleBy, 1.3);
			});

		controls.append("button")
			.text("−")
			.on("click", (e) => {
				e.stopPropagation();
				svg.transition().call(zoom.scaleBy, 1 / 1.3);
			});

		// Add Layer Controls
		const layerSelect = d3.select("#map-container")
			.append("select")
			.attr("class", "layer-selector")
			.on("change", (e) => {
				state.currentMapLayer = e.target.value;
				updateMapColors();
			});

		state.layers.forEach(layer => {
			layerSelect.append("option")
				.text(layer.name)
				.attr("value", layer.name)
				.property("selected", layer.name === state.currentMapLayer);
		});

		return { "svg": svg, "land": land, "path": path, "mapGroup": mapGroup };
	});
}

// Draw coordinates onto map
function drawCoordData(svgData) {
	svgData.mapGroup.append("defs").append("clipPath") // Append to mapGroup
		.attr("id", "globe-clip")
		.append("path")
		.datum({ type: "Sphere" })
		.attr("d", svgData.path);

	// project coordinates to flat screen pixels
	let projectedPoints = state.locationDataState.map(d => {
		let p = projection([d.lon, d.lat]);
		return p ? [p[0], p[1], d] : null; 
	}).filter(d => d !== null);

	// 2d mathematical net
	const delaunay = d3.Delaunay.from(projectedPoints, d => d[0], d => d[1]);

	// pixel boundaries of map
	const voronoi = delaunay.voronoi([0, 0, width, height]);

	// draw the Voronoi cells and apply the clip path
	svgData.mapGroup.append("g") // Append to mapGroup
		.attr("clip-path", "url(#globe-clip)") 
		.attr("fill", "transparent")
		.style("pointer-events", "all")
	.selectAll("path")
	.data(projectedPoints)
	.join("path")
		.attr("class", "voronoi-cell")
		.attr("d", (d, i) => voronoi.renderCell(i))
		.on("click", svgOnClick)
	.style("cursor", "crosshair");

	updateMapColors();
	drawLegend(svgData.svg);
}

function updateMapColors() {
	const layerIndex = state.layers.findIndex(l => l.name === state.currentMapLayer);
	const colorScale = d3.scaleSequential(t => d3.color(d3.interpolateTurbo(t)).darker(0.4))
		.domain([0, state.maxCommunityId || 20]);

	d3.selectAll(".voronoi-cell")
		.transition().duration(500)
		.attr("fill", d => {
			if (d[2].zones && d[2].zones[layerIndex]) {
				return colorScale(d[2].zones[layerIndex].community_id);
			}
			return "#ccc";
		});
}

function drawLegend(svg) {
	const legendWidth = 300;
	const legendHeight = 15;
	
	// Remove existing legend if any
	svg.select(".map-legend").remove();

	const legend = svg.append("g")
		.attr("class", "map-legend")
		.attr("transform", `translate(20, ${height - 50})`);

	// Legend Title
	legend.append("text")
		.attr("x", 0)
		.attr("y", -8)
		.style("font-size", "12px")
		.style("font-weight", "bold")
		.style("font-family", "sans-serif")
		.text("Ecological Community ID");

	// Create gradient
	let defs = svg.select("defs");
	if (defs.empty()) {
		defs = svg.append("defs");
	}
	const linearGradient = defs.append("linearGradient")
		.attr("id", "legend-gradient");

	linearGradient.selectAll("stop")
		.data(d3.range(0, 1.05, 0.05))
		.enter().append("stop")
		.attr("offset", d => d)
		.attr("stop-color", d => d3.color(d3.interpolateTurbo(d)).darker(0.4));

	// Draw the rectangle
	legend.append("rect")
		.attr("width", legendWidth)
		.attr("height", legendHeight)
		.style("fill", "url(#legend-gradient)");

	// Add axis
	const scale = d3.scaleLinear()
		.domain([0, state.maxCommunityId || 20])
		.range([0, legendWidth]);

	const axis = d3.axisBottom(scale)
		.ticks(5)
		.tickSize(5);

	legend.append("g")
		.attr("transform", `translate(0, ${legendHeight})`)
		.call(axis)
		.style("font-family", "sans-serif")
		.select(".domain").remove();
}

// Draw continents and border as unclickable masks
function drawContinentMasks(svgData) {
	// Draw continents
	svgData.mapGroup.append("g") // Append to mapGroup
		.selectAll("path")
		.data(svgData.land.features)
		.join("path")
		.attr("fill", "#d9d9d9")
		.attr("d", svgData.path)
		.style("cursor", "default");
	
	// Draw background
	svgData.mapGroup.append("path") // Append to mapGroup
		.datum({ type: "Sphere" })
		.attr("fill", "none")
		.attr("stroke", "currentColor")
		.attr("d", svgData.path)
		.style("cursor", "default");
}

// Handle onClick events
function svgOnClick(e) {
	let data = e.target.__data__[2];
	state.selectedLocation = [data.lat, data.lon];
	startDive();
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}
