// SVG Constants
const width = 928;
const marginTop = 46;
const height = width / 2 + marginTop;

const projection = d3.geoEqualEarth().fitExtent(
	[
		[2, marginTop + 2],
		[width - 2, height]
	],
	{ type: "Sphere" }
)
.rotate([-180,0]);

function checkUnique(coord, index, array) {
  return index === array.findIndex((d) => (d.lat === coord.lat && d.lon === coord.lon));
}

async function loadLocData() {
	// Pull filtered location data from filtered file
  return d3.csv("data/uniqueCoordinates.csv").then(data => {
		console.log("Data loaded");
		return data.map(d => {return {'lat': +d.lat, 'lon': +d.lon}});;
	});
}

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

		// Draw background
		svg.append("path")
			.datum({ type: "Sphere" })
			.attr("fill", "white")
			.attr("stroke", "currentColor")
			.attr("d", path);

		document.getElementById("chart").append(svg.node());

		return { "svg": svg, "land": land, "path": path };
	});
}

function drawCoordData(svgData, locData) {
	svgData.svg.append("g")
		.attr("fill", "none")
		.attr("stroke", "red")
		.attr("pointer-events", "all")
	.selectAll("path")
	.data(d3.geoVoronoi().polygons(locData.map(d => [d.lon, d.lat])).features)
	.join("path")
		.attr("d", svgData.path)
		.on("click", svgOnClick);
}

function drawContinentMasks(svgData) {
	// Draw continents
	svgData.svg.append("g")
		.selectAll("path")
		.data(svgData.land.features)
		.join("path")
		.attr("fill", "#d9d9d9")
		.attr("d", svgData.path);
}

function svgOnClick(e) {
	let coords = e.target.__data__.properties.site;
	console.log(coords);
}

async function loadUData() {
	return d3.csv("data/predicted_communities.csv").then(data => {
		// Turn CSV into lat/lon JSON
		lon_lat = data.map(d => {return {'lat': +d.lat_bin, 'lon': +d.lon_bin}});

		// Filter JSON array for only unique values
		let uniqueData = lon_lat.filter(onlyUnique);

		// Create new JSON storing system
		let uniqueJSON = [...Array(uniqueData.length).map((d,i) => {return {'lat': uniqueData[i].lat, 'lon': uniqueData[i].lon, 'zones': []}})];

		data.forEach(d => {
			
		});

	});
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

Promise.all([initMap(), loadLocData()]).then(data => {
	drawCoordData(data[0], data[1]);
	drawContinentMasks(data[0]);
})