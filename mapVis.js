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
).rotate([-180,0]);

function checkUnique(coord, index, array) {
  return index === array.findIndex((d) => (d.lat === coord.lat && d.lon === coord.lon));
}

// Load unfiltered data
async function loadUFLocData() {
	// Pull unfiltered location data from unfiltered file
  	return d3.csv("data/predicted_communities.csv").then(data => {
		console.log("Data loaded");
		return data.map(d => {return {'lat': +d.lat_bin, 'lon': +d.lon_bin}});
	});
}

// Load filtered data
async function loadFLocData() {
	// Pull filtered location data from filtered file
	return d3.json("data/predicted_community_data.json").then(data => {
		console.log("Filtered data loaded and parsed.");
		return data;
	});

};

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
    // clip shaped as globe
    svgData.svg.append("defs").append("clipPath")
        .attr("id", "globe-clip")
        .append("path")
        .datum({ type: "Sphere" })
        .attr("d", svgData.path);

    // project coordinates to flat screen pixels
    let projectedPoints = locData.map(d => {
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
        .attr("stroke", "#cccccc")
        .attr("stroke-width", 0.5)
        .style("pointer-events", "all")
    .selectAll("path")
    .data(projectedPoints)
    .join("path")
        .attr("d", (d, i) => voronoi.renderCell(i))
        .on("click", (event, d) => {
            let originalData = d[2];
            console.log("Voronoi cell clicked:", originalData);
        });
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

// Load data into compact JSON (predicted_community_data.json)
async function loadUData() {
	return d3.csv("data/predicted_communities.csv").then(data => {
		// Turn CSV into lat/lon JSON
		let lat_lon = data.map(d => {return {'lat': +d.lat_bin, 'lon': +d.lon_bin}});

		// Filter JSON array for only unique values
		let uniqueData = lat_lon.map(d => d.lat + ',' + d.lon).filter(onlyUnique);

		// Create new JSON storing system
		let uniqueJSON = [...Array(uniqueData.length).keys()].map(d => {
			let _d = uniqueData[d].split(','); return {'lat': +_d[0], 'lon': +_d[1], 'zones': []}
		});

		// Combine data into new JSON storing system
		data.forEach(d => {
			let index = uniqueData.indexOf(d.lat_bin+','+d.lon_bin);
			uniqueJSON[index].zones.push({'layer': d.depth_layer.split(' ')[0], 'community_id': +d.predicted_community_id});
		});

		console.log(uniqueJSON)
	});
}

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

Promise.all([initMap(), loadFLocData()]).then(data => {
	drawCoordData(data[0], data[1]);
	drawContinentMasks(data[0]);
})