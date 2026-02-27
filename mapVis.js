// SVG Constants
const height = window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight;
const width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
d3.json("land-50m.json").then(
	d => { console.log(d);

	buildvis(d);
	}

);

function buildvis(d) {
	console.log(d);

let land = topojson.feature(d, d.objects.land);


	// Add an SVG
const svg = d3.create("svg")
	.attr("height", height)
	.attr("width", width);



let projection = d3.geoMercator()
	.center([0, 5])
	.scale(150)
	.rotate([-180,0]);

var path = d3.geoPath().projection(projection);

var g = svg.append("g");

g.join('path')
    .data(land.features)
    .enter()
    .append("path")
      // draw each country
      .attr("d", d3.geoPath()
        .projection(projection)
      )
}

