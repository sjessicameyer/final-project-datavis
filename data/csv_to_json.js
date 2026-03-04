// Load location data into compact JSON (predicted_community_data.json)
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

// Load and normalize community abundance data (community_composition.csv)
async function loadCData() {
	return d3.csv("data/community_composition.csv").then(data => {
		// Grab IDs of all community groups
		let IDs = data.map(d => +d.community_id).filter(onlyUnique);
		
		// Create new JSON storing system
		let speciesJSON = [...Array(IDs.length).keys()].map(d => {
			return {'id': +d+1, 'data': []}
		});

		// Add data to JSON
		data.forEach(d => {
			speciesJSON[+d.community_id-1].data.push({"species": d.species, "rate": +d.avg_abundance})
		});

		// Normalize data in JSON to "N out of 1000"
		speciesJSON.forEach(d => {
			let sum = Math.round(d.data.map(s => s.rate).reduce((a,b)=>a+b)*1000)/1000;
			d.data.forEach(r => {
				r.rate = Math.round((r.rate/sum) * 1000);
				r.rate = r.rate == 0 ? 1 : r.rate;
			})
		})

		console.log(speciesJSON)
	});
}
