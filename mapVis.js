// Global state
let state = {
	selectedLocation: null,
	locationDataState: null,
	communityDataState: null,
	layers: [
		{ name: "Epipelagic Zone", depth: "0-200m", color: "#66ccff" },
		{ name: "Mesopelagic Zone", depth: "200-1000m", color: "#3399cc" },
		{ name: "Bathypelagic Zone", depth: "1000-4000m", color: "#006699" },
		{ name: "Abyssopelagic Zone", depth: "4000m+", color: "#003366" }
	]
};

// SVG Constants
const width = d3.select("#map-container").node().clientWidth;
const height = width / 2;

const projection = d3.geoEqualEarth().fitExtent(
	[
		[2, 2],
		[width - 2, height]
	],
	{ type: "Sphere" }
).rotate([-180,0]);

// Load filtered location data
async function loadLocData() {
	// Pull filtered location data from filtered file
	return d3.json("data/predicted_community_data.json").then(data => {
		state.locationDataState = data;
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

		return { "svg": svg, "land": land, "path": path };
	});
}

// Draw coordinates onto map
function drawCoordData(svgData) {
	// clip shaped as globe
	svgData.svg.append("defs").append("clipPath")
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
	svgData.svg.append("g")
		.attr("clip-path", "url(#globe-clip)") 
		.attr("fill", "transparent")
		.style("pointer-events", "all")
	.selectAll("path")
	.data(projectedPoints)
	.join("path")
		.attr("d", (d, i) => voronoi.renderCell(i))
		.on("click", svgOnClick)
	.style("cursor", "crosshair");
}

// Draw continents and border as unclickable masks
function drawContinentMasks(svgData) {
	// Draw continents
	svgData.svg.append("g")
		.selectAll("path")
		.data(svgData.land.features)
		.join("path")
		.attr("fill", "#d9d9d9")
		.attr("d", svgData.path)
		.style("cursor", "default");

	// Draw background
	svgData.svg.append("path")
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
	console.log(data);
	startDive();
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}
