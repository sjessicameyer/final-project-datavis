const points = [
	{ name: "New York", lat: 40.7128, lon: -74.006 },
	{ name: "London", lat: 51.5074, lon: -0.1278 },
	{ name: "São Paulo", lat: -23.5505, lon: -46.6333 },
	{ name: "Cairo", lat: 30.0444, lon: 31.2357 },
	{ name: "Nairobi", lat: -1.2921, lon: 36.8219 },
	{ name: "Mumbai", lat: 19.076, lon: 72.8777 },
	{ name: "Tokyo", lat: 35.6762, lon: 139.6503 },
	{ name: "Sydney", lat: -33.8688, lon: 151.2093 }
];

d3.json("./countries-50m.json").then((world) => {
	const countries = topojson.feature(world, world.objects.countries);
	const countrymesh = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

	const width = 928;
	const marginTop = 46;
	const height = width / 2 + marginTop;

	const projection = d3.geoEqualEarth().fitExtent(
		[
			[2, marginTop + 2],
			[width - 2, height]
		],
		{ type: "Sphere" }
	);
	const path = d3.geoPath(projection);

	const svg = d3
		.create("svg")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox", [0, 0, width, height])
		.attr("style", "max-width: 100%; height: auto;");

	svg
		.append("path")
		.datum({ type: "Sphere" })
		.attr("fill", "white")
		.attr("stroke", "currentColor")
		.attr("d", path);

	svg
		.append("g")
		.selectAll("path")
		.data(countries.features)
		.join("path")
		.attr("fill", "#d9d9d9")
		.attr("d", path)
		.append("title")
		.text((d) => d.properties?.name || String(d.id));

	svg
		.append("path")
		.datum(countrymesh)
		.attr("fill", "none")
		.attr("stroke", "white")
		.attr("d", path);

	svg
		.append("g")
		.selectAll("circle")
		.data(points)
		.join("circle")
		.attr("cx", (d) => projection([d.lon, d.lat])[0])
		.attr("cy", (d) => projection([d.lon, d.lat])[1])
		.attr("r", 4)
		.attr("fill", "#d7301f")
		.attr("stroke", "white")
		.attr("stroke-width", 1)
		.append("title")
		.text((d) => `${d.name}\n${d.lat}, ${d.lon}`);

	document.getElementById("chart").append(svg.node());
});
